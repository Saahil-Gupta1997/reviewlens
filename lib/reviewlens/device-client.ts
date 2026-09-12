import type { Review } from './types';
export type DeviceProgress = { message: string; indexed?: number };
export type DeviceHit = { reviewId: string; quote: string; score: number };
export class DeviceSearch {
  private worker: Worker | null = null;
  private reject: ((reason: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  cancel() {
    this.worker?.terminate(); this.worker = null;
    if (this.timer) clearTimeout(this.timer);
    this.reject?.(new DOMException('Operation paused. Saved reviews can resume.', 'AbortError'));
    this.reject = null;
  }
  async run(action: 'status' | 'index' | 'search' | 'clear', dataset: string, reviews: Review[],
    progress: (value: DeviceProgress) => void = () => {}, question = '', allowedIds: string[] = []): Promise<{ indexed: number; hits: DeviceHit[] }> {
    if (this.reject) throw Error('Another on-device operation is running. Pause it first.');
    if (typeof Worker === 'undefined' || typeof indexedDB === 'undefined' || !globalThis.crypto?.subtle)
      throw Error('This browser cannot run on-device search. Use Basic analysis or a browser with WebAssembly and site storage.');
    this.worker ||= new Worker('/semantic-worker.js', { type: 'module' });
    const worker = this.worker, id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.reject = reject;
      const resetTimeout = () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.reject = null; reject(Error('Model loading or indexing timed out. Retry to resume, or choose Basic analysis.')); this.cancel();
        }, 180000);
      };
      resetTimeout();
      worker.onmessage = ({ data }) => {
        if (data.id !== id) return;
        if (data.progress) { resetTimeout(); progress(data); return; }
        if (this.timer) clearTimeout(this.timer); this.reject = null;
        if (data.error) reject(Error(data.error)); else resolve(data.result);
      };
      // A worker `error` event is usually a script that failed to parse or load, not a
      // network problem. Do not guess: report that it could not start and carry the real
      // message. See docs/delivery/postmortem-device-model-load.md.
      worker.onerror = (event: ErrorEvent) => {
        const detail = event?.message || 'the on-device worker failed to start';
        console.error('ReviewLens on-device worker error:', detail, event);
        this.reject = null;
        reject(Error('The on-device worker could not start. Basic analysis remains available. Technical detail: ' + detail));
        this.cancel();
      };
      worker.postMessage({ id, action, dataset, reviews: reviews.map(({ id, text }) => ({ id, text })), question, allowedIds });
    });
  }
}

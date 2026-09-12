import { createHash } from 'node:crypto';

// Saved hit lookup time is never inference time. Timings must be explicitly paired
// with those exact hit bytes and cover every scored case, or remain unmeasured.
export function capturedTiming(metadata, hitBytes, caseIds) {
  if (!metadata) return { values: null, source: 'Not measured: no paired browser timing metadata supplied.' };
  if (metadata.hits_sha256 !== createHash('sha256').update(hitBytes).digest('hex')) {
    throw Error('Timing metadata does not match the captured hits SHA-256.');
  }
  if (!metadata.captured_at || !Number.isFinite(Date.parse(metadata.captured_at)) ||
      !(metadata.browser || metadata.user_agent) || !metadata.measurement) {
    throw Error('Timing metadata requires captured_at, browser/user_agent, and measurement scope.');
  }
  for (const id of caseIds) {
    const ms = metadata.search_latency_ms?.[id];
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
      throw Error(`Missing or invalid browser timing for ${id}.`);
    }
  }
  return { values: metadata.search_latency_ms,
    source: `${metadata.measurement} Captured ${metadata.captured_at}; ${metadata.browser || metadata.user_agent}. One sample per case; not a load-test percentile.` };
}

export function latencySummary(values) {
  if (!values.length || values.some(v => v === null || !Number.isFinite(v))) {
    return { p50_latency_ms: null, p95_latency_ms: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return { p50_latency_ms: percentile(0.5), p95_latency_ms: percentile(0.95) };
}

export function latencyGate(actual, max) {
  return { gate: 'p95_latency_ms', actual, bound: max, direction: '<=',
    pass: actual !== null && Number.isFinite(actual) && actual <= max,
    status: actual === null ? 'NOT_MEASURED' : actual <= max ? 'PASS' : 'FAIL' };
}

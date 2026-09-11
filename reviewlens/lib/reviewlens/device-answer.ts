import type { Answer, Review } from './types';
import { filterReviews } from './intelligence';
import type { DeviceHit } from './device-client';
export function needsDeviceEvidence(a: Answer) {
  return a.intent === 'Review evidence' && a.status !== 'clarify' && a.status !== 'unsupported' && a.count > 0;
}
// The server never accepts generated claims from the browser. It rechecks scope,
// then builds an extractive response only from exact quotations in owned reviews.
export function deviceAnswer(base: Answer, reviews: Review[], candidates: unknown): Answer {
  if (!needsDeviceEvidence(base)) return base;
  if (!Array.isArray(candidates)) throw Error('Prepare on-device search and retry.');
  const scoped = filterReviews(reviews, base.filters), seen = new Set<string>();
  const valid = candidates.slice(0,5).filter((h: DeviceHit) => {
    const r = scoped.find(r => r.id === h?.reviewId);
    if (!r || seen.has(r.id) || typeof h.quote !== 'string' || !h.quote.trim() || h.quote.length > 700 || !r.text.includes(h.quote)) return false;
    seen.add(r.id); return true;
  }) as DeviceHit[];
  return { ...base, intent: 'On-device semantic evidence', status: 'limited',
    model: 'MiniLM-L6-v2 · on-device retrieval',
    summary: valid.length ? `Found ${valid.length} potentially relevant passages in ${scoped.length} scoped reviews. Read the sources to judge relevance.` :
      'No passages met the on-device similarity threshold. Try different wording or Basic analysis; this is not proof that no evidence exists.',
    findings: valid.map(h => ({ text: '“' + h.quote + '”', reviewIds: [h.reviewId] })),
    citations: scoped.filter(r => seen.has(r.id)),
    notes: ['Embeddings and similarity ranking ran on this device. No generative model wrote this answer.',
      'Source text and scope were checked on the server. Similarity is not a confidence score; relevance is not independently verified.',
      'This is a retrieved sample, not a measure of prevalence. Counts and rankings use the separate evidence engine.'] };
}

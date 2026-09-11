// Shared by the browser worker and Node tests. No network or model dependency.
export const MODEL = 'Xenova/all-MiniLM-L6-v2';
export const REVISION = '751bff3';
export const INDEX_VERSION = `${MODEL}@${REVISION}:q8:mean-normalized:chunks-v1`;
export const DIMENSIONS = 384;
export function chunks(text) {
  const result = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 700, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > start + 350) end = space;
    }
    result.push({ start, end, text: text.slice(start, end) });
    if (end === text.length) break;
    start = Math.max(start + 1, end - 100);
  }
  return result;
}
export function validVector(vector) {
  return Array.isArray(vector) && vector.length === DIMENSIONS &&
    vector.every(x => typeof x === 'number' && Number.isFinite(x)) && vector.some(x => x !== 0);
}
export function cosine(a, b) {
  if (!validVector(a) || !validVector(b)) throw Error('Invalid local embedding. Rebuild the device index.');
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < DIMENSIONS; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / Math.sqrt(na * nb);
}
export function rank(query, records, allowedIds, limit = 5, threshold = 0.3) {
  const allowed = new Set(allowedIds), best = new Map();
  for (const record of records) {
    if (!allowed.has(record.id)) continue;
    for (const passage of record.passages) {
      const score = cosine(query, passage.vector);
      if (score >= threshold && (!best.has(record.id) || best.get(record.id).score < score))
        best.set(record.id, { reviewId: record.id, quote: passage.text, score });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.reviewId.localeCompare(b.reviewId)).slice(0, limit);
}

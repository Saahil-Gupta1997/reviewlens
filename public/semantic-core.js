// Shared by the browser worker and Node tests. No network or model dependency.
export const MODEL = "Xenova/all-MiniLM-L6-v2";
export const REVISION = "751bff3";
export const INDEX_VERSION = `${MODEL}@${REVISION}:q8:mean-normalized:chunks-v1`;
export const DIMENSIONS = 384;
export function chunks(text) {
  const result = [];
  for (let start = 0; start < text.length; ) {
    let end = Math.min(start + 700, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > start + 350) end = space;
    }
    result.push({ start, end, text: text.slice(start, end) });
    if (end === text.length) break;
    start = Math.max(start + 1, end - 100);
  }
  return result;
}
export function validVector(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === DIMENSIONS &&
    vector.every((x) => typeof x === "number" && Number.isFinite(x)) &&
    vector.some((x) => x !== 0)
  );
}
export function cosine(a, b) {
  if (!validVector(a) || !validVector(b))
    throw Error("Invalid local embedding. Rebuild the device index.");
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < DIMENSIONS; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / Math.sqrt(na * nb);
}
export function rank(query, records, allowedIds, limit = 5, threshold = 0.3) {
  const allowed = new Set(allowedIds),
    best = new Map();
  for (const record of records) {
    if (!allowed.has(record.id)) continue;
    for (const passage of record.passages) {
      const score = cosine(query, passage.vector);
      if (
        score >= threshold &&
        (!best.has(record.id) || best.get(record.id).score < score)
      )
        best.set(record.id, {
          reviewId: record.id,
          quote: passage.text,
          score,
        });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.reviewId.localeCompare(b.reviewId))
    .slice(0, limit);
}

// Failure diagnosis must never be guessed.
//
// This function exists because the previous handler mapped ANY unrecognised error to
// "check your connection and allow downloads from Hugging Face and jsDelivr". A module
// resolution SyntaxError matched none of its patterns, so a code defect was reported to
// users - and believed by this project - as a network problem for three weeks, and every
// document recorded the wrong cause. See docs/delivery/postmortem-device-model-load.md.
//
// The rule: explain only what is actually recognised. Anything else reports that it could
// not load and carries the real message, so a defect surfaces instead of hiding behind a
// plausible story.
export const KNOWN_CONDITION = /storage|index|embedding|Close other/;
export const NETWORK_CONDITION =
  /network|fetch|NetworkError|Load failed|net::|ERR_NETWORK|offline/i;
export function describeFailure(message) {
  const detail =
    String(message ?? "").trim() || "no error message was provided";
  if (KNOWN_CONDITION.test(detail))
    return { cause: "known", detail, message: detail };
  if (NETWORK_CONDITION.test(detail))
    return {
      cause: "network",
      detail,
      message:
        "The model could not be downloaded. Check your connection and allow downloads from Hugging Face and jsDelivr. Your saved reviews are safe; Basic analysis remains available.",
    };
  return {
    cause: "unknown",
    detail,
    message:
      "The on-device model could not load. Basic analysis remains available and your saved reviews are safe. Technical detail: " +
      detail,
  };
}

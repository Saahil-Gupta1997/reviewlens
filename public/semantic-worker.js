import {
  MODEL,
  REVISION,
  INDEX_VERSION,
  chunks,
  validVector,
  rank,
  describeFailure,
} from "./semantic-core.js";

let extractor, databasePromise;
function database() {
  return (databasePromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open("reviewlens-device-v1", 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore("reviews", { keyPath: "key" });
      store.createIndex("dataset", "dataset");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      databasePromise = null;
      reject(
        Error(
          "Browser storage is unavailable. Allow site storage or use Basic analysis.",
        ),
      );
    };
    req.onblocked = () => {
      databasePromise = null;
      reject(Error("Close other ReviewLens tabs and retry."));
    };
  }));
}
async function recordsFor(dataset) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("reviews")
      .objectStore("reviews")
      .index("dataset")
      .getAll(dataset);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function write(record) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readwrite");
    tx.objectStore("reviews").put(record);
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () =>
      reject(
        Error(
          "Device storage is full or unavailable. Clear a local index or use Basic analysis.",
        ),
      );
  });
}
async function clear(dataset) {
  const records = await recordsFor(dataset),
    db = await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("reviews", "readwrite");
    for (const r of records) tx.objectStore("reviews").delete(r.key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
async function fingerprint(text) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(INDEX_VERSION + "\n" + text),
  );
  return [...new Uint8Array(hash)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function existing(dataset, reviews) {
  const stored = new Map((await recordsFor(dataset)).map((r) => [r.id, r]));
  const valid = [];
  for (const r of reviews) {
    const item = stored.get(r.id);
    if (
      item?.fingerprint === (await fingerprint(r.text)) &&
      item.passages?.length &&
      item.passages.every(
        (p) => validVector(p.vector) && r.text.slice(p.start, p.end) === p.text,
      )
    )
      valid.push(item);
  }
  return valid;
}
async function model(progress) {
  if (!extractor) {
    progress(
      "Downloading the on-device model. First use needs an internet connection.",
    );
    // Pinned, self-contained browser ESM bundle. No review or question is placed in an
    // external URL.
    //
    // Must be dist/transformers.min.js, NOT dist/transformers.web.js. The package declares
    // transformers.web.js as its default browser export, but that build ships unresolved
    // bare specifiers ("onnxruntime-common") that a browser cannot resolve without an
    // import map, so importing it throws before any model request is made.
    // See docs/delivery/postmortem-device-model-load.md.
    const { pipeline, env } = await import(
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
    );
    env.allowLocalModels = false;
    env.backends.onnx.wasm.numThreads = 1; // Works without SharedArrayBuffer/cross-origin isolation.
    env.backends.onnx.wasm.proxy = false;
    extractor = await pipeline("feature-extraction", MODEL, {
      revision: REVISION,
      dtype: "q8",
      device: "wasm",
      progress_callback: (p) => {
        if (p.status === "progress")
          progress(`Downloading ${p.file}: ${Math.round(p.progress || 0)}%`);
        else if (p.status === "ready") progress("Model ready on this device.");
      },
    });
  }
  return extractor;
}
self.onmessage = async ({ data }) => {
  const { id, action, dataset, reviews = [], allowedIds = [], question } = data;
  const progress = (message, indexed) =>
    self.postMessage({ id, progress: true, message, indexed });
  try {
    if (action === "clear") {
      await clear(dataset);
      self.postMessage({ id, result: { indexed: 0 } });
      return;
    }
    const saved = await existing(dataset, reviews);
    if (action === "status") {
      self.postMessage({ id, result: { indexed: saved.length } });
      return;
    }
    if (action === "index") {
      const done = new Set(saved.map((x) => x.id));
      let count = done.size;
      progress("Checking saved progress…", count);
      if (count < reviews.length) {
        const pipe = await model(progress);
        for (const review of reviews) {
          if (done.has(review.id)) continue;
          const passages = chunks(review.text);
          // Small batches cap memory. Each complete review is saved before progress advances.
          for (const passage of passages) {
            const output = await pipe(passage.text, {
              pooling: "mean",
              normalize: true,
            });
            passage.vector = Array.from(output.data);
            if (!validVector(passage.vector))
              throw Error(
                "Model returned an invalid embedding. Try rebuilding.",
              );
          }
          await write({
            key: dataset + ":" + review.id,
            dataset,
            id: review.id,
            fingerprint: await fingerprint(review.text),
            passages,
          });
          progress(
            `Indexed ${++count} of ${reviews.length} reviews on this device.`,
            count,
          );
        }
      }
      self.postMessage({ id, result: { indexed: count } });
      return;
    }
    if (action === "search") {
      if (saved.length !== reviews.length)
        throw Error("Build or resume the on-device index in Settings first.");
      const pipe = await model(progress);
      const output = await pipe(question, { pooling: "mean", normalize: true });
      self.postMessage({
        id,
        result: { hits: rank(Array.from(output.data), saved, allowedIds) },
      });
      return;
    }
    throw Error("Unknown device operation.");
  } catch (error) {
    // Always log the real error. The previous handler discarded it in favour of a guessed
    // cause, which is how a broken import was misdiagnosed as a network problem for weeks.
    const raw = error?.message || String(error);
    console.error("ReviewLens on-device failure:", raw, error);
    const { cause, message, detail } = describeFailure(raw);
    self.postMessage({
      id,
      error: "On-device search could not finish. " + message,
      cause,
      detail,
    });
  }
};

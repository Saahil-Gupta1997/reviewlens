# Dependencies, models and attribution

- Product scope, UAT and portfolio direction: Saahil Gupta. Implementation and documentation were developed with Codex assistance, building on a supplied ReviewLens prototype and a Sites/Vinext starter. Do not claim this was entirely hand-coded or independently audited.
- Frontend/server dependencies and their exact resolved versions are in package-lock.json. Their upstream licenses remain applicable. Vendored CSS notices are retained in vendor/.
- Transformers.js 3.8.1: Apache-2.0, loaded from the versioned jsDelivr browser distribution. https://github.com/huggingface/transformers.js
- Xenova/all-MiniLM-L6-v2: Apache-2.0, ONNX conversion of sentence-transformers/all-MiniLM-L6-v2. Pinned model revision 751bff3, q8 weights, 384-dimensional mean-pooled normalized embeddings. https://huggingface.co/Xenova/all-MiniLM-L6-v2
- ONNX Runtime runs WebAssembly inference through Transformers.js; its upstream notices and license apply. https://github.com/microsoft/onnxruntime
- Model/runtime binaries are downloaded by the browser, not redistributed in this source package. They are version-pinned but this release does not add independent binary integrity verification.
- Test fixtures in examples/validation are fictional; they contain no customer data.

No blanket license grant is asserted for the original uploaded prototype. The private source archive is omitted from the portfolio export. Choose a project-wide license only after confirming ownership and upstream obligations.

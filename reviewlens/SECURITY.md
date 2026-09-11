# Security and privacy

Do not post keys, private reviews, database exports or authentication headers in public issues. For a sensitive finding, use the repository's private vulnerability reporting if enabled; otherwise contact the owner through their profile before sharing details.

Production relies on a trusted hosting gateway supplying identity headers. Do not expose the API directly behind a proxy that accepts forged identity headers. Every dataset operation checks ownership. The loopback demo injects a single local identity and must never be deployed or exposed to a network.

Uploaded reviews and saved answers are stored on the server. On-device search additionally caches review passages and vectors in browser IndexedDB. Model/runtime files download from Hugging Face/jsDelivr. On-device inference does not send review text to these providers. Public model downloads still expose ordinary network metadata to the asset hosts.

On-device result quotations are revalidated on the server, but the server cannot independently verify the browser's similarity computation. Treat results as candidate evidence. This is not an adversarial audit system.

OpenAI is opt-in and separately billed. Keys are encrypted using the runtime encryption secret. Never change that secret without migrating stored keys. Failed attempts count against the daily request cap. Do not commit local state, provider keys, logs, or data exports.

Deleting a dataset removes server data and attempts to clear its index in the current browser. Copies cached on other devices must be cleared there. Browser data eviction can remove indexes; rebuilding is safe. No backup-restore user interface is provided.

const crypto = require('node:crypto')

// crypto.hash was added after the oldest Node 20 versions. Vite 7 uses it
// during dependency hashing, so provide the equivalent createHash fallback.
if (typeof crypto.hash !== 'function') {
  crypto.hash = (algorithm, data, outputEncoding) =>
    crypto.createHash(algorithm).update(data).digest(outputEncoding)
}

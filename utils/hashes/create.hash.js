const stringify = require("json-stable-stringify");
const crypto = require("crypto"); // Built-in Node.js module for hashing

function hash(jsonData) {
  // A. Stabilize the JSON (Orders keys deterministically so the hash doesn't change on arbitrary key sorting)
  const stableString = stringify(jsonData);

  // B. Create a SHA-256 hash of the stable string
  const hash = crypto.createHash("sha256").update(stableString).digest("hex");

  return hash;
}

module.exports = { hash };

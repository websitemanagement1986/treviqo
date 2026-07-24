/**
 * Print Hostinger-safe base64 env value for the partner private key.
 * Run: node scripts/print-paymate-private-key-env.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const candidates = [
  path.join(__dirname, "..", "ssl-emudhra", "pg-partner", "partner_private.pem"),
  path.join(__dirname, "..", "ssl-pg-partner", "partner_private.pem"),
];

const keyPath = candidates.find((p) => fs.existsSync(p));
if (!keyPath) {
  console.error("partner_private.pem not found. Tried:\n", candidates.join("\n"));
  process.exit(1);
}

const pem = fs.readFileSync(keyPath, "utf8");
crypto.createPrivateKey(pem);

const b64 = Buffer.from(pem, "utf8").toString("base64");

console.log(`Source: ${keyPath}\n`);
console.log("Recommended for Hostinger (avoids newline/base64 corruption):\n");
console.log("Env name: PAYMATE_PARTNER_PRIVATE_KEY_B64");
console.log("Env value length:", b64.length, "characters\n");
console.log(b64);

const paymateCertPath = path.join(__dirname, "..", "certs", "paymate-public.cer");
if (fs.existsSync(paymateCertPath)) {
  const certPem = fs.readFileSync(paymateCertPath, "utf8");
  crypto.createPublicKey(certPem);
  const certB64 = Buffer.from(certPem, "utf8").toString("base64");
  console.log("\n--- PayMate public certificate (for Hostinger when certs/ folder missing) ---\n");
  console.log("Env name: PAYMATE_PUBLIC_CERT_B64");
  console.log("Env value length:", certB64.length, "characters\n");
  console.log(certB64);
}

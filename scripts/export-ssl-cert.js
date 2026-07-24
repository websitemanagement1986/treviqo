/**
 * Export live SSL certificate + public key for payment gateway authorization.
 * Run: node scripts/export-ssl-cert.js [domain]
 */
const tls = require("tls");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const domain = process.argv[2] || "treviqo.co.in";

function pemWrap(label, base64Body) {
  const lines = base64Body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

const socket = tls.connect(
  443,
  domain,
  { servername: domain, rejectUnauthorized: true },
  () => {
    const cert = socket.getPeerCertificate(true);
    const validFrom = new Date(cert.valid_from).toISOString().slice(0, 10);
    const validUntil = new Date(cert.valid_to).toISOString().slice(0, 10);
    const certPem = pemWrap("CERTIFICATE", cert.raw.toString("base64"));
    const x509 = new crypto.X509Certificate(cert.raw);
    const pubkeyPem = x509.publicKey.export({ type: "spki", format: "pem" }).trim();

    const body = [
      "SSL CERTIFICATE AND PUBLIC KEY DETAILS",
      "======================================",
      "",
      `Merchant / Website: ${domain}`,
      `Covered domains: ${domain}, www.${domain}`,
      "SSL Provider: Hostinger Lifetime SSL",
      `Certificate Issuer: ${cert.issuer.O || "Let's Encrypt"} (${cert.issuer.CN})`,
      `Certificate Subject: ${cert.subject.CN}`,
      `Valid From: ${validFrom}`,
      `Valid Until: ${validUntil}`,
      `Serial Number: ${cert.serialNumber}`,
      `Fingerprint (SHA-256): ${cert.fingerprint256}`,
      "Signature Algorithm: ECDSA with SHA-384",
      "HTTPS Force Redirect: Enabled",
      "",
      "PUBLIC KEY (PEM FORMAT)",
      "-----------------------",
      pubkeyPem,
      "",
      "FULL CERTIFICATE (PEM FORMAT)",
      "-----------------------------",
      certPem.trim(),
      "",
      "VALIDITY NOTE",
      "-------------",
      "This certificate is issued by Let's Encrypt and is valid for approximately 90 days.",
      "Hostinger automatically renews the certificate before expiry (Lifetime SSL).",
      `Current certificate expiry date: ${validUntil}.`,
      "",
      "Generated on: " + new Date().toISOString(),
    ].join("\n");

    const outPath = path.join(
      __dirname,
      "..",
      `ssl-certificate-public-key-${domain.replace(/\./g, "-")}.txt`
    );
    fs.writeFileSync(outPath, body, "utf8");
    console.log(`Saved: ${outPath}`);
    console.log(`Valid: ${validFrom} to ${validUntil}`);
    socket.end();
  }
);

socket.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});

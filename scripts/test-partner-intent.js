/**
 * E2E smoke test for partner Intent API.
 *
 * Usage:
 *   node scripts/test-partner-intent.js
 *   node scripts/test-partner-intent.js https://treviqo.co.in YOUR_API_KEY
 *
 * Defaults: BASE_URL from SITE_URL / http://localhost:3000, key from PAYMATE_PARTNER_API_KEY
 */
const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] == null) process.env[m[1]] = m[2];
  }
}

loadDotEnv();

const baseUrl = (process.argv[2] || process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiKey = process.argv[3] || process.env.PAYMATE_PARTNER_API_KEY || "";

async function main() {
  if (!apiKey) {
    console.error("Missing API key. Set PAYMATE_PARTNER_API_KEY or pass as argv[3].");
    process.exit(1);
  }

  const url = `${baseUrl}/api/paymate/intent`;
  const body = {
    amount: 1,
    customerName: "E2E Test",
    phone: "9876567898",
    email: "",
    orderId: "",
  };

  console.log("POST", url);
  console.log("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  console.log("HTTP", res.status);
  console.log(JSON.stringify(json, null, 2));

  const ok =
    res.status === 200 &&
    json.status === "SUCCESS" &&
    typeof json.intentLink === "string" &&
    json.intentLink.startsWith("upi://");

  if (!ok) {
    console.error("\nE2E FAILED");
    process.exit(1);
  }

  console.log("\nE2E OK — intentLink received for orderId", json.orderId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

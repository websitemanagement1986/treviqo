/**
 * E2E smoke test for partner Intent + status APIs.
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

async function partnerFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function main() {
  if (!apiKey) {
    console.error("Missing API key. Set PAYMATE_PARTNER_API_KEY or pass as argv[3].");
    process.exit(1);
  }

  const intentUrl = `${baseUrl}/api/paymate/intent`;
  const body = {
    amount: 1,
    customerName: "E2E Test",
    phone: "9876567898",
    email: "",
    orderId: "",
  };

  console.log("POST", intentUrl);
  console.log("Body", body);

  const intent = await partnerFetch(intentUrl, {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log("HTTP", intent.res.status);
  console.log(JSON.stringify(intent.json, null, 2));

  const intentOk =
    intent.res.status === 200 &&
    intent.json.status === "SUCCESS" &&
    typeof intent.json.intentLink === "string" &&
    intent.json.intentLink.startsWith("upi://");

  if (!intentOk) {
    console.error("\nIntent E2E FAILED");
    process.exit(1);
  }

  console.log("\nIntent E2E OK — orderId", intent.json.orderId);

  const statusUrl = `${baseUrl}/api/paymate/${encodeURIComponent(intent.json.orderId)}`;
  console.log("\nGET", statusUrl);

  const status = await partnerFetch(statusUrl, { method: "GET" });
  console.log("HTTP", status.res.status);
  console.log(JSON.stringify(status.json, null, 2));

  const statusOk =
    status.res.status === 200 &&
    status.json.orderId === intent.json.orderId &&
    typeof status.json.status === "string" &&
    status.json.amount != null;

  if (!statusOk) {
    console.error("\nStatus E2E FAILED");
    process.exit(1);
  }

  console.log("\nStatus E2E OK —", status.json.status, "rrn:", status.json.rrn);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

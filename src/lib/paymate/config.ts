import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PaymateConfig {
  merchantId: string;
  terminalId: string;
  businessXpressId: string;
  iv: string;
  endpoint: string;
  siteUrl: string;
  paymatePublicCert: string;
  partnerPrivateKey: string;
  partnerPrivateKeySource: string;
  companyName: string;
  referenceCode: string;
}

function normalizePem(value: string): string {
  if (!value) return "";

  let pem = String(value).trim();
  if (pem.charCodeAt(0) === 0xfeff) pem = pem.slice(1);

  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim();
  }

  pem = pem.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (pem.includes("-----BEGIN") && pem.includes("-----END")) {
    const beginMatch = pem.match(/-----BEGIN [A-Z0-9 ]+-----/);
    const endMatch = pem.match(/-----END [A-Z0-9 ]+-----/);
    if (beginMatch && endMatch) {
      const begin = beginMatch[0];
      const end = endMatch[0];
      const start = pem.indexOf(begin) + begin.length;
      const endIdx = pem.indexOf(end);
      const body = pem.slice(start, endIdx).replace(/\s+/g, "");
      if (body) {
        const lines = body.match(/.{1,64}/g) || [];
        pem = `${begin}\n${lines.join("\n")}\n${end}`;
      }
    }
  }

  return `${pem.trim()}\n`;
}

function validatePrivateKey(pem: string, label: string) {
  try {
    crypto.createPrivateKey(pem);
  } catch (err) {
    const hasBegin = pem.includes("-----BEGIN");
    const hasEnd = pem.includes("-----END");
    throw new Error(
      `${label} is invalid. Ensure you pasted partner_private.pem (not partner_public.txt). ` +
        `BEGIN marker: ${hasBegin}, END marker: ${hasEnd}. ${err instanceof Error ? err.message : err}`
    );
  }
}

function validateCertificate(pem: string, label: string) {
  try {
    crypto.createPublicKey(pem);
  } catch (err) {
    throw new Error(`${label} is invalid: ${err instanceof Error ? err.message : err}`);
  }
}

function resolveExistingPath(candidates: string[]): string | null {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function decodeBase64Pem(value: string, label: string): string {
  if (!value) return "";
  const cleaned = String(value).trim().replace(/\s+/g, "");
  if (!cleaned) return "";
  try {
    return normalizePem(Buffer.from(cleaned, "base64").toString("utf8"));
  } catch (err) {
    throw new Error(
      `${label} base64 decode failed: ${err instanceof Error ? err.message : err}`
    );
  }
}

function loadPem({
  label,
  inlineEnv,
  pathEnv,
  defaultRelativePaths,
  appRoot,
  kind = "any",
}: {
  label: string;
  inlineEnv?: string;
  pathEnv?: string;
  defaultRelativePaths: string[];
  appRoot: string;
  kind?: "any" | "private" | "certificate";
}): string {
  const inline = normalizePem(inlineEnv || "");
  let pem = inline;

  if (!pem) {
    const candidates: string[] = [];
    if (pathEnv) {
      candidates.push(pathEnv);
      if (!path.isAbsolute(pathEnv)) {
        candidates.push(path.join(process.cwd(), pathEnv));
        candidates.push(path.join(appRoot, pathEnv));
      }
    }

    for (const relativePath of defaultRelativePaths) {
      candidates.push(path.join(appRoot, relativePath));
      candidates.push(path.join(process.cwd(), relativePath));
    }

    const resolvedPath = resolveExistingPath(candidates);
    if (!resolvedPath) {
      throw new Error(
        `${label} not found. Upload the file or set ${label} env content. Tried: ${[...new Set(candidates)].join(" | ")} | cwd=${process.cwd()} | appRoot=${appRoot}`
      );
    }

    pem = normalizePem(fs.readFileSync(resolvedPath, "utf8"));
  }

  if (kind === "private") validatePrivateKey(pem, label);
  if (kind === "certificate") validateCertificate(pem, label);
  return pem;
}

function loadPaymatePublicCert(appRoot: string): string {
  const b64 = process.env.PAYMATE_PUBLIC_CERT_B64;
  if (b64) {
    const pem = decodeBase64Pem(b64, "PayMate public certificate");
    validateCertificate(pem, "PayMate public certificate");
    return pem;
  }

  return loadPem({
    label: "PayMate public certificate",
    inlineEnv: process.env.PAYMATE_PUBLIC_CERT,
    pathEnv: process.env.PAYMATE_PUBLIC_CERT_PATH,
    defaultRelativePaths: ["certs/paymate-public.cer"],
    appRoot,
    kind: "certificate",
  });
}

function loadPartnerPrivateKey(appRoot: string) {
  const b64 = process.env.PAYMATE_PARTNER_PRIVATE_KEY_B64;
  if (b64) {
    const pem = decodeBase64Pem(b64, "Partner private key");
    validatePrivateKey(pem, "Partner private key");
    return { pem, source: "PAYMATE_PARTNER_PRIVATE_KEY_B64" };
  }

  const pem = loadPem({
    label: "Partner private key",
    inlineEnv: process.env.PAYMATE_PARTNER_PRIVATE_KEY,
    pathEnv: process.env.PAYMATE_PARTNER_PRIVATE_KEY_PATH,
    defaultRelativePaths: [
      "ssl-emudhra/pg-partner/partner_private.pem",
      "ssl-pg-partner/partner_private.pem",
    ],
    appRoot,
    kind: "private",
  });

  const source = process.env.PAYMATE_PARTNER_PRIVATE_KEY
    ? "PAYMATE_PARTNER_PRIVATE_KEY env"
    : process.env.PAYMATE_PARTNER_PRIVATE_KEY_PATH ||
      "ssl-emudhra/pg-partner/partner_private.pem file";

  return { pem, source };
}

export function getPaymateConfig(): PaymateConfig {
  const appRoot = process.cwd();
  const merchantId = process.env.PAYMATE_MERCHANT_ID;
  const terminalId = process.env.PAYMATE_TERMINAL_ID;
  const businessXpressId = process.env.PAYMATE_BUSINESS_XPRESS_ID;
  const iv = process.env.PAYMATE_IV || "54327CD65487ECAB";
  const endpoint =
    process.env.PAYMATE_ENDPOINT ||
    "https://paymate.in/PaymatePartnerStack/api/v2/CollectPayments";
  const siteUrl = (process.env.SITE_URL || "https://treviqo.co.in").replace(/\/$/, "");

  if (!merchantId || !terminalId || !businessXpressId) {
    throw new Error(
      "PayMate not configured. Set PAYMATE_MERCHANT_ID, PAYMATE_TERMINAL_ID, and PAYMATE_BUSINESS_XPRESS_ID."
    );
  }

  const paymatePublicCert = loadPaymatePublicCert(appRoot);

  const partner = loadPartnerPrivateKey(appRoot);

  return {
    merchantId,
    terminalId,
    businessXpressId,
    iv,
    endpoint,
    siteUrl,
    paymatePublicCert,
    partnerPrivateKey: partner.pem,
    partnerPrivateKeySource: partner.source,
    companyName: process.env.PAYMATE_COMPANY_NAME || "Treviqo Traders (OPC) Pvt Ltd",
    referenceCode: process.env.PAYMATE_REFERENCE_CODE || "TREVIQO01",
  };
}

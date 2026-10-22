import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import tls from "node:tls";

const DEFAULT_CERT_RELATIVE = "certs/paymate.in.crt";

/** Resolved path to the PayMate TLS certificate (updated cert from PayMate support). */
export function getPaymateCertPath(): string {
  const fromEnv = process.env.PAYMATE_CERT_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), DEFAULT_CERT_RELATIVE);
}

export function readPaymateCaCert(): string {
  const certPath = getPaymateCertPath();
  if (!fs.existsSync(certPath)) {
    throw new Error(
      `PayMate certificate not found at ${certPath}. Set PAYMATE_CERT_PATH or add certs/paymate.in.crt.`,
    );
  }
  return fs.readFileSync(certPath, "utf8");
}

let paymateHttpsAgent: https.Agent | undefined;

function buildCaBundle(): string[] {
  const paymate = readPaymateCaCert();
  // PayMate sends the paymate.in leaf cert; keep Mozilla roots for chain validation.
  return [...tls.rootCertificates, paymate];
}

export function getPaymateHttpsAgent(): https.Agent {
  if (!paymateHttpsAgent) {
    paymateHttpsAgent = new https.Agent({
      ca: buildCaBundle(),
      keepAlive: true,
    });
  }
  return paymateHttpsAgent;
}

/**
 * Lightweight HTTPS GET/HEAD probe using the PayMate CA certificate.
 */
export function paymateHttpsProbe(
  probeUrl: string,
  method: "GET" | "HEAD" = "GET",
): Promise<{ statusCode: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(probeUrl);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        agent: getPaymateHttpsAgent(),
      },
      (res) => {
        res.resume();
        resolve({ statusCode: res.statusCode ?? 0 });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

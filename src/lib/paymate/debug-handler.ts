import crypto from "crypto";
import https from "https";
import type { IncomingHttpHeaders } from "http";
import dns from "dns";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { encryptRequest } from "@/lib/paymate/crypto";
import { getPaymateConfig } from "@/lib/paymate/config";
import {
  extractPaymateMessage,
  extractPaymentUrl,
  isSuccessPayload,
  parsePayMateResponse,
} from "@/lib/paymate/client";
import { resolvePaymateMethod } from "@/lib/paymate/payment-methods";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

function httpsPostIPv4(urlStr: string, headers: Record<string, string>, body: string) {
  return new Promise<{
    status: number;
    headers: IncomingHttpHeaders;
    body: Record<string, unknown>;
    connection: Record<string, unknown>;
  }>((resolve, reject) => {
    const url = new URL(urlStr);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      family: 4,
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data) as Record<string, unknown>;
        } catch {
          parsed = { raw: data.slice(0, 300) };
        }
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: parsed,
          connection: {
            localAddress: req.socket?.localAddress,
            localPort: req.socket?.localPort,
            remoteAddress: req.socket?.remoteAddress,
            remoteFamily: req.socket?.remoteFamily,
          },
        });
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpsGetIPv4(urlStr: string) {
  return new Promise<{ body: string; localAddress?: string; remoteAddress?: string }>(
    (resolve, reject) => {
      const url = new URL(urlStr);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        family: 4,
        timeout: 5000,
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            body: data.trim(),
            localAddress: req.socket?.localAddress,
            remoteAddress: req.socket?.remoteAddress,
          });
        });
      });
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("timeout"));
      });
      req.on("error", reject);
      req.end();
    }
  );
}

function httpsPostMTLS(
  urlStr: string,
  headers: Record<string, string>,
  body: string,
  clientKey: string,
  clientCert: string
) {
  return new Promise<{
    status: number;
    body: Record<string, unknown>;
    connection: Record<string, unknown>;
  }>((resolve, reject) => {
    const url = new URL(urlStr);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      family: 4,
      key: clientKey,
      cert: clientCert,
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data) as Record<string, unknown>;
        } catch {
          parsed = { raw: data.slice(0, 300) };
        }
        resolve({
          status: res.statusCode || 0,
          body: parsed,
          connection: {
            localAddress: req.socket?.localAddress,
            remoteAddress: req.socket?.remoteAddress,
            authorized: (req.socket as { authorized?: boolean })?.authorized,
          },
        });
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function analyzePaymateBody(body: Record<string, unknown>, config: ReturnType<typeof getPaymateConfig>) {
  if (!body || typeof body !== "object") {
    return { raw: body, status_code: null, success: false };
  }

  if (body.EncryptedData || body.encryptedData) {
    const parsed = parsePayMateResponse(body, config);
    return {
      encrypted: true,
      parsed,
      status_code: (parsed?.StatusCode as string) || null,
      description: extractPaymateMessage(parsed),
      payment_url: extractPaymentUrl(parsed),
      success: isSuccessPayload(parsed),
    };
  }

  return {
    encrypted: false,
    parsed: body,
    status_code: (body?.StatusCode as string) || null,
    description: extractPaymateMessage(body),
    payment_url: extractPaymentUrl(body),
    success: isSuccessPayload(body),
  };
}

function maskId(value: string) {
  if (!value || value.length < 8) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function buildSamplePayload(
  orderId: string,
  _config: ReturnType<typeof getPaymateConfig>,
  options: {
    methodKey?: string;
    PaymentMode?: string;
    PaymentType?: string;
    TargetApp?: string;
    DeviceOS?: string;
  } = {}
) {
  const methodKey = options.methodKey || "upi";
  const paymateMethod = resolvePaymateMethod(methodKey);
  const paymentMode = options.PaymentMode || paymateMethod.PaymentMode;
  const paymentType = options.PaymentType || paymateMethod.PaymentType;
  const targetApp = options.TargetApp || "GPAY";
  const deviceOS = options.DeviceOS || "ANDROID";
  const transactionDetails: Record<string, unknown> = {
    OrderID: orderId,
    CompanyName: "Rahul",
    ReferenceCode: "",
    ContactXpressID: "",
    ReceipentMobileNo: "",
    RecipentEmailAddress: "",
    UDF1: [{ abc: "def" }],
    UDF2: [{ abc: "def" }, { abc: "def" }],
    UDF3: [],
    Remarks: "Payments",
  };
  const paymentMethod: Record<string, string> = {
    PaymentMode: paymentMode,
    PaymentType: paymentType,
  };
  if (paymentType === "Intent") {
    paymentMethod.TargetApp = targetApp;
    paymentMethod.DeviceOS = deviceOS;
  }
  return {
    CollectionDetails: [
      {
        TransactionDetails: transactionDetails,
        INVOICE: {
          InvoiceNumber: "",
          InvoiceStartDate: "",
          InvoiceTerm: "",
          InvoiceAmount: "100",
          GSTType: "",
          GST: "",
        },
        PaymentMethod: paymentMethod,
        SplitMDR: {
          BuyerCharges: "0",
          SupplierCharges: "100",
        },
      },
    ],
  };
}

async function postPaymateVariant(
  config: ReturnType<typeof getPaymateConfig>,
  baseHeaders: Record<string, string>,
  variantPayload: object
) {
  const encryptedBody = encryptRequest(variantPayload, config.paymatePublicCert, config.iv);
  const jsonBody = JSON.stringify(encryptedBody);
  const t0 = Date.now();
  const r = await fetch(config.endpoint, {
    method: "POST",
    headers: baseHeaders,
    body: jsonBody,
    signal: AbortSignal.timeout(10000),
  });
  const txt = await r.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(txt) as Record<string, unknown>;
  } catch {
    body = { raw_preview: txt.slice(0, 300) };
  }
  const analyzed = analyzePaymateBody(body, config);
  return {
    duration_ms: Date.now() - t0,
    http_status: r.status,
    plain_text_payload: variantPayload,
    parsed_response: analyzed.parsed,
    status_code: analyzed.status_code,
    description: analyzed.description,
    payment_url: analyzed.payment_url,
    success: analyzed.success,
  };
}

export async function runPaymateDebug(debugKey?: string | null) {
  if (debugKey && process.env.PAYMATE_DEBUG_KEY && debugKey !== process.env.PAYMATE_DEBUG_KEY) {
    return { status: 403, body: { error: "Invalid debug key" } };
  }

  const report: Record<string, unknown> = {
    checked_at: new Date().toISOString(),
    server: {
      cwd: process.cwd(),
      node_version: process.version,
    },
    checks: {} as Record<string, unknown>,
    paymate_call: null,
    interpretation: [] as string[],
  };

  try {
    const config = getPaymateConfig();
    (report.checks as Record<string, unknown>).config = {
      ok: true,
      endpoint: config.endpoint,
      site_url: config.siteUrl,
      business_xpress_id: config.businessXpressId,
      merchant_id: maskId(config.merchantId),
      terminal_id: maskId(config.terminalId),
      iv_length: config.iv.length,
      paymate_public_cert_loaded: config.paymatePublicCert.includes("BEGIN CERTIFICATE"),
      partner_private_key_loaded: config.partnerPrivateKey.includes("BEGIN"),
      partner_key_source: config.partnerPrivateKeySource,
      partner_key_b64_length: process.env.PAYMATE_PARTNER_PRIVATE_KEY_B64
        ? process.env.PAYMATE_PARTNER_PRIVATE_KEY_B64.replace(/\s+/g, "").length
        : null,
    };

    const partnerPublic = crypto.createPublicKey(config.partnerPrivateKey);
    const testKey = "AES256BITSKEYFORENCRYPTIONOFDATA";
    const encKey = crypto
      .publicEncrypt(
        { key: partnerPublic, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(testKey, "utf8")
      )
      .toString("base64");
    const decKey = crypto
      .privateDecrypt(
        { key: config.partnerPrivateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(encKey, "base64")
      )
      .toString("utf8");
    (report.checks as Record<string, unknown>).partner_key_pair = { ok: decKey === testKey };

    const paymateEncrypt = encryptRequest({ ping: true }, config.paymatePublicCert, config.iv);
    (report.checks as Record<string, unknown>).paymate_request_encryption = {
      ok: Boolean(paymateEncrypt.EncryptedRandomKey && paymateEncrypt.EncryptedData),
      encrypted_data_length: paymateEncrypt.EncryptedData?.length || 0,
    };

    const ipChecks: Record<string, Record<string, unknown>> = {};
    const ipServices = [
      { name: "ipify_fetch", url: "https://api.ipify.org?format=json" },
      { name: "ifconfig_fetch", url: "https://ifconfig.me/ip" },
    ];
    for (const svc of ipServices) {
      try {
        const r = await fetch(svc.url, { signal: AbortSignal.timeout(5000) });
        const txt = await r.text();
        let ip: string | undefined;
        try {
          const data = JSON.parse(txt) as { ip?: string };
          ip = data.ip;
        } catch {
          ip = txt.trim();
        }
        ipChecks[svc.name] = { ip, method: "fetch" };
      } catch (err) {
        ipChecks[svc.name] = { error: err instanceof Error ? err.message : String(err) };
      }
    }
    try {
      const r = await httpsGetIPv4("https://api.ipify.org?format=text");
      ipChecks.ipify_https_ipv4 = {
        ip: r.body,
        localAddress: r.localAddress,
        method: "https module (family:4)",
      };
    } catch (err) {
      ipChecks.ipify_https_ipv4 = { error: err instanceof Error ? err.message : String(err) };
    }
    try {
      const r = await httpsGetIPv4("https://ifconfig.me/ip");
      ipChecks.ifconfig_https_ipv4 = {
        ip: r.body,
        localAddress: r.localAddress,
        method: "https module (family:4)",
      };
    } catch (err) {
      ipChecks.ifconfig_https_ipv4 = { error: err instanceof Error ? err.message : String(err) };
    }
    const allIps = [...new Set(Object.values(ipChecks).map((c) => c.ip).filter(Boolean))];
    (report.checks as Record<string, unknown>).outbound_ip = {
      ok: allIps.length === 1,
      all_detected_ips: allIps,
      services: ipChecks,
      consistent: allIps.length === 1,
    };

    const orderId = `DBG${Date.now()}`.slice(0, 20);
    const payload = buildSamplePayload(orderId, config);
    const encryptedBody = encryptRequest(payload, config.paymatePublicCert, config.iv);
    const jsonBody = JSON.stringify(encryptedBody);

    const baseHeaders = {
      "Content-Type": "application/json",
      MerchantId: config.merchantId,
      TerminalId: config.terminalId,
      BusinessXpressID: config.businessXpressId,
    };

    const variations = [
      { id: "original", hypothesis: "Baseline: current headers", url: config.endpoint, headers: { ...baseHeaders } },
      {
        id: "with_origin",
        hypothesis: "Add Origin header (domain validation)",
        url: config.endpoint,
        headers: { ...baseHeaders, Origin: config.siteUrl },
      },
      {
        id: "with_referer",
        hypothesis: "Add Referer header",
        url: config.endpoint,
        headers: { ...baseHeaders, Referer: `${config.siteUrl}/` },
      },
      {
        id: "with_origin_and_referer",
        hypothesis: "Both Origin + Referer",
        url: config.endpoint,
        headers: {
          ...baseHeaders,
          Origin: config.siteUrl,
          Referer: `${config.siteUrl}/checkout`,
          "User-Agent": "TreviqoPayMate/1.0",
        },
      },
      {
        id: "with_host",
        hypothesis: "Explicit Host header matching PayMate domain",
        url: config.endpoint,
        headers: { ...baseHeaders, Host: "paymate.in" },
      },
      {
        id: "uat_co_in",
        hypothesis: "Try uat.paymate.co.in (from PayMate docs)",
        url: "https://uat.paymate.co.in/PaymatePartnerStack/api/v2/CollectPayments",
        headers: { ...baseHeaders },
      },
    ];

    report.variation_results = [];
    for (const v of variations) {
      const t0 = Date.now();
      try {
        const r = await fetch(v.url, {
          method: "POST",
          headers: v.headers,
          body: jsonBody,
          signal: AbortSignal.timeout(10000),
        });
        const txt = await r.text();
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(txt) as Record<string, unknown>;
        } catch {
          body = { raw_preview: txt.slice(0, 300) };
        }
        const analyzed = analyzePaymateBody(body, config);
        (report.variation_results as Record<string, unknown>[]).push({
          id: v.id,
          hypothesis: v.hypothesis,
          url: v.url,
          headers_sent: v.headers,
          duration_ms: Date.now() - t0,
          http_status: r.status,
          response_body: body,
          parsed_response: analyzed.parsed,
          encrypted_response: analyzed.encrypted,
          status_code: analyzed.status_code,
          description: analyzed.description,
          payment_url: analyzed.payment_url,
          success: analyzed.success,
          changed: analyzed.status_code !== "105",
        });
      } catch (err) {
        (report.variation_results as Record<string, unknown>[]).push({
          id: v.id,
          hypothesis: v.hypothesis,
          url: v.url,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - t0,
        });
      }
    }

    const upiVariants = [
      { id: "upi_intent_gpay_android", hypothesis: "UPI Intent + GPAY + ANDROID", PaymentMode: "UPI", PaymentType: "Intent", TargetApp: "GPAY", DeviceOS: "ANDROID" },
      { id: "upi_intent_gpay_ios", hypothesis: "UPI Intent + GPAY + IOS", PaymentMode: "UPI", PaymentType: "Intent", TargetApp: "GPAY", DeviceOS: "IOS" },
      { id: "upi_intent_phonepe", hypothesis: "UPI Intent + PHONEPE + ANDROID", PaymentMode: "UPI", PaymentType: "Intent", TargetApp: "PHONEPE", DeviceOS: "ANDROID" },
      { id: "upi_intent_paytm", hypothesis: "UPI Intent + PAYTM + ANDROID", PaymentMode: "UPI", PaymentType: "Intent", TargetApp: "PAYTM", DeviceOS: "ANDROID" },
      { id: "upi_vpa_qrcode", hypothesis: "UPI + VPA/QRCode (hosted checkout)", PaymentMode: "UPI", PaymentType: "VPA/QRCode" },
    ];
    report.upi_payment_variations = [];
    for (const variant of upiVariants) {
      const variantOrderId = `DBG${Date.now()}${variant.id.slice(-3)}`.slice(0, 20);
      try {
        const variantPayload = buildSamplePayload(variantOrderId, config, variant);
        const result = await postPaymateVariant(config, baseHeaders, variantPayload);
        (report.upi_payment_variations as Record<string, unknown>[]).push({
          id: variant.id,
          hypothesis: variant.hypothesis,
          payment_mode: variant.PaymentMode,
          payment_type: variant.PaymentType,
          ...result,
        });
      } catch (err) {
        (report.upi_payment_variations as Record<string, unknown>[]).push({
          id: variant.id,
          hypothesis: variant.hypothesis,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const upiSuccess = (report.upi_payment_variations as Record<string, unknown>[]).find((v) => v.success);
    if (upiSuccess) {
      report.interpretation_upi_winner = {
        id: upiSuccess.id,
        payment_mode: upiSuccess.payment_mode,
        payment_type: upiSuccess.payment_type,
        payment_url: upiSuccess.payment_url,
      };
    }

    const dnsResults: Record<string, unknown> = {};
    try {
      dnsResults.A = await resolve4("paymate.in");
    } catch (e) {
      dnsResults.A_error = e instanceof Error ? e.message : String(e);
    }
    try {
      dnsResults.AAAA = await resolve6("paymate.in");
    } catch (e) {
      dnsResults.AAAA_error = e instanceof Error ? e.message : String(e);
    }
    (report.checks as Record<string, unknown>).paymate_dns = {
      ...dnsResults,
      has_ipv6: Boolean(dnsResults.AAAA && (dnsResults.AAAA as string[]).length > 0),
    };

    const ipv4Headers = { ...baseHeaders };
    try {
      const t0 = Date.now();
      const ipv4Result = await httpsPostIPv4(config.endpoint, ipv4Headers, jsonBody);
      const ipv4Analyzed = analyzePaymateBody(ipv4Result.body, config);
      report.forced_ipv4_call = {
        hypothesis: "Force IPv4 (family:4) to ensure PayMate sees whitelisted IP",
        duration_ms: Date.now() - t0,
        connection: ipv4Result.connection,
        http_status: ipv4Result.status,
        response_body: ipv4Result.body,
        parsed_response: ipv4Analyzed.parsed,
        status_code: ipv4Analyzed.status_code,
        description: ipv4Analyzed.description,
        payment_url: ipv4Analyzed.payment_url,
        success: ipv4Analyzed.success,
        different_from_fetch: ipv4Analyzed.status_code !== "105",
      };
    } catch (err) {
      report.forced_ipv4_call = { error: err instanceof Error ? err.message : String(err) };
    }

    const partnerCertPath = path.join(process.cwd(), "certs", "partner-public.cer");
    let partnerCertPem: string | null = null;
    try {
      partnerCertPem = fs.readFileSync(partnerCertPath, "utf8");
    } catch {
      /* not deployed */
    }

    if (partnerCertPem) {
      try {
        const t0 = Date.now();
        const mtlsResult = await httpsPostMTLS(
          config.endpoint,
          ipv4Headers,
          jsonBody,
          config.partnerPrivateKey,
          partnerCertPem
        );
        const mtlsAnalyzed = analyzePaymateBody(mtlsResult.body, config);
        report.mtls_call = {
          hypothesis: "mTLS — present partner cert as TLS client certificate",
          duration_ms: Date.now() - t0,
          connection: mtlsResult.connection,
          http_status: mtlsResult.status,
          response_body: mtlsResult.body,
          parsed_response: mtlsAnalyzed.parsed,
          status_code: mtlsAnalyzed.status_code,
          description: mtlsAnalyzed.description,
          payment_url: mtlsAnalyzed.payment_url,
          success: mtlsAnalyzed.success,
          different_from_normal: mtlsAnalyzed.status_code !== "105",
        };
      } catch (err) {
        report.mtls_call = {
          hypothesis: "mTLS — present partner cert as TLS client certificate",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      report.mtls_call = { skipped: true, reason: `partner-public.cer not found at ${partnerCertPath}` };
    }

    try {
      const payCert = new crypto.X509Certificate(config.paymatePublicCert);
      (report.checks as Record<string, unknown>).paymate_cert_info = {
        subject: payCert.subject,
        issuer: payCert.issuer,
        validFrom: payCert.validFrom,
        validTo: payCert.validTo,
        expired: new Date(payCert.validTo) < new Date(),
        days_remaining: Math.floor((new Date(payCert.validTo).getTime() - Date.now()) / 86400000),
      };
    } catch (err) {
      (report.checks as Record<string, unknown>).paymate_cert_info = {
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const primaryResult =
      (report.variation_results as Record<string, unknown>[]).find((v) => v.id === "original") || {};
    report.paymate_call = {
      duration_ms: primaryResult.duration_ms,
      request: {
        method: "POST",
        url: config.endpoint,
        headers: primaryResult.headers_sent,
        body: encryptedBody,
        plain_text_payload: payload,
      },
      response: {
        http_status: primaryResult.http_status,
        body: primaryResult.response_body,
        parsed: primaryResult.parsed_response || null,
      },
      sample_order_id: orderId,
      status_code: primaryResult.status_code,
      description: primaryResult.description || null,
      payment_url: primaryResult.payment_url || null,
      success: Boolean(primaryResult.success),
    };

    const interpretation: string[] = [];

    if (primaryResult.encrypted_response && primaryResult.status_code !== "105") {
      if (primaryResult.success) {
        interpretation.push(
          "PayMate connection is working. Encrypted response decrypted successfully and request was accepted."
        );
        if (primaryResult.payment_url) {
          interpretation.push(`Payment URL received: ${primaryResult.payment_url}`);
        }
      } else if (primaryResult.status_code === "178") {
        const winner = report.interpretation_upi_winner as Record<string, unknown> | undefined;
        if (winner) {
          interpretation.push(
            `UPI variant ${winner.id} succeeded with PaymentMode=${winner.payment_mode}, PaymentType=${winner.payment_type}.`
          );
        } else {
          interpretation.push(
            `PayMate still returns 178 Invalid Payment Mode for UPI. Confirm Hosted Checkout UPI is enabled for merchant ${config.businessXpressId} / Terminal ${maskId(config.terminalId)}.`
          );
        }
        const parsed = primaryResult.parsed_response as Record<string, unknown> | undefined;
        const detailed = parsed?.DetailedSummary as Record<string, unknown>[] | undefined;
        interpretation.push(
          `Detail: ${detailed?.[0]?.StatusMessage || primaryResult.description}`
        );
        const variantSummary = (report.upi_payment_variations as Record<string, unknown>[])
          .map((v) => `${v.id}=${v.status_code || "err"}`)
          .join(", ");
        if (variantSummary) {
          interpretation.push(`UPI type tests: ${variantSummary}`);
        }
      } else {
        interpretation.push(
          `PayMate returned StatusCode ${primaryResult.status_code}: ${primaryResult.description || "see parsed_response"}`
        );
      }
    } else if (primaryResult.status_code === "105") {
      interpretation.push(
        "PayMate StatusCode 105 = Request from Invalid Source. IP whitelist or account activation issue on PayMate side."
      );
    }

    const anyDifferent = (report.variation_results as Record<string, unknown>[]).filter((v) => v.changed);
    const forcedIpv4 = report.forced_ipv4_call as Record<string, unknown> | undefined;

    if (forcedIpv4?.different_from_fetch && primaryResult.status_code === "105") {
      interpretation.push(
        `BREAKTHROUGH: Forcing IPv4 got StatusCode ${forcedIpv4.status_code} instead of 105! The issue is IPv6. Fix: force all PayMate calls to use IPv4.`
      );
    }

    if (anyDifferent.length > 0 && primaryResult.status_code === "105") {
      interpretation.push(
        `${anyDifferent.length} variation(s) got a different response from 105: ${anyDifferent.map((v) => `${v.id}=${v.status_code}`).join(", ")}`
      );
    }

    if (primaryResult.status_code === "105" && anyDifferent.length === 0) {
      interpretation.push(
        "All variations still got 105. Issue is likely IP whitelist or account activation on PayMate side."
      );
    }

    report.interpretation = interpretation;
    (report.checks as Record<string, unknown>).overall_ok = Boolean(primaryResult.success);

    return { status: 200, body: report };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    (report.checks as Record<string, unknown>).overall_ok = false;
    report.error = message;
    (report.interpretation as string[]).push(
      "Local configuration or crypto setup failed before/during PayMate call."
    );
    if (message.includes("bad base64 decode") || message.includes("no start line")) {
      (report.interpretation as string[]).push(
        "Hostinger often corrupts multi-line PEM in PAYMATE_PARTNER_PRIVATE_KEY. " +
          "Delete that env var, run `node scripts/print-paymate-private-key-env.js` locally, " +
          "and set PAYMATE_PARTNER_PRIVATE_KEY_B64 to the single base64 line instead."
      );
    }
    return { status: 500, body: report };
  }
}

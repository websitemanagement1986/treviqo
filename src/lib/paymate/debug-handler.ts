import crypto from "crypto";
import https from "https";
import type { IncomingHttpHeaders } from "http";
import dns from "dns";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { encryptRequest } from "@/lib/paymate/crypto";
import { getPaymateConfig, paymateV1CollectEndpoint } from "@/lib/paymate/config";
import {
  buildCollectPaymentsPayload,
  buildPaymateAntaraV2SamplePayload,
  buildPaymateOrderId,
  diffAgainstWorkingMerchant,
  formatPaymateAmount,
  getPaymateInvoiceDate,
  PAYMATE_BLANK_FIELDS,
} from "@/lib/paymate/payload";
import {
  extractPaymateMessage,
  extractPaymentUrl,
  isSuccessPayload,
  parsePayMateResponse,
} from "@/lib/paymate/client";

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

function buildSamplePayload(orderId: string, referenceCode = "") {
  return buildCollectPaymentsPayload({ orderId, referenceCode });
}

async function runCombinationTests(
  config: ReturnType<typeof getPaymateConfig>,
  baseHeaders: Record<string, string>
) {
  type Spec = {
    id: string;
    hypothesis: string;
    doc_ref?: string;
    options?: Parameters<typeof buildCollectPaymentsPayload>[0];
    rawPayload?: object;
    endpoint?: string;
  };

  const v1Endpoint = paymateV1CollectEndpoint(config.endpoint);

  const specs: Spec[] = [
    {
      id: "paymate_antara_v2_exact",
      hypothesis:
        "PayMate sample: Antara, blank mobile/email/invoice fields, InvoiceAmount 201, v2 Intent",
      doc_ref: "PayMate support Antara UPI Intent sample",
      endpoint: config.endpointV2,
      rawPayload: buildPaymateAntaraV2SamplePayload(),
    },
    {
      id: "baseline_blank_ref_android",
      hypothesis: "Blank ReferenceCode + UPI Intent + ANDROID + 100.00 (v2)",
      doc_ref: "UPI Intent doc — Intent on v2 (current Treviqo)",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        invoiceAmount: 100,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "checkout_upi_vpa_v2",
      hypothesis: "Checkout doc: v2 + UPI + VPA, no DeviceOS/TargetApp",
      doc_ref: "PayMate_Checkout_Integration.html",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentType: "VPA",
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: "checkout_upi_qrcode_v2",
      hypothesis: "Checkout doc: v2 + UPI + QRCode",
      doc_ref: "PayMate_Checkout_Integration.html",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentType: "QRCode",
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: "checkout_upi_vpa_slash_qrcode_v2",
      hypothesis: "Checkout/Fomino: v2 + UPI + VPA/QRCode",
      doc_ref: "PayMate_Checkout_Integration.html + Fomino",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentType: "VPA/QRCode",
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: "checkout_credit_card_v2",
      hypothesis: "Checkout doc: v2 + CreditCard + Card",
      doc_ref: "PayMate_Checkout_Integration.html",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentMode: "CreditCard",
        paymentType: "Card",
        invoiceAmount: 100,
      },
    },
    {
      id: "intent_v1_android_blank",
      hypothesis: "UPI Intent doc: v1 + blank ReferenceCode",
      doc_ref: "PayMate_UPI_Intent_Integration.html",
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        invoiceAmount: 100,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "intent_v1_treviqo01",
      hypothesis: "UPI Intent doc: v1 + ReferenceCode TREVIQO01",
      doc_ref: "PayMate_UPI_Intent_Integration.html + registered ref",
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "TREVIQO01",
        invoiceAmount: 100,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "intent_v1_env_ref",
      hypothesis: "UPI Intent: v1 + PAYMATE_REFERENCE_CODE from env",
      doc_ref: "PayMate_UPI_Intent_Integration.html + env ref",
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: config.referenceCode,
        invoiceAmount: 100,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "checkout_upi_vpa_v1_treviqo01",
      hypothesis: "Checkout doc on v1: UPI + VPA + TREVIQO01",
      doc_ref: "Hybrid — checkout PaymentType on v1",
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "TREVIQO01",
        paymentType: "VPA",
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: "intent_v2_android",
      hypothesis: "UPI Intent doc fields on v2 endpoint",
      doc_ref: "Hybrid — Intent fields + v2 CollectPayments",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        invoiceAmount: 100,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "working_clone_4_00",
      hypothesis: "Clone working merchant: blank ref, 4.00, long OrderID, Rakesh Kumar",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        companyName: "Rakesh Kumar",
        email: "user9898989898@gmail.com",
        invoiceAmount: 4,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "working_clone_short_order",
      hypothesis: "Clone working merchant with short OrderID UPIOITest###",
      options: {
        orderId: buildPaymateOrderId("short"),
        referenceCode: "",
        companyName: "Rakesh Kumar",
        email: "user9898989898@gmail.com",
        invoiceAmount: 4,
        deviceOS: "ANDROID",
      },
    },
    {
      id: "ref_treviqo01",
      hypothesis: "ReferenceCode TREVIQO01 (env default)",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "TREVIQO01",
        invoiceAmount: 100,
      },
    },
    {
      id: "device_ios",
      hypothesis: "DeviceOS IOS instead of ANDROID",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        invoiceAmount: 100,
        deviceOS: "IOS",
      },
    },
    {
      id: "invoice_term_space",
      hypothesis: "InvoiceTerm = single space (PayMate blank hint)",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        blankOverrides: { InvoiceTerm: " " },
      },
    },
    {
      id: "debit_card",
      hypothesis: "DebitCard — if OK, terminal works but UPI not enabled",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentMode: "DebitCard",
        paymentType: "Card",
        invoiceAmount: 100,
      },
    },
    {
      id: "netbanking",
      hypothesis: "NetBanking — if OK, terminal works but UPI not enabled",
      options: {
        orderId: buildPaymateOrderId("long"),
        referenceCode: "",
        paymentMode: "NetBanking",
        paymentType: "Banking",
        invoiceAmount: 100,
      },
    },
  ];

  const results: Record<string, unknown>[] = [];
  for (const spec of specs) {
    try {
      const payload =
        spec.rawPayload ??
        buildCollectPaymentsPayload(spec.options ?? { orderId: buildPaymateOrderId("long") });
      const collection = (payload as { CollectionDetails: Record<string, unknown>[] })
        .CollectionDetails[0];
      const tx = collection.TransactionDetails as Record<string, string>;
      const inv = collection.INVOICE as Record<string, string>;
      const pm = collection.PaymentMethod as Record<string, string>;
      const result = await postPaymateVariant(
        config,
        baseHeaders,
        payload,
        spec.endpoint
      );
      results.push({
        id: spec.id,
        hypothesis: spec.hypothesis,
        doc_ref: spec.doc_ref,
        reference_code: tx.ReferenceCode,
        payment_mode: pm.PaymentMode,
        payment_type: pm.PaymentType,
        invoice_amount: inv.InvoiceAmount,
        ...result,
      });
    } catch (err) {
      results.push({
        id: spec.id,
        hypothesis: spec.hypothesis,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

function analyzeRootCauses(
  combinationResults: Record<string, unknown>[],
  primaryStatus: string | null | undefined
) {
  const causes: string[] = [];
  const all178 = combinationResults.every((r) => r.status_code === "178" || r.error);
  const upiResults = combinationResults.filter((r) => r.payment_mode === "UPI");
  const nonUpiResults = combinationResults.filter((r) => r.payment_mode !== "UPI");
  const nonUpiSuccess = nonUpiResults.some((r) => r.success);
  const upiAnySuccess = upiResults.some((r) => r.success);

  if (primaryStatus === "105") {
    causes.push("CONFIRMED: IP whitelist or invalid source (105) — not a JSON format issue.");
  } else if (all178) {
    causes.push(
      "LIKELY: Terminal YJFW000003 / Merchant 5F59A14F... does not accept these payment modes (all return 178)."
    );
    causes.push("PayMate must enable UPI Intent on Terminal 14926628...7099.");
  }

  if (nonUpiSuccess && !upiAnySuccess) {
    causes.push(
      "CONFIRMED: Terminal accepts other payment modes but NOT UPI — UPI Intent must be enabled by PayMate."
    );
  } else if (!nonUpiSuccess && all178) {
    causes.push(
      "LIKELY: Terminal configuration issue — even DebitCard/NetBanking return 178 (wrong terminal or merchant setup)."
    );
  }

  const blankRef = combinationResults.find((r) => r.id === "baseline_blank_ref_android");
  const treviqoRef = combinationResults.find((r) => r.id === "ref_treviqo01");
  const v1Blank = combinationResults.find((r) => r.id === "intent_v1_android_blank");
  const v1Treviqo = combinationResults.find((r) => r.id === "intent_v1_treviqo01");
  if (blankRef?.status_code === treviqoRef?.status_code) {
    causes.push("REJECTED: ReferenceCode blank vs TREVIQO01 on v2 — same status code.");
  } else if (blankRef?.success || treviqoRef?.success) {
    causes.push("CONFIRMED: ReferenceCode value matters on v2 — one variant succeeded.");
  }
  if (v1Blank && v1Treviqo) {
    if (v1Blank.status_code === "178" && String(v1Blank.description || "").includes("ReferenceCode")) {
      causes.push("CONFIRMED: v1 rejects blank ReferenceCode — use registered ref (e.g. TREVIQO01).");
    }
    if (v1Treviqo?.success) {
      causes.push("CONFIRMED: v1 + TREVIQO01 works — set PAYMATE_API_VERSION=v1 and PAYMATE_REFERENCE_CODE=TREVIQO01.");
    } else if (v1Treviqo?.status_code !== v1Blank?.status_code) {
      causes.push(
        `v1 ref TREVIQO01 changed response: ${v1Blank?.status_code}/${v1Blank?.description} → ${v1Treviqo?.status_code}/${v1Treviqo?.description}`
      );
    }
  }

  const v1Winner = combinationResults.find(
    (r) => r.success && String(r.endpoint || "").includes("/api/v1/")
  );
  const v2Winner = combinationResults.find(
    (r) => r.success && String(r.endpoint || "").includes("/api/v2/")
  );
  const checkoutWinner = combinationResults.find(
    (r) =>
      r.success &&
      ["VPA", "QRCode", "VPA/QRCode"].includes(String(r.payment_type))
  );
  const intentWinner = combinationResults.find(
    (r) => r.success && String(r.payment_type) === "Intent"
  );

  if (v1Winner && !v2Winner) {
    causes.push("CONFIRMED: v1 endpoint works but v2 fails — use api/v1/CollectPayments for Intent.");
  } else if (v2Winner && !v1Winner) {
    causes.push("CONFIRMED: v2 endpoint works — keep api/v2/CollectPayments.");
  } else if (v1Winner && v2Winner) {
    causes.push("Both v1 and v2 return success — compare payment_url_scheme (upi vs https).");
  }

  if (checkoutWinner && !intentWinner) {
    causes.push(
      "CONFIRMED: Checkout doc flow wins (VPA/QRCode on v2) — switch production to hosted checkout PaymentType."
    );
  } else if (intentWinner && !checkoutWinner) {
    causes.push("CONFIRMED: UPI Intent flow wins — keep PaymentType Intent + DeviceOS/TargetApp.");
  }

  causes.push(
    "REJECTED: JSON extra spaces — has_extra_spaces is false.",
    "REJECTED: Blank ContactXpressID/InvoiceTerm/GST fields — match working merchant empty strings.",
    "Compare working_merchant_diff in response for any remaining field mismatches."
  );

  return causes;
}

async function runPaymateCallReport(
  config: ReturnType<typeof getPaymateConfig>,
  baseHeaders: Record<string, string>,
  orderId: string,
  referenceCode: string,
  endpointUrl: string,
  label: string
) {
  const payload = buildSamplePayload(orderId, referenceCode);
  const encryptedBody = encryptRequest(payload, config.paymatePublicCert, config.iv);
  const jsonBody = JSON.stringify(encryptedBody);
  const t0 = Date.now();
  const r = await fetch(endpointUrl, {
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
    label,
    duration_ms: Date.now() - t0,
    request: {
      method: "POST",
      url: endpointUrl,
      headers: baseHeaders,
      body: encryptedBody,
      plain_text_payload: payload,
      reference_code: referenceCode,
    },
    response: {
      http_status: r.status,
      body,
      parsed: analyzed.parsed,
    },
    sample_order_id: orderId,
    status_code: analyzed.status_code,
    description: analyzed.description || null,
    payment_url: analyzed.payment_url || null,
    payment_url_scheme: paymentUrlScheme(analyzed.payment_url),
    success: Boolean(analyzed.success),
  };
}

function paymentUrlScheme(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("upi://")) return "upi";
  if (url.startsWith("http://") || url.startsWith("https://")) return "https";
  return "other";
}

async function postPaymateVariant(
  config: ReturnType<typeof getPaymateConfig>,
  baseHeaders: Record<string, string>,
  variantPayload: object,
  endpointUrl?: string
) {
  const url = endpointUrl || config.endpoint;
  const encryptedBody = encryptRequest(variantPayload, config.paymatePublicCert, config.iv);
  const jsonBody = JSON.stringify(encryptedBody);
  const t0 = Date.now();
  const r = await fetch(url, {
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
    endpoint: url,
    duration_ms: Date.now() - t0,
    http_status: r.status,
    plain_text_payload: variantPayload,
    parsed_response: analyzed.parsed,
    status_code: analyzed.status_code,
    description: analyzed.description,
    payment_url: analyzed.payment_url,
    payment_url_scheme: paymentUrlScheme(analyzed.payment_url),
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
      endpoint_v1: config.endpointV1,
      endpoint_v2: config.endpointV2,
      api_version: config.apiVersion,
      paymate_api_version_env: process.env.PAYMATE_API_VERSION || null,
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

    const orderId = buildPaymateOrderId("long");
    const payload = buildSamplePayload(orderId, "");
    const plainJsonString = JSON.stringify(payload);
    const encryptedBody = encryptRequest(payload, config.paymatePublicCert, config.iv);
    const jsonBody = JSON.stringify(encryptedBody);

    report.plain_json_string = plainJsonString;
    report.plain_json_length = plainJsonString.length;
    report.has_extra_spaces = /  /.test(plainJsonString) || /\t/.test(plainJsonString);
    report.working_merchant_diff = diffAgainstWorkingMerchant(payload);
    report.sample_comparison = {
      working_merchant_reference: {
        ReceipentMobileNo: "9898989898",
        RecipentEmailAddress: "filled",
        ReferenceCode: "RF191925 (other merchant)",
        UDF1_UDF2: "empty arrays",
        InvoiceNumber: "INV + OrderID",
        InvoiceStartDate: "YYYY-MM-DD",
        InvoiceAmount: "4.00 (two decimals)",
        DeviceOS: "ANDROID",
        CompanyName: "Rakesh Kumar",
      },
      ours_now: {
        ReceipentMobileNo: "9898989898",
        ReceipentEmailAddress: "xyz@yahoo.com",
        UDF1_UDF2: "empty arrays",
        InvoiceNumber: `INV${orderId}`,
        InvoiceStartDate: getPaymateInvoiceDate(),
        InvoiceAmount: formatPaymateAmount(100),
        DeviceOS: "ANDROID",
        CompanyName: "Rahul Kumar",
      },
    };
    report.env_whitespace_audit = {
      merchant_id_has_whitespace: (process.env.PAYMATE_MERCHANT_ID || "") !== (process.env.PAYMATE_MERCHANT_ID || "").trim(),
      terminal_id_has_whitespace: (process.env.PAYMATE_TERMINAL_ID || "") !== (process.env.PAYMATE_TERMINAL_ID || "").trim(),
      business_xpress_id_has_whitespace: (process.env.PAYMATE_BUSINESS_XPRESS_ID || "") !== (process.env.PAYMATE_BUSINESS_XPRESS_ID || "").trim(),
      reference_code_has_whitespace: (process.env.PAYMATE_REFERENCE_CODE || "") !== (process.env.PAYMATE_REFERENCE_CODE || "").trim(),
      reference_code_used: config.referenceCode,
    };

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

    report.blank_fields_audit = {
      explanation:
        "Blank fields = empty string \"\" in JSON (ContactXpressID, InvoiceTerm, GSTType, GST). ReferenceCode blank for Treviqo.",
      working_merchant_blank_fields: PAYMATE_BLANK_FIELDS,
      ours_now: PAYMATE_BLANK_FIELDS,
      reference_code_in_request: "",
      reference_code_is_blank: true,
    };

    report.combination_tests = await runCombinationTests(config, baseHeaders);
    report.root_cause_analysis = analyzeRootCauses(
      report.combination_tests as Record<string, unknown>[],
      (report.combination_tests as Record<string, unknown>[]).find((r) => r.id === "baseline_blank_ref_android")?.status_code as string
    );

    const comboWinner = (report.combination_tests as Record<string, unknown>[]).find((r) => r.success);
    if (comboWinner) {
      report.combination_winner = {
        id: comboWinner.id,
        payment_mode: comboWinner.payment_mode,
        payment_type: comboWinner.payment_type,
        endpoint: comboWinner.endpoint,
        payment_url: comboWinner.payment_url,
        payment_url_scheme: comboWinner.payment_url_scheme,
      };
    }

    const docVariantIds = [
      "paymate_antara_v2_exact",
      "checkout_upi_vpa_v2",
      "checkout_upi_qrcode_v2",
      "checkout_upi_vpa_slash_qrcode_v2",
      "checkout_credit_card_v2",
      "intent_v1_android_blank",
      "intent_v1_treviqo01",
      "intent_v1_env_ref",
      "checkout_upi_vpa_v1_treviqo01",
      "intent_v2_android",
    ];
    report.doc_variant_tests = (report.combination_tests as Record<string, unknown>[]).filter(
      (r) => docVariantIds.includes(String(r.id))
    );

    report.blank_field_tests = (report.combination_tests as Record<string, unknown>[]).filter((r) =>
      ["invoice_term_space", "ref_treviqo01"].includes(String(r.id))
    );

    report.upi_payment_variations = (report.combination_tests as Record<string, unknown>[]).filter(
      (r) => r.payment_mode === "UPI"
    );
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

    const v1OrderId = buildPaymateOrderId("long");
    const paymateCallV1Ref = await runPaymateCallReport(
      config,
      baseHeaders,
      v1OrderId,
      config.referenceCode || "TREVIQO01",
      config.endpointV1,
      "v1 + ReferenceCode (UPI Intent doc flow)"
    );
    report.paymate_call_v1_ref = paymateCallV1Ref;

    const antaraOrderId = "Ordupi20260304777259";
    const antaraPayload = buildPaymateAntaraV2SamplePayload(antaraOrderId);
    const antaraEncrypted = encryptRequest(antaraPayload, config.paymatePublicCert, config.iv);
    const antaraT0 = Date.now();
    const antaraRes = await fetch(config.endpointV2, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(antaraEncrypted),
      signal: AbortSignal.timeout(10000),
    });
    const antaraTxt = await antaraRes.text();
    let antaraBody: Record<string, unknown>;
    try {
      antaraBody = JSON.parse(antaraTxt) as Record<string, unknown>;
    } catch {
      antaraBody = { raw_preview: antaraTxt.slice(0, 300) };
    }
    const antaraAnalyzed = analyzePaymateBody(antaraBody, config);
    report.paymate_call_antara_v2_exact = {
      label: "v2 + PayMate Antara exact sample",
      duration_ms: Date.now() - antaraT0,
      request: {
        method: "POST",
        url: config.endpointV2,
        headers: baseHeaders,
        body: antaraEncrypted,
        plain_text_payload: antaraPayload,
      },
      response: {
        http_status: antaraRes.status,
        body: antaraBody,
        parsed: antaraAnalyzed.parsed,
      },
      sample_order_id: antaraOrderId,
      status_code: antaraAnalyzed.status_code,
      description: antaraAnalyzed.description || null,
      payment_url: antaraAnalyzed.payment_url || null,
      payment_url_scheme: paymentUrlScheme(antaraAnalyzed.payment_url),
      success: Boolean(antaraAnalyzed.success),
    };

    report.recommended_try = {
      endpoint: config.endpointV1,
      reference_code: config.referenceCode || "TREVIQO01",
      env: "PAYMATE_API_VERSION=v1 and PAYMATE_REFERENCE_CODE=TREVIQO01",
      status_code: paymateCallV1Ref.status_code,
      description: paymateCallV1Ref.description,
      success: paymateCallV1Ref.success,
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
        const winner = report.combination_winner as Record<string, unknown> | undefined;
        if (winner) {
          interpretation.push(
            `Combination test ${winner.id} succeeded with PaymentMode=${winner.payment_mode}.`
          );
        } else {
          interpretation.push(
            `PayMate still returns 178 Invalid Payment Mode for UPI. Confirm UPI Intent is enabled for merchant ${config.businessXpressId} / Terminal ${maskId(config.terminalId)}.`
          );
        }
        const parsed = primaryResult.parsed_response as Record<string, unknown> | undefined;
        const detailed = parsed?.DetailedSummary as Record<string, unknown>[] | undefined;
        interpretation.push(
          `Detail: ${detailed?.[0]?.StatusMessage || primaryResult.description}`
        );
        const comboSummary = (report.combination_tests as Record<string, unknown>[])
          .map((v) => `${v.id}=${v.status_code || "err"}`)
          .join(", ");
        if (comboSummary) {
          interpretation.push(`Combination tests: ${comboSummary}`);
        }
        interpretation.push(...(report.root_cause_analysis as string[]));
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

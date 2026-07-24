import crypto from "crypto";

const KEY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateRandomKey(length = 32): string {
  const bytes = crypto.randomBytes(length);
  let key = "";
  for (let i = 0; i < length; i += 1) {
    key += KEY_CHARS[bytes[i] % KEY_CHARS.length];
  }
  return key;
}

function getIvBuffer(ivValue: string): Buffer {
  const iv = Buffer.from(ivValue, "utf8");
  if (iv.length !== 16) {
    throw new Error("PayMate IV must be exactly 16 bytes");
  }
  return iv;
}

export function encryptRequest(
  plainObject: object,
  paymatePublicCertPem: string,
  ivValue: string
): { EncryptedRandomKey: string; EncryptedData: string } {
  const iv = getIvBuffer(ivValue);
  const randomKey = generateRandomKey(32);
  const plainJson = JSON.stringify(plainObject);

  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(randomKey, "utf8"), iv);
  const encrypted = Buffer.concat([cipher.update(plainJson, "utf8"), cipher.final()]);
  const encryptedData = encrypted.toString("hex").toUpperCase();

  const encryptedRandomKey = crypto
    .publicEncrypt(
      {
        key: paymatePublicCertPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(randomKey, "utf8")
    )
    .toString("base64");

  return { EncryptedRandomKey: encryptedRandomKey, EncryptedData: encryptedData };
}

function normalizeEncryptedFields(body: Record<string, unknown>) {
  if (!body || typeof body !== "object") {
    return { EncryptedRandomKey: null, EncryptedData: null };
  }

  const entries = Object.entries(body);
  const find = (name: string) => {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match ? match[1] : null;
  };

  return {
    EncryptedRandomKey: find("EncryptedRandomKey") as string | null,
    EncryptedData: find("EncryptedData") as string | null,
  };
}

export function decryptPayload(
  body: Record<string, unknown>,
  partnerPrivateKeyPem: string,
  ivValue: string
): Record<string, unknown> | null {
  const { EncryptedRandomKey, EncryptedData } = normalizeEncryptedFields(body);
  if (!EncryptedRandomKey || !EncryptedData) {
    return null;
  }

  const iv = getIvBuffer(ivValue);
  const randomKey = crypto
    .privateDecrypt(
      {
        key: partnerPrivateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(EncryptedRandomKey, "base64")
    )
    .toString("utf8");

  const encryptedBuffer = Buffer.from(EncryptedData, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(randomKey, "utf8"), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as Record<string, unknown>;
}

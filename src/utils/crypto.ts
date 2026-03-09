import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const CIPHERTEXT_PREFIX = "enc:v1";

let cachedKey: Buffer | undefined;

export function fingerprintSecret(secret: string): string {
  return createHmac("sha256", getEncryptionKey()).update(secret, "utf8").digest("hex").slice(0, 16);
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    CIPHERTEXT_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(`${CIPHERTEXT_PREFIX}:`)) {
    // Backward-compatible read path for legacy base64-only records.
    return Buffer.from(ciphertext, "base64").toString("utf8");
  }

  const [, , ivBase64, authTagBase64, payloadBase64] = ciphertext.split(":");
  if (!ivBase64 || !authTagBase64 || !payloadBase64) {
    throw new Error("Stored secret has an invalid encrypted payload format.");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const payload = Buffer.from(payloadBase64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Stored secret has an invalid IV length.");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Stored secret has an invalid auth tag length.");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const raw = process.env.AI_GATEWAY_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "AI_GATEWAY_ENCRYPTION_KEY is required. Set a high-entropy secret before using stored provider credentials."
    );
  }

  cachedKey = normalizeKey(raw);
  return cachedKey;
}

function normalizeKey(raw: string): Buffer {
  const trimmed = raw.trim();

  if (trimmed.startsWith("base64:")) {
    const decoded = Buffer.from(trimmed.slice("base64:".length), "base64");
    if (decoded.length !== 32) {
      throw new Error("AI_GATEWAY_ENCRYPTION_KEY with base64: prefix must decode to exactly 32 bytes.");
    }
    return decoded;
  }

  return createHash("sha256").update(trimmed, "utf8").digest();
}

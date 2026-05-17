import "server-only";

import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function getKey() {
  const secret = process.env.ADMIN_DATA_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(PREFIX);
}

export function encryptSecret(value: string) {
  if (!value || isEncryptedSecret(value)) return value;
  const key = getKey();
  if (!key) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString("base64url"),
    ".",
    tag.toString("base64url"),
    ".",
    encrypted.toString("base64url")
  ].join("");
}

export function decryptSecret(value: string) {
  if (!value || !isEncryptedSecret(value)) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const payload = value.slice(PREFIX.length);
    const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
    if (!ivRaw || !tagRaw || !encryptedRaw) return value;

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64url")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return value;
  }
}

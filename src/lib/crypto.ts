import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY não configurada");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY deve ter 32 bytes em base64");
  return buf;
}

/** AES-256-GCM: iv(12) | tag(16) | dados, em base64. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** Hash determinístico (HMAC) para buscar por CPF sem armazená-lo em claro. */
export function blindIndex(value: string): string {
  return createHmac("sha256", key()).update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

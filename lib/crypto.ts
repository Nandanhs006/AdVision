import crypto from "crypto";

const DEFAULT_DEV_KEY = "advision_dev_meta_token_encryption_key_32b!";

function getKey(customKey?: string): Buffer {
  const rawKey = customKey || process.env.TOKEN_ENCRYPTION_KEY || DEFAULT_DEV_KEY;
  // Always derive a clean 32-byte (256-bit) key via SHA-256
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: ivHex:authTagHex:encryptedHex
 */
export function encryptToken(plaintext: string, customKey?: string): string {
  const key = getKey(customKey);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Expects format: ivHex:authTagHex:encryptedHex
 */
export function decryptToken(encryptedPayload: string, customKey?: string): string {
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token payload format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey(customKey);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

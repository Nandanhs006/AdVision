import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../lib/crypto";

describe("Token Encryption", () => {
  it("should encrypt and decrypt tokens correctly (round-trip)", () => {
    const rawToken = "EAAGm0PX4ZCpsBA...meta_long_lived_user_access_token_secret_12345";
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:cipher

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("should fail decryption when payload is tampered with", () => {
    const rawToken = "super_secret_token";
    const encrypted = encryptToken(rawToken);
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("should fail decryption with incorrect format", () => {
    expect(() => decryptToken("invalid-payload")).toThrow();
  });

  it("should support custom encryption keys", () => {
    const rawToken = "custom_key_token";
    const customKey = "my_custom_production_key_12345678";
    const encrypted = encryptToken(rawToken, customKey);
    const decrypted = decryptToken(encrypted, customKey);

    expect(decrypted).toBe(rawToken);

    // Fails with a different key
    expect(() => decryptToken(encrypted, "wrong_key_1234567890")).toThrow();
  });
});

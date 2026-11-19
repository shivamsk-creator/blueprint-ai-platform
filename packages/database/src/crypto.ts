import crypto from "node:crypto";
import { DomainError } from "@blueprint/domain";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export interface SecretKeyring {
  activeVersion: string;
  keys: Map<string, Buffer>;
}

function decodeKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const b64 = Buffer.from(trimmed, "base64");
  if (b64.length === KEY_BYTES) {
    return b64;
  }
  // Deterministic 32-byte derivation for non-standard dev keys (never recommended for prod)
  return crypto.createHash("sha256").update(trimmed, "utf8").digest();
}

export function buildKeyringFromEnv(env: Record<string, string | undefined> = process.env): SecretKeyring {
  const activeVersion = env.AI_SECRETS_KEY_VERSION?.trim() || "v1";
  const primaryRaw = env.AI_SECRETS_ENCRYPTION_KEY?.trim();
  const keys = new Map<string, Buffer>();

  if (primaryRaw) {
    keys.set(activeVersion, decodeKeyMaterial(primaryRaw));
  } else if (env.NODE_ENV !== "production" || env.BLUEPRINT_DEMO_MODE === "true") {
    // Deterministic dev/demo fallback key (strictly blocked in non-demo production)
    keys.set(activeVersion, crypto.createHash("sha256").update("blueprint-ai-dev-only-key").digest());
  } else {
    throw new DomainError({
      status: 500,
      code: "MISSING_ENCRYPTION_KEY",
      title: "Secret Encryption Misconfigured",
      detail: "AI_SECRETS_ENCRYPTION_KEY must be set in production.",
    });
  }

  const legacy = env.AI_SECRETS_LEGACY_KEYS?.trim();
  if (legacy) {
    for (const pair of legacy.split(",")) {
      const idx = pair.indexOf(":");
      if (idx > 0) {
        const ver = pair.slice(0, idx).trim();
        const keyMaterial = pair.slice(idx + 1).trim();
        if (ver && keyMaterial) {
          keys.set(ver, decodeKeyMaterial(keyMaterial));
        }
      }
    }
  }

  return { activeVersion, keys };
}

export function encryptSecret(plaintext: string, keyring: SecretKeyring = buildKeyringFromEnv()): {
  ciphertext: string;
  keyVersion: string;
} {
  const key = keyring.keys.get(keyring.activeVersion);
  if (!key) {
    throw new DomainError({
      status: 500,
      code: "MISSING_ACTIVE_KEY",
      title: "Encryption Key Missing",
      detail: `Active encryption key version "${keyring.activeVersion}" is unavailable.`,
    });
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const envelope = `enc:${keyring.activeVersion}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  return { ciphertext: envelope, keyVersion: keyring.activeVersion };
}

export function decryptSecret(envelope: string, keyring: SecretKeyring = buildKeyringFromEnv()): string {
  const parts = envelope.split(":");
  if (parts.length !== 5 || parts[0] !== "enc") {
    throw new DomainError({
      status: 500,
      code: "INVALID_SECRET_ENVELOPE",
      title: "Corrupted Secret Envelope",
      detail: "Encrypted credential format is invalid.",
    });
  }
  const [, keyVersion, ivB64, tagB64, dataB64] = parts;
  const key = keyVersion ? keyring.keys.get(keyVersion) : undefined;
  if (!key || !ivB64 || !tagB64 || !dataB64) {
    throw new DomainError({
      status: 500,
      code: "UNKNOWN_KEY_VERSION",
      title: "Encryption Key Not Found",
      detail: `Unable to decrypt secret for key version "${keyVersion ?? "unknown"}".`,
    });
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|secret|token|password|authorization|ciphertext|cookie|credential)/i;

export function redactSensitiveData<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value
      .replace(/(sk-[A-Za-z0-9_-]{8,})/g, "[REDACTED_KEY]")
      .replace(/(AIza[0-9A-Za-z_-]{16,})/g, "[REDACTED_KEY]")
      .replace(/(Bearer\s+[A-Za-z0-9._-]{8,})/gi, "Bearer [REDACTED]") as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? "[REDACTED]" : redactSensitiveData(v);
    }
    return out as T;
  }
  return value;
}

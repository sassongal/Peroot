import crypto from "node:crypto";

const PAYLOAD_PREFIX = "v1:";

function secret(): string | undefined {
  const s = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim();
  return s || undefined;
}

/** HMAC-SHA256 hex for newsletter one-click unsubscribe links. */
export function signNewsletterUnsubscribeEmail(email: string): string {
  const key = secret();
  if (!key) return "";
  const normalized = email.trim().toLowerCase();
  return crypto.createHmac("sha256", key).update(`${PAYLOAD_PREFIX}${normalized}`).digest("hex");
}

export function verifyNewsletterUnsubscribeSignature(
  email: string,
  signatureHex: string
): boolean {
  const key = secret();
  if (!key || !signatureHex) return false;
  const expected = signNewsletterUnsubscribeEmail(email);
  if (!expected) return false;
  try {
    const a = Buffer.from(signatureHex, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Full unsubscribe URL for newsletter broadcast templates (requires secret env). */
export function buildNewsletterUnsubscribeUrl(baseUrl: string, email: string): string {
  const sig = signNewsletterUnsubscribeEmail(email);
  if (!sig) {
    throw new Error("NEWSLETTER_UNSUBSCRIBE_SECRET is not configured");
  }
  const root = baseUrl.replace(/\/$/, "");
  const u = new URL("/api/email/unsubscribe", root);
  u.searchParams.set("email", email.trim().toLowerCase());
  u.searchParams.set("sig", sig);
  return u.toString();
}

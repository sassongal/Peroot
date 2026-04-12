import crypto from "node:crypto";

/**
 * Verifies a LemonSqueezy HMAC-SHA256 webhook signature using timing-safe comparison.
 * Pure function — no side effects.
 *
 * @returns true if the signature matches the secret-signed body
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(signatureHeader, "utf8");
  return digest.length === signature.length && crypto.timingSafeEqual(digest, signature);
}

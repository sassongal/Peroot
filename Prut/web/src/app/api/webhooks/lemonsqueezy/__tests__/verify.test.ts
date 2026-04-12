import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "../lib/verify";

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const secret = "test-secret-abc123";
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });

  it("returns true for a valid signature", () => {
    const sig = makeSignature(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for a tampered body", () => {
    const sig = makeSignature(body, secret);
    const tamperedBody = body + " ";
    expect(verifyWebhookSignature(tamperedBody, sig, secret)).toBe(false);
  });

  it("returns false for a wrong secret", () => {
    const sig = makeSignature(body, "wrong-secret");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it("returns false for an empty signature", () => {
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });

  it("returns false for a truncated signature", () => {
    const sig = makeSignature(body, secret).slice(0, 10);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  it("is consistent across multiple calls (deterministic)", () => {
    const sig = makeSignature(body, secret);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
  });
});

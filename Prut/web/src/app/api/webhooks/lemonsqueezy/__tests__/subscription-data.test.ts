import { describe, it, expect } from "vitest";
import {
  buildSubscriptionData,
  isActivePro,
  type LsEvent,
} from "../lib/subscription-data";

const baseEvent: LsEvent = {
  meta: { event_name: "subscription_created", custom_data: { user_id: "user-123" } },
  data: {
    id: "sub-456",
    attributes: {
      customer_id: 99,
      variant_id: 12,
      status: "active",
      product_name: "Peroot Pro",
      user_email: "test@example.com",
      user_name: "Test User",
      renews_at: "2026-05-12T00:00:00Z",
      ends_at: null,
      trial_ends_at: null,
    },
  },
};

describe("buildSubscriptionData", () => {
  it("maps all fields from the event attributes", () => {
    const result = buildSubscriptionData(baseEvent, "user-123");

    expect(result.user_id).toBe("user-123");
    expect(result.lemonsqueezy_subscription_id).toBe("sub-456");
    expect(result.lemonsqueezy_customer_id).toBe("99"); // coerced to string
    expect(result.status).toBe("active");
    expect(result.plan_name).toBe("Peroot Pro");
    expect(result.customer_email).toBe("test@example.com");
    expect(result.customer_name).toBe("Test User");
    expect(result.renews_at).toBe("2026-05-12T00:00:00Z");
    expect(result.ends_at).toBeNull();
    expect(result.trial_ends_at).toBeNull();
  });

  it("falls back to 'Pro' when product_name is missing", () => {
    const event: LsEvent = {
      ...baseEvent,
      data: {
        ...baseEvent.data!,
        attributes: { ...baseEvent.data!.attributes, product_name: null },
      },
    };
    expect(buildSubscriptionData(event, "user-123").plan_name).toBe("Pro");
  });

  it("coerces numeric customer_id to string", () => {
    const result = buildSubscriptionData(baseEvent, "user-123");
    expect(typeof result.lemonsqueezy_customer_id).toBe("string");
  });

  it("sets updated_at to a recent ISO timestamp", () => {
    const before = Date.now();
    const result = buildSubscriptionData(baseEvent, "user-123");
    const after = Date.now();
    const ts = new Date(result.updated_at).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("isActivePro", () => {
  it.each(["active", "on_trial", "past_due", "paid"])(
    "returns true for '%s'",
    (status) => {
      expect(isActivePro(status)).toBe(true);
    },
  );

  it.each(["cancelled", "expired", "paused", "unpaid", ""])(
    "returns false for '%s'",
    (status) => {
      expect(isActivePro(status)).toBe(false);
    },
  );
});

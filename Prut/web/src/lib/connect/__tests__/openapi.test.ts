import { describe, it, expect } from "vitest";
import { CONNECT_OPENAPI } from "@/lib/connect/openapi";

/**
 * Contract sanity — the spec is the single source of truth (/api/v1/openapi +
 * /connect/docs render from it), so it must cover every implemented endpoint
 * and the behaviors the routes actually have.
 */
describe("Connect OpenAPI contract", () => {
  const paths = CONNECT_OPENAPI.paths as Record<string, Record<string, unknown>>;

  it("covers every implemented v1 endpoint", () => {
    const expected: Array<[string, string]> = [
      ["/enhance", "post"],
      ["/quota", "get"],
      ["/prompts", "get"],
      ["/prompts", "post"],
      ["/prompts/search", "get"],
      ["/prompts/{id}", "get"],
      ["/library/search", "get"],
      ["/templates/fill", "post"],
      ["/user/memory", "get"],
      ["/user/memory", "post"],
      ["/feedback", "post"],
    ];
    for (const [path, method] of expected) {
      expect(paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });

  it("documents the enhance hardening: Idempotency-Key, context, 504 timeout", () => {
    const enhance = (paths["/enhance"] as Record<string, unknown>).post as {
      parameters: Array<{ name: string }>;
      requestBody: { content: Record<string, { schema: { $ref: string } }> };
      responses: Record<string, unknown>;
    };
    expect(enhance.parameters.some((p) => p.name === "Idempotency-Key")).toBe(true);
    expect(enhance.responses["504"]).toBeDefined();
    expect(enhance.responses["402"]).toBeDefined();

    const reqSchema = (
      CONNECT_OPENAPI.components.schemas.EnhanceRequest as unknown as {
        properties: Record<string, unknown>;
      }
    ).properties;
    expect(reqSchema.context).toBeDefined();
    expect(reqSchema.target_model).toBeDefined();
    expect(reqSchema.model_profile_slug).toBeDefined();
  });

  it("error code enum matches the runtime error model", () => {
    const codes = (
      CONNECT_OPENAPI.components.schemas.Error as unknown as {
        properties: { code: { enum: string[] } };
      }
    ).properties.code.enum;
    for (const c of [
      "invalid_key",
      "no_credits",
      "rate_limited",
      "invalid_request",
      "timeout",
      "not_found",
      "internal_error",
    ]) {
      expect(codes).toContain(c);
    }
  });
});

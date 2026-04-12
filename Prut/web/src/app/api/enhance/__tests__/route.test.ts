import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock factories -- declared before vi.mock so hoisted references work
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

/**
 * Builds a chainable Supabase query builder that resolves to `resolveValue`.
 * Every chained method returns the same builder so `.select().eq().limit()`
 * etc. all work. The builder is "thenable" so `await builder` resolves to
 * the configured return value.
 */
function mockQueryBuilder(
  resolveValue: { data: unknown; error?: unknown; count?: number } = { data: null },
) {
  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select", "eq", "in", "order", "limit", "not",
    "insert", "update", "maybeSingle", "single",
  ];
  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  // Make the builder thenable so `await` resolves it directly
  builder.then = (resolve: (v: unknown) => void) => {
    resolve(resolveValue);
    // Must return a real Promise so chained .then/.catch work
    return Promise.resolve(resolveValue);
  };
  return builder;
}

// ---------------------------------------------------------------------------
// Mocks -- vi.mock calls are hoisted to the top of the file by Vitest.
// The factory functions close over the `vi.fn()` variables declared above.
// ---------------------------------------------------------------------------

// Supabase server client (user-scoped, cookie-based)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  })),
}));

// Supabase service client (admin / bypass RLS)
const mockServiceFrom = vi.fn();
const mockServiceRpc = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
    rpc: (...args: unknown[]) => mockServiceRpc(...args),
  })),
}));

// AI Gateway
const mockGenerateStream = vi.fn();
vi.mock("@/lib/ai/gateway", () => ({
  AIGateway: {
    generateStream: (...args: unknown[]) => mockGenerateStream(...args),
  },
}));

// Concurrency -- the class must be defined inline (not referencing outer
// variables) because vi.mock factories are hoisted above variable declarations.
vi.mock("@/lib/ai/concurrency", () => {
  class ConcurrencyError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConcurrencyError";
    }
  }
  return { ConcurrencyError };
});

// Credit service
const mockCheckAndDecrementCredits = vi.fn();
const mockRefundCredit = vi.fn();
vi.mock("@/lib/services/credit-service", () => ({
  checkAndDecrementCredits: (...args: unknown[]) =>
    mockCheckAndDecrementCredits(...args),
  refundCredit: (...args: unknown[]) => mockRefundCredit(...args),
}));

// Rate limiting
const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// API key validation
const mockValidateApiKey = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
}));

// Background jobs
const mockEnqueueJob = vi.fn();
vi.mock("@/lib/jobs/queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

// API usage tracking
const mockTrackApiUsage = vi.fn();
vi.mock("@/lib/admin/track-api-usage", () => ({
  trackApiUsage: (...args: unknown[]) => mockTrackApiUsage(...args),
}));

// Mock `after()` from next/server so side-effect assertions still fire.
// In production `after()` defers the callback until the response has
// finished streaming; in the unit-test environment there is no request
// context and calling the real export throws. We replace it with an
// immediate executor so tests exercise the same side-effect code path.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (fn: () => unknown | Promise<unknown>) => {
      void Promise.resolve().then(fn);
    },
  };
});

// Inflight-lock mock — default is "always acquire, noop release". Tests
// that want to exercise the duplicate-in-flight 409 path can override
// via vi.mocked(acquireInflightLock).mockResolvedValueOnce(...).
const mockAcquireInflightLock = vi.fn(async (input?: unknown) => {
  void input;
  return {
    acquired: true,
    key: null as string | null,
    release: async () => {},
  };
});
vi.mock("@/lib/ai/inflight-lock", () => ({
  acquireInflightLock: (input: unknown) => mockAcquireInflightLock(input),
}));

// Enhance result cache — controllable per-test
const mockBuildCacheKey = vi.fn();
const mockGetCached = vi.fn();
const mockSetCached = vi.fn();
vi.mock("@/lib/ai/enhance-cache", () => ({
  buildCacheKey: (...args: unknown[]) => mockBuildCacheKey(...args),
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
  ENGINE_VERSION: "test-engine-version",
}));

// Logger -- silent in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Engines -- return a deterministic mock engine
const mockGenerate = vi.fn().mockReturnValue({
  systemPrompt: "mock system",
  userPrompt: "mock user",
  outputFormat: "text",
  requiredFields: [],
});
const mockGenerateRefinement = vi.fn().mockReturnValue({
  systemPrompt: "mock refine system",
  userPrompt: "mock refine user",
  outputFormat: "text",
  requiredFields: [],
});
vi.mock("@/lib/engines", () => ({
  getEngine: vi.fn(async () => ({
    generate: (...args: unknown[]) => mockGenerate(...args),
    generateRefinement: (...args: unknown[]) =>
      mockGenerateRefinement(...args),
  })),
}));

// Capability mode -- use the real implementation (enum + parser)
vi.mock("@/lib/capability-mode", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/capability-mode")
  >("@/lib/capability-mode");
  return actual;
});

// ---------------------------------------------------------------------------
// Static import of the route handler -- mocks are already in place (hoisted)
// ---------------------------------------------------------------------------

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a POST Request with a JSON body and optional extra headers. */
function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/enhance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "127.0.0.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/** Create a POST Request with an invalid (non-JSON) body. */
function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/enhance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "127.0.0.1",
    },
    body: "NOT_JSON{{{",
  });
}

/** A minimal valid request body. */
const VALID_BODY = { prompt: "Improve this prompt for a marketing email" };

/**
 * Generate a unique user ID per call to avoid the in-memory profileCache
 * inside route.ts serving stale tier/admin data across tests.
 */
let userIdCounter = 0;
function nextUserId(): string {
  return `user-test-${++userIdCounter}`;
}

/** Tracks the userId set by the last setupAuthenticatedUser call. */
let lastUserId = "";

/**
 * Configure mocks for an authenticated user (default: free tier with credits).
 * Uses a unique userId each time to bypass the route's in-memory profileCache.
 */
function setupAuthenticatedUser(
  opts: { tier?: string; isAdmin?: boolean; credits?: boolean } = {},
) {
  const { tier = "free", isAdmin = false, credits = true } = opts;
  const userId = nextUserId();
  lastUserId = userId;

  // Auth -- return a user
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
  });

  // Supabase table queries
  const profileBuilder = mockQueryBuilder({ data: { plan_tier: tier } });
  const historyBuilder = mockQueryBuilder({ data: [] });
  const personalityBuilder = mockQueryBuilder({ data: null });
  const adminBuilder = mockQueryBuilder({
    data: isAdmin ? { role: "admin" } : null,
  });

  mockSupabaseFrom.mockImplementation((table: string) => {
    switch (table) {
      case "profiles":
        return profileBuilder;
      case "personal_library":
        return historyBuilder;
      case "user_style_personality":
        return personalityBuilder;
      case "user_roles":
        return adminBuilder;
      case "history":
        return mockQueryBuilder({ data: null });
      case "activity_logs":
        return mockQueryBuilder({ data: null, count: 5 });
      default:
        return mockQueryBuilder({ data: null });
    }
  });

  // Rate limiting -- allow by default
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
  });

  // Credits
  if (credits) {
    mockCheckAndDecrementCredits.mockResolvedValue({
      allowed: true,
      remaining: 4,
    });
  } else {
    mockCheckAndDecrementCredits.mockResolvedValue({
      allowed: false,
      remaining: 0,
      error: "Insufficient credits or profile not found",
    });
  }

  // Background jobs -- no-op
  mockEnqueueJob.mockResolvedValue(undefined);
  mockRefundCredit.mockResolvedValue(undefined);
}

/** Configure mocks for a guest (unauthenticated) user. */
function setupGuestUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockSupabaseFrom.mockReturnValue(mockQueryBuilder({ data: null }));
  mockCheckRateLimit.mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60000,
  });
  mockRefundCredit.mockResolvedValue(undefined);
}

/**
 * Set up AIGateway.generateStream to return a mock streaming result.
 * Returns the mock result object and a getter for the captured onFinish
 * callback (so tests can invoke it to simulate post-stream behaviour).
 */
function setupMockStream() {
  const mockTextStream = new ReadableStream({
    start(controller) {
      controller.enqueue("Enhanced prompt result");
      controller.close();
    },
  });

  const mockResult = {
    toTextStreamResponse: vi.fn().mockReturnValue(
      new Response(mockTextStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    ),
  };

  let capturedOnFinish:
    | ((completion: {
        usage: unknown;
        text: string;
        finishReason?: string;
      }) => Promise<void>)
    | undefined;

  mockGenerateStream.mockImplementation(
    async (params: {
      onFinish?: (c: {
        usage: unknown;
        text: string;
      }) => Promise<void>;
    }) => {
      capturedOnFinish = params.onFinish as typeof capturedOnFinish;
      return { result: mockResult, modelId: "gemini-2.5-flash" };
    },
  );

  return {
    mockResult,
    getOnFinish: () => capturedOnFinish,
  };
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Re-establish the createClient mock so tests that override it
  // (e.g. Bearer token auth) don't pollute subsequent tests.
  (createClient as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  }));

  // Reset mock implementations to safe defaults so leftover
  // mockResolvedValue from a previous test cannot leak.
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockSupabaseFrom.mockReturnValue(mockQueryBuilder({ data: null }));
  mockSupabaseRpc.mockResolvedValue({ data: null, error: null });
  mockServiceFrom.mockReturnValue(mockQueryBuilder({ data: null }));
  mockServiceRpc.mockResolvedValue({ data: null, error: null });
  mockGenerateStream.mockResolvedValue({ result: { toTextStreamResponse: vi.fn() }, modelId: "gemini-2.5-flash" });
  mockCheckAndDecrementCredits.mockResolvedValue({ allowed: true, remaining: 5 });
  mockRefundCredit.mockResolvedValue(undefined);
  mockCheckRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60000 });
  mockValidateApiKey.mockResolvedValue({ valid: false, error: "Not configured" });
  mockEnqueueJob.mockResolvedValue(undefined);
  mockTrackApiUsage.mockReturnValue(undefined);
});

// ===========================================================================
// Tests
// ===========================================================================

describe("POST /api/enhance", () => {
  // -----------------------------------------------------------------------
  // 1. Request validation
  // -----------------------------------------------------------------------
  describe("request validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = makeInvalidJsonRequest();
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/invalid json/i);
    });

    // The route uses RequestSchema.parse() inside the main try block.
    // A Zod validation failure throws a ZodError which is caught by the
    // generic catch block, resulting in a 500.  These tests document the
    // current behaviour.
    it("returns 500 for missing prompt (Zod validation in catch block)", async () => {
      setupGuestUser();
      const req = makeRequest({});
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Internal Server Error");
    });

    it("returns 500 for empty string prompt (Zod validation)", async () => {
      setupGuestUser();
      const req = makeRequest({ prompt: "" });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });

    it("returns 500 for prompt exceeding 10000 characters (Zod validation)", async () => {
      setupGuestUser();
      const longPrompt = "a".repeat(10001);
      const req = makeRequest({ prompt: longPrompt });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });

    it("returns 500 when mode_params values are not strings (Zod validation)", async () => {
      setupGuestUser();
      const req = makeRequest({ prompt: "test", mode_params: { key: 123 } });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });

    it("accepts valid mode_params with string values", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        mode_params: { aspect_ratio: "16:9", style: "cinematic" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("does not trigger credit refund on Zod validation failure", async () => {
      // Zod errors are thrown before userId is set, so the catch block
      // sees userId as undefined and does not refund.
      const req = makeRequest({ prompt: "" });
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(mockRefundCredit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. Authentication
  // -----------------------------------------------------------------------
  describe("authentication", () => {
    it("allows guest access with IP-based rate limiting (guest tier)", async () => {
      setupGuestUser();
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockCheckRateLimit).toHaveBeenCalledWith("127.0.0.1", "guest");
    });

    it("returns 400 when no identifier is available (no user, no IP)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockSupabaseFrom.mockReturnValue(mockQueryBuilder({ data: null }));
      mockCheckRateLimit.mockResolvedValue({
        success: true,
        limit: 5,
        remaining: 4,
        reset: Date.now() + 60000,
      });

      // Request without any IP headers
      const req = new Request("http://localhost/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_BODY),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/unable to identify/i);
    });

    // -------------------------------------------------------------------
    // 10. Bearer token auth for Chrome extension
    // -------------------------------------------------------------------
    it("handles Supabase JWT Bearer token (Chrome extension auth)", async () => {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake-jwt-token";
      const bearerUserId = nextUserId();

      // Override the supabase client for this test -- the route calls
      // supabase.auth.getUser(token) when a Bearer token is present.
      const mockSupabaseGetUserWithToken = vi.fn().mockResolvedValue({
        data: { user: { id: bearerUserId } },
      });
      const { createClient } = await import("@/lib/supabase/server");
      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: {
          getUser: mockSupabaseGetUserWithToken,
        },
        from: (...args: unknown[]) => mockSupabaseFrom(...args),
        rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
      });

      // Bearer token => useServiceClient=true => queries go through service client
      const profileBuilder = mockQueryBuilder({
        data: { plan_tier: "pro" },
      });
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "profiles") return profileBuilder;
        if (table === "user_roles")
          return mockQueryBuilder({ data: null });
        return mockQueryBuilder({ data: null });
      });

      mockCheckRateLimit.mockResolvedValue({
        success: true,
        limit: 200,
        remaining: 199,
        reset: Date.now() + 60000,
      });
      mockCheckAndDecrementCredits.mockResolvedValue({
        allowed: true,
        remaining: 99,
      });
      mockEnqueueJob.mockResolvedValue(undefined);
      mockRefundCredit.mockResolvedValue(undefined);
      setupMockStream();

      const req = makeRequest(VALID_BODY, {
        Authorization: `Bearer ${token}`,
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      // Verify the route called getUser WITH the token
      expect(mockSupabaseGetUserWithToken).toHaveBeenCalledWith(token);
    });

    it("handles developer API key auth (prk_ prefix)", async () => {
      mockValidateApiKey.mockResolvedValue({
        valid: true,
        userId: "api-user-456",
        keyId: "key-1",
      });

      // API key auth => useServiceClient=true
      const profileBuilder = mockQueryBuilder({
        data: { plan_tier: "pro" },
      });
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "profiles") return profileBuilder;
        if (table === "user_roles")
          return mockQueryBuilder({ data: null });
        return mockQueryBuilder({ data: null });
      });

      mockCheckRateLimit.mockResolvedValue({
        success: true,
        limit: 200,
        remaining: 199,
        reset: Date.now() + 60000,
      });
      mockCheckAndDecrementCredits.mockResolvedValue({
        allowed: true,
        remaining: 50,
      });
      mockEnqueueJob.mockResolvedValue(undefined);
      mockRefundCredit.mockResolvedValue(undefined);
      setupMockStream();

      const req = makeRequest(VALID_BODY, {
        Authorization: "Bearer prk_test_key_abc123",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockValidateApiKey).toHaveBeenCalledWith("prk_test_key_abc123");
    });

    it("returns 401 for invalid developer API key", async () => {
      mockValidateApiKey.mockResolvedValue({
        valid: false,
        error: "Invalid API key",
      });

      const req = makeRequest(VALID_BODY, {
        Authorization: "Bearer prk_invalid_key",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toMatch(/invalid api key/i);
    });
  });

  // -----------------------------------------------------------------------
  // 5 & 6. Rate limiting
  // -----------------------------------------------------------------------
  describe("rate limiting", () => {
    it("returns 429 when guest is rate limited", async () => {
      setupGuestUser();
      const resetTime = Math.floor(Date.now() / 1000) + 3600;
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
      });

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toMatch(/too many requests/i);
      expect(body.reset_at).toBe(resetTime);
      expect(res.headers.get("Retry-After")).toBe(resetTime.toString());
      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        "127.0.0.1",
        "guest",
      );
    });

    it("returns 429 when free-tier user is rate limited", async () => {
      const userId = nextUserId();
      mockGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      const profileBuilder = mockQueryBuilder({
        data: { plan_tier: "free" },
      });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "profiles") return profileBuilder;
        return mockQueryBuilder({ data: null });
      });

      const resetTime = Math.floor(Date.now() / 1000) + 86400;
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(429);
      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        userId,
        "free",
      );
    });

    it("skips rate limiting for admin users", async () => {
      setupAuthenticatedUser({ isAdmin: true });
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 7. Credit enforcement
  // -----------------------------------------------------------------------
  describe("credit enforcement", () => {
    it("returns 403 when authenticated user has no credits", async () => {
      setupAuthenticatedUser({ credits: false });

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/insufficient credits/i);
      expect(body.balance).toBe(0);
    });

    it("does not check credits for guest users", async () => {
      setupGuestUser();
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockCheckAndDecrementCredits).not.toHaveBeenCalled();
    });

    it("skips credit checks for admin users", async () => {
      setupAuthenticatedUser({ isAdmin: true });
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockCheckAndDecrementCredits).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 8. Successful streaming response
  // -----------------------------------------------------------------------
  describe("successful generation", () => {
    it("streams response for authenticated user with credits", async () => {
      setupAuthenticatedUser({ tier: "free" });
      const { mockResult } = setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "text/plain; charset=utf-8",
      );
      expect(mockResult.toTextStreamResponse).toHaveBeenCalled();
      // Note: temperature is no longer passed from the route — the gateway's
      // pickDefaults(task) picks task-aware values. See enhance/route.ts.
      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "mock system",
          prompt: "mock user",
          task: "enhance",
          userTier: "free",
        }),
      );
      const callArgs = mockGenerateStream.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('temperature');
    });

    it("streams response for pro-tier user", async () => {
      setupAuthenticatedUser({ tier: "pro" });
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({ userTier: "pro" }),
      );
    });

    it("streams response for guest user (no auth)", async () => {
      setupGuestUser();
      setupMockStream();

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({ userTier: "guest" }),
      );
    });

    it("passes tone and category to the engine", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        tone: "Friendly",
        category: "Marketing",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: "Friendly",
          category: "Marketing",
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // 9. Credit refund on AI gateway error
  // -----------------------------------------------------------------------
  describe("credit refund on error", () => {
    it("refunds credit when AIGateway throws an error", async () => {
      setupAuthenticatedUser();
      mockGenerateStream.mockRejectedValue(
        new Error("AI provider unavailable"),
      );

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(mockRefundCredit).toHaveBeenCalledWith(lastUserId);
    });

    it("refunds credit on ConcurrencyError and returns 503", async () => {
      setupAuthenticatedUser();

      // Import ConcurrencyError from the mocked module so instanceof works
      const { ConcurrencyError } = await import("@/lib/ai/concurrency");
      mockGenerateStream.mockRejectedValue(
        new ConcurrencyError("Server is busy"),
      );

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(503);
      expect(res.headers.get("Retry-After")).toBe("5");
      expect(mockRefundCredit).toHaveBeenCalledWith(lastUserId);
    });

    it("does not refund credit for guest users on error", async () => {
      setupGuestUser();
      mockGenerateStream.mockRejectedValue(new Error("AI failure"));

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(mockRefundCredit).not.toHaveBeenCalled();
    });

    it("does not trigger credit refund on invalid JSON (parse error before credits)", async () => {
      const req = makeInvalidJsonRequest();
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(mockRefundCredit).not.toHaveBeenCalled();
    });

    it("refunds via onFinish when generation produces empty text", async () => {
      setupAuthenticatedUser();

      let capturedOnFinish:
        | ((c: {
            usage: unknown;
            text: string;
            finishReason?: string;
          }) => Promise<void>)
        | undefined;

      mockGenerateStream.mockImplementation(
        async (p: {
          onFinish?: (c: {
            usage: unknown;
            text: string;
          }) => Promise<void>;
        }) => {
          capturedOnFinish = p.onFinish as typeof capturedOnFinish;
          return {
            result: {
              toTextStreamResponse: vi.fn().mockReturnValue(
                new Response("", {
                  headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                  },
                }),
              ),
            },
            modelId: "gemini-2.5-flash",
          };
        },
      );

      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(capturedOnFinish).toBeDefined();

      // Simulate the onFinish callback with empty text
      await capturedOnFinish!({
        usage: {},
        text: "",
        finishReason: "stop",
      });

      expect(mockRefundCredit).toHaveBeenCalledWith(lastUserId);
    });

    it("refunds via onFinish when finishReason is 'error'", async () => {
      setupAuthenticatedUser();

      let capturedOnFinish:
        | ((c: {
            usage: unknown;
            text: string;
            finishReason?: string;
          }) => Promise<void>)
        | undefined;

      mockGenerateStream.mockImplementation(
        async (p: {
          onFinish?: (c: {
            usage: unknown;
            text: string;
          }) => Promise<void>;
        }) => {
          capturedOnFinish = p.onFinish as typeof capturedOnFinish;
          return {
            result: {
              toTextStreamResponse: vi.fn().mockReturnValue(
                new Response("partial", {
                  headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                  },
                }),
              ),
            },
            modelId: "gemini-2.5-flash",
          };
        },
      );

      const req = makeRequest(VALID_BODY);
      await POST(req);

      expect(capturedOnFinish).toBeDefined();
      await capturedOnFinish!({
        usage: {},
        text: "partial output",
        finishReason: "error",
      });

      expect(mockRefundCredit).toHaveBeenCalledWith(lastUserId);
    });
  });

  // -----------------------------------------------------------------------
  // 11. Refinement requests
  // -----------------------------------------------------------------------
  describe("refinement requests", () => {
    it("uses generateRefinement when previousResult and refinementInstruction are provided", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "original prompt",
        previousResult: "The previous enhanced result",
        refinementInstruction: "Make it more concise",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateRefinement).toHaveBeenCalled();
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("uses generateRefinement when previousResult and answers are provided", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "original prompt",
        previousResult: "The previous enhanced result",
        answers: { q1: "yes", q2: "more formal" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateRefinement).toHaveBeenCalled();
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("uses generate (not refinement) when previousResult is present but no instruction or answers", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "original prompt",
        previousResult: "The previous enhanced result",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalled();
      expect(mockGenerateRefinement).not.toHaveBeenCalled();
    });

    it("uses generate when answers are all empty/whitespace", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "original prompt",
        previousResult: "The previous enhanced result",
        answers: { q1: "", q2: "  " },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalled();
      expect(mockGenerateRefinement).not.toHaveBeenCalled();
    });

    it("passes refinement fields to engine.generateRefinement", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "original",
        previousResult: "previous output",
        refinementInstruction: "Make shorter",
      });
      await POST(req);

      // Refine requests must lift the token ceiling above the 4096 default
      // because the engine re-emits the enhanced prompt + [GENIUS_QUESTIONS]
      // + [PROMPT_TITLE] blocks, which commonly exceed 4096 and trigger
      // finishReason='length' truncation mid-answer. Regression for the
      // Refine-output-cut-off bug.
      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({ maxOutputTokens: 8192, task: "enhance" }),
      );
      expect(mockGenerateRefinement).toHaveBeenCalledWith(
        expect.objectContaining({
          previousResult: "previous output",
          refinementInstruction: "Make shorter",
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("applies default tone (Professional) when not provided", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({ prompt: "test prompt" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "Professional" }),
      );
    });

    it("accepts context attachments in request body", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        context: [
          { type: "file", name: "doc.pdf", content: "file content here" },
          {
            type: "url",
            name: "https://example.com",
            content: "page content",
          },
        ],
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.arrayContaining([
            expect.objectContaining({ type: "file", name: "doc.pdf" }),
            expect.objectContaining({
              type: "url",
              name: "https://example.com",
            }),
          ]),
        }),
      );
    });

    it("passes target_model through to engine input", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({ prompt: "test", target_model: "claude" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ targetModel: "claude" }),
      );
    });

    it("passes iteration number through to engine input", async () => {
      setupAuthenticatedUser();
      setupMockStream();

      const req = makeRequest({ prompt: "test", iteration: 2 });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ iteration: 2 }),
      );
    });

    it("passes capability_mode through to engine selection (pro user)", async () => {
      setupAuthenticatedUser({ tier: "pro" });
      setupMockStream();

      const { getEngine } = await import("@/lib/engines");

      const req = makeRequest({
        prompt: "test",
        capability_mode: "IMAGE_GENERATION",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(getEngine).toHaveBeenCalledWith("IMAGE_GENERATION");
    });

    it("passes task agent to the gateway for AGENT_BUILDER mode (pro user)", async () => {
      setupAuthenticatedUser({ tier: "pro" });
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        capability_mode: "AGENT_BUILDER",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          task: "agent",
        }),
      );
    });

    it("returns 403 when free user requests a non-STANDARD capability mode", async () => {
      setupAuthenticatedUser({ tier: "free" });
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        capability_mode: "DEEP_RESEARCH",
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/Pro/);
    });

    it("allows free user to use STANDARD capability mode", async () => {
      setupAuthenticatedUser({ tier: "free" });
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        capability_mode: "STANDARD",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("allows admin to use any capability mode regardless of tier", async () => {
      setupAuthenticatedUser({ tier: "free", isAdmin: true });
      setupMockStream();

      const req = makeRequest({
        prompt: "test",
        capability_mode: "IMAGE_GENERATION",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("tracks API usage via trackApiUsage in onFinish callback", async () => {
      setupAuthenticatedUser();

      let capturedOnFinish:
        | ((c: { usage: unknown; text: string }) => Promise<void>)
        | undefined;

      mockGenerateStream.mockImplementation(
        async (p: {
          onFinish?: (c: {
            usage: unknown;
            text: string;
          }) => Promise<void>;
        }) => {
          capturedOnFinish = p.onFinish;
          return {
            result: {
              toTextStreamResponse: vi.fn().mockReturnValue(
                new Response("ok", {
                  headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                  },
                }),
              ),
            },
            modelId: "gemini-2.5-flash",
          };
        },
      );

      const req = makeRequest(VALID_BODY);
      await POST(req);

      expect(capturedOnFinish).toBeDefined();
      await capturedOnFinish!({
        usage: { promptTokens: 100, completionTokens: 50 },
        text: "Enhanced result",
      });

      expect(mockTrackApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: lastUserId,
          modelId: "gemini-2.5-flash",
          inputTokens: 100,
          outputTokens: 50,
          endpoint: "enhance",
        }),
      );
    });
  });

  // ===========================================================================
  // Cache path — added after the 2026-04-07 security/correctness review
  // ===========================================================================
  describe("result cache", () => {
    beforeEach(() => {
      // Cache tests all run as an authenticated user so the refund/history
      // side effects have a userId to write against.
      setupAuthenticatedUser();
      mockBuildCacheKey.mockReset();
      mockGetCached.mockReset();
      mockSetCached.mockReset();
      // Default: cache returns a non-null key and a miss. Individual tests
      // override mockGetCached to return a hit when they need one.
      mockBuildCacheKey.mockReturnValue("peroot:enhance:test:fake-key");
      mockGetCached.mockResolvedValue(null);
      mockSetCached.mockResolvedValue(undefined);
    });

    it("returns cached text with X-Peroot-Cache: hit header on cache hit", async () => {
      mockGetCached.mockResolvedValueOnce({
        text: "cached enhanced prompt",
        modelId: "gemini-2.5-flash",
        cachedAt: Date.now(),
      });

      const { POST } = await import("../route");
      const req = makeRequest(VALID_BODY);
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Peroot-Cache")).toBe("hit");
      const body = await res.text();
      expect(body).toBe("cached enhanced prompt");
      // LLM was not called on a hit
      expect(mockGenerateStream).not.toHaveBeenCalled();
    });

    it("logs trackApiUsage with cacheHit:true and zero tokens on a hit", async () => {
      mockGetCached.mockResolvedValueOnce({
        text: "cached",
        modelId: "gemini-2.5-flash",
        cachedAt: Date.now(),
      });

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      expect(mockTrackApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: true,
          inputTokens: 0,
          outputTokens: 0,
          endpoint: "enhance",
        }),
      );
    });

    it("refunds the credit on a cache hit (user pays zero when server pays zero)", async () => {
      mockGetCached.mockResolvedValueOnce({
        text: "cached",
        modelId: "gemini-2.5-flash",
        cachedAt: Date.now(),
      });

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      expect(mockRefundCredit).toHaveBeenCalledWith(lastUserId);
    });

    it("writes a history row on a cache hit", async () => {
      mockGetCached.mockResolvedValueOnce({
        text: "cached enhanced prompt",
        modelId: "gemini-2.5-flash",
        cachedAt: Date.now(),
      });

      // Track calls to `from('history').insert(...)`. The history table is
      // ALSO read from (history recall via .select().not().eq()...), so we
      // merge the chain-builder with the insert spy so both paths work.
      const historyInsert = vi.fn().mockReturnValue({
        then: (resolve: (v: unknown) => void) => {
          resolve({ error: null });
          return Promise.resolve({ error: null });
        },
      });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "history") {
          const builder = mockQueryBuilder({ data: [] });
          builder.insert = historyInsert;
          return builder;
        }
        return mockQueryBuilder({ data: null });
      });

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      expect(historyInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: lastUserId,
          enhanced_prompt: "cached enhanced prompt",
        }),
      );
    });

    it("falls through to the LLM when cache is a miss", async () => {
      mockGetCached.mockResolvedValueOnce(null);

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      expect(mockGenerateStream).toHaveBeenCalled();
    });

    it("skips the cache lookup when X-Peroot-Cache-Bypass:1 header is set", async () => {
      const { POST } = await import("../route");
      await POST(
        makeRequest(VALID_BODY, { "x-peroot-cache-bypass": "1" }),
      );

      expect(mockGetCached).not.toHaveBeenCalled();
      expect(mockGenerateStream).toHaveBeenCalled();
    });

    it("skips the cache for refinement requests", async () => {
      const { POST } = await import("../route");
      await POST(
        makeRequest({
          ...VALID_BODY,
          previousResult: "old output",
          refinementInstruction: "make it shorter",
        }),
      );

      // buildCacheKey is still called (the route builds the key regardless),
      // but we assert the ROUTE passed isRefinement:true so that the real
      // buildCacheKey would have returned null. Check the argument:
      expect(mockBuildCacheKey).toHaveBeenCalledWith(
        expect.objectContaining({ isRefinement: true }),
      );
    });

    it("stores result in cache on successful LLM generation (miss path)", async () => {
      mockGetCached.mockResolvedValueOnce(null);

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      // onFinish fires to close the stream and write the cache
      const onFinish = mockGenerateStream.mock.calls[0][0].onFinish;
      await onFinish({
        usage: { inputTokens: 100, outputTokens: 50 },
        text: "fresh enhanced output",
      });

      expect(mockSetCached).toHaveBeenCalledWith(
        "peroot:enhance:test:fake-key",
        expect.objectContaining({ text: "fresh enhanced output" }),
      );
    });

    it("does NOT store empty completions in cache", async () => {
      mockGetCached.mockResolvedValueOnce(null);

      const { POST } = await import("../route");
      await POST(makeRequest(VALID_BODY));

      const onFinish = mockGenerateStream.mock.calls[0][0].onFinish;
      await onFinish({ usage: {}, text: "" });

      expect(mockSetCached).not.toHaveBeenCalled();
    });
  });
});

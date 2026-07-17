import { NextRequest, NextResponse } from "next/server";
import { isIP } from "net";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { errors } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";

/**
 * API Middleware — Higher-order functions for admin route handlers.
 *
 * Eliminates the repetitive validateAdminSession() + error-response
 * boilerplate that every admin route duplicates.
 *
 * Usage:
 *   export const GET = withAdmin(async (req, supabase, user) => {
 *     // handler logic — already authenticated as admin
 *     return NextResponse.json({ ok: true });
 *   });
 */

type AdminHandler<TContext = unknown> = (
  req: NextRequest,
  supabase: SupabaseClient,
  user: User,
  context: TContext,
) => Promise<NextResponse>;

/**
 * Wraps an admin API handler with session validation and error handling.
 *
 * - Calls validateAdminSession() and returns 401/403 on failure.
 * - Catches unhandled errors and returns a generic 500 response.
 * - Passes the authenticated supabase client and user to the handler.
 * - Forwards the route context (e.g. { params }) as the fourth argument.
 */
export function withAdmin<TContext = unknown>(handler: AdminHandler<TContext>) {
  return async (req: NextRequest, context: TContext) => {
    try {
      const { error, supabase, user } = await validateAdminSession();

      if (error || !supabase || !user) {
        return NextResponse.json(
          { error: error || "Forbidden" },
          { status: error === "Unauthorized" ? 401 : 403 },
        );
      }

      return await handler(req, supabase, user, context);
    } catch (err) {
      logger.error("[withAdmin] Unhandled error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Same as withAdmin but additionally enforces the adminWrite rate limit
 * (120 state-changing ops per minute per admin user). Use on POST/PATCH/
 * DELETE admin routes to contain a compromised token or runaway script.
 */
export function withAdminWrite<TContext = unknown>(handler: AdminHandler<TContext>) {
  return async (req: NextRequest, context: TContext) => {
    try {
      const { error, supabase, user } = await validateAdminSession();

      if (error || !supabase || !user) {
        return NextResponse.json(
          { error: error || "Forbidden" },
          { status: error === "Unauthorized" ? 401 : 403 },
        );
      }

      const rl = await checkRateLimit(`admin:${user.id}`, "adminWrite");
      if (!rl.success) {
        return NextResponse.json(
          { error: "Rate limit exceeded for admin write operations" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(rl.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(rl.reset),
            },
          },
        );
      }

      return await handler(req, supabase, user, context);
    } catch (err) {
      logger.error("[withAdminWrite] Unhandled error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

// ---------------------------------------------------------------------------
// withUser — deep module for authenticated / guest-allowed credit-gated routes.
// Sibling of withAdmin. Owns: cookie-or-Bearer auth, the RLS-vs-service-role
// client choice (centrally, so no route writes `bearer ? service : rls`), lazy
// tier/admin resolution, rate-limit, credit charge with refund-on-failure, and
// canonical error shaping. See CONTEXT.md -> "Credit-gated endpoint · withUser"
// and docs/plans/2026-07-17-withuser-middleware-plan.md.
// ---------------------------------------------------------------------------

export type Tier = "guest" | "free" | "pro" | "admin";
type Bucket = NonNullable<Parameters<typeof checkRateLimit>[1]>;

export type AuthResult =
  | { status: "ok"; user: User | null; isBearer: boolean }
  | { status: "invalid_token" };

export interface UserCtx {
  /** null only when allowGuest and the request is unauthenticated. */
  user: User | null;
  /** One correctly-scoped client, chosen centrally (RLS cookie or service-role for Bearer). */
  db: SupabaseClient;
  /** Lazy, memoised. Resolves the plan tier ("guest" for unauthenticated). */
  tier: () => Promise<Tier>;
  /** Lazy, memoised. Admin comes from the user_roles table (canonical). */
  isAdmin: () => Promise<boolean>;
  /** Idempotent refund of a charged credit — call from a streaming error path. */
  refund: () => Promise<void>;
}

export interface WithUserOptions {
  /** Rate-limit bucket, a tier->bucket function, or "none". Required. */
  rateLimit: Bucket | ((tier: Tier) => Bucket) | "none";
  /**
   * Custom rate-limit key. Default keys on the user id (or client IP for
   * guests); override to namespace a route within a shared bucket, e.g.
   * `({ user }) => \`achievement:${user!.id}\``.
   */
  rateLimitKey?: (args: { user: User | null; ip: string | null }) => string;
  /**
   * Graceful-degradation response for a rate-limit hit, in place of the standard
   * 429. Use for routes that must never fail the caller — e.g. background
   * suggestions returning `() => NextResponse.json({ questions: [] })`.
   */
  onRateLimit?: () => Response;
  /** Credits to charge (opt-in). Charged only on a 2xx; auto-refunded otherwise. */
  credits?: number;
  /** Allow unauthenticated requests (rate-limited by IP). Default false. */
  allowGuest?: boolean;
}

export interface WithUserDeps {
  resolveAuth: (req: NextRequest, rlsClient: SupabaseClient) => Promise<AuthResult>;
  createRlsClient: () => Promise<SupabaseClient>;
  createServiceClient: () => SupabaseClient;
  resolveTier: (db: SupabaseClient, userId: string) => Promise<{ tier: Tier; isAdmin: boolean }>;
  checkRateLimit: (
    identifier: string,
    bucket: Bucket,
  ) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
  chargeCredits: (
    userId: string,
    tier: Tier,
    db: SupabaseClient,
    amount: number,
  ) => Promise<{ allowed: boolean; remaining: number; error?: string }>;
  refundCredits: (userId: string, amount: number) => Promise<void>;
  logger: {
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, err?: unknown) => void;
  };
}

/** Extract a trustworthy client IP (Vercel-injected), validated with net.isIP(). */
function clientIp(req: NextRequest): string | null {
  const rawRealIp = req.headers.get("x-real-ip");
  const rawXff = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return (
    (rawRealIp && isIP(rawRealIp) ? rawRealIp : null) ?? (rawXff && isIP(rawXff) ? rawXff : null)
  );
}

const defaultDeps: WithUserDeps = {
  resolveAuth: async (req, rlsClient) => {
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (bearerToken) {
      const {
        data: { user },
      } = await rlsClient.auth.getUser(bearerToken);
      if (!user || user.aud !== "authenticated") return { status: "invalid_token" };
      return { status: "ok", user, isBearer: true };
    }
    const {
      data: { user },
    } = await rlsClient.auth.getUser();
    return { status: "ok", user: user ?? null, isBearer: false };
  },
  createRlsClient: () => createClient(),
  createServiceClient,
  resolveTier: async (db, userId) => {
    const [pRes, aRes] = await Promise.all([
      db.from("profiles").select("plan_tier").eq("id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    ]);
    const isAdmin = !!aRes.data;
    const plan = (pRes.data?.plan_tier as string) || "free";
    const tier: Tier = isAdmin ? "admin" : plan === "pro" ? "pro" : "free";
    return { tier, isAdmin };
  },
  checkRateLimit,
  chargeCredits: (userId, tier, db, amount) => checkAndDecrementCredits(userId, tier, db, amount),
  refundCredits: async (userId, amount) => {
    await refundCredit(userId, amount);
  },
  logger,
};

type UserHandler<C> = (req: NextRequest, ctx: UserCtx, routeContext: C) => Promise<Response>;

/**
 * Wraps a credit-gated API handler. See WithUserOptions/UserCtx for the contract.
 *
 *   export const POST = withUser(async (req, ctx) => {
 *     // already authed, rate-limited, and charged; ctx.db is correctly scoped
 *     return NextResponse.json({ ok: true });
 *   }, { rateLimit: "chainFree", credits: 2, allowGuest: true });
 */
export function withUser<C = unknown>(
  handler: UserHandler<C>,
  opts: WithUserOptions,
  deps: WithUserDeps = defaultDeps,
) {
  return async (req: NextRequest, routeContext: C): Promise<Response> => {
    try {
      const rlsClient = await deps.createRlsClient();
      const auth = await deps.resolveAuth(req, rlsClient);
      if (auth.status === "invalid_token") return errors.invalidToken();

      const user = auth.user;
      if (!user && !opts.allowGuest) return errors.unauthorized();

      const db = auth.isBearer ? deps.createServiceClient() : rlsClient;

      // Lazy, memoised tier/admin resolution.
      let tierCache: { tier: Tier; isAdmin: boolean } | undefined;
      const resolveOnce = async (): Promise<{ tier: Tier; isAdmin: boolean }> => {
        if (!user) return { tier: "guest", isAdmin: false };
        if (!tierCache) tierCache = await deps.resolveTier(db, user.id);
        return tierCache;
      };

      // Resolve up front only when the tier drives a decision (credits or a
      // tier-varying bucket). Static-bucket, no-credit routes stay query-free.
      const needsTierUpfront =
        !!user && (opts.credits != null || typeof opts.rateLimit === "function");
      let tier: Tier = user ? "free" : "guest";
      let isAdmin = false;
      if (needsTierUpfront) {
        const r = await resolveOnce();
        tier = r.tier;
        isAdmin = r.isAdmin;
      }

      // Admins bypass the expensive gates (credits + rate-limit) on the routes
      // where the tier was resolved. Logged so the bypass is observable.
      const bypass = isAdmin;
      if (bypass) {
        deps.logger.info("[withUser] admin bypass", {
          userId: user?.id,
          credits: opts.credits ?? 0,
        });
      }

      // Rate limit.
      if (opts.rateLimit !== "none" && !bypass) {
        const bucket = typeof opts.rateLimit === "function" ? opts.rateLimit(tier) : opts.rateLimit;
        const ip = clientIp(req);
        const identifier = opts.rateLimitKey
          ? opts.rateLimitKey({ user, ip })
          : user
            ? user.id
            : ip;
        if (!identifier) {
          return errors.badRequest("לא ניתן לזהות את מקור הבקשה", "unidentified_source");
        }
        const rl = await deps.checkRateLimit(identifier, bucket);
        if (!rl.success) {
          if (opts.onRateLimit) return opts.onRateLimit();
          return errors.rateLimited({ reset: rl.reset, limit: rl.limit, remaining: rl.remaining });
        }
      }

      // Credit charge — eager; kept only on a 2xx (see refund logic below).
      let charged = false;
      let refunded = false;
      const refund = async () => {
        if (!charged || refunded || !user) return;
        refunded = true;
        await deps.refundCredits(user.id, opts.credits!);
      };
      if (opts.credits != null && !bypass && user) {
        const c = await deps.chargeCredits(user.id, tier, db, opts.credits);
        if (!c.allowed) return errors.insufficientCredits(c.remaining);
        charged = true;
      }

      const ctx: UserCtx = {
        user,
        db,
        tier: async () => (await resolveOnce()).tier,
        isAdmin: async () => (await resolveOnce()).isAdmin,
        refund,
      };

      try {
        const res = await handler(req, ctx, routeContext);
        if (charged && res.status >= 400) await refund();
        return res;
      } catch (err) {
        deps.logger.error("[withUser] Unhandled error:", err);
        if (charged) await refund();
        return errors.internal();
      }
    } catch (err) {
      logger.error("[withUser] Fatal error before handler:", err);
      return errors.internal();
    }
  };
}

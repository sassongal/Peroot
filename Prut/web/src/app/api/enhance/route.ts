import { z } from "zod";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse, after } from "next/server";
import { getEngine, EngineInput } from "@/lib/engines";
import { BaseEngine } from "@/lib/engines/base-engine";
import { applyModelTagWrapper, shouldSkipLLM } from "@/lib/engines/score-gate";
import type { ModelProfile } from "@/lib/engines/types";
import { selectEngineModel } from "@/lib/ai/context-router";
import type { ContextBlock } from "@/lib/context/engine/types";
import { CapabilityMode, parseCapabilityMode } from "@/lib/capability-mode";
import { checkRateLimit } from "@/lib/ratelimit";
import { AIGateway } from "@/lib/ai/gateway";
import { ConcurrencyError } from "@/lib/ai/concurrency";
import { enqueueJob } from "@/lib/jobs/queue";
import { trackApiUsage } from "@/lib/admin/track-api-usage";
import { logger } from "@/lib/logger";
import { validateApiKey } from "@/lib/api-auth";
import { checkAndDecrementCredits, refundCredit } from "@/lib/services/credit-service";
import {
  resolveGuestId,
  applyGuestCookie,
  buildGuestCookieHeader,
  checkAndDecrementGuestCredits,
  refundGuestCredit,
} from "@/lib/guest-service";
import {
  buildCacheKey,
  deleteCached,
  getCached,
  getRuntimeCacheVersion,
  setCached,
} from "@/lib/ai/enhance-cache";
import { acquireInflightLock } from "@/lib/ai/inflight-lock";
import { AVAILABLE_MODELS, selectModelByLength, type ModelId } from "@/lib/ai/models";
import { memoryFlags } from "@/lib/memory/injection-flags";
import { extractFacts, mergeFactsForUser } from "@/lib/intelligence/fact-extractor";

export const maxDuration = 30;

// In-memory per-instance cache. Subscription upgrades may take up to 15s to reflect.
// Acceptable trade-off vs Redis round-trip on every request.
const profileCache = new Map<string, { tier: string; isAdmin: boolean; ts: number }>();
const profileInflight = new Map<string, Promise<{ tier: string; isAdmin: boolean }>>();
const PROFILE_CACHE_TTL = 15_000; // 15 seconds
const PROFILE_CACHE_MAX = 10_000;

/**
 * True LRU using Map's insertion-order semantics: on every read we delete
 * and re-insert to move the entry to the end, and the eviction loop drops
 * keys from the beginning (oldest unused). Adds a tiny per-hit cost in
 * exchange for accurate hot-set retention — important once the working
 * set is much smaller than 10k and the previous insertion-order policy
 * would evict frequently-used profiles purely because they were inserted
 * early.
 */
function profileCacheGet(
  userId: string,
): { tier: string; isAdmin: boolean; ts: number } | undefined {
  const entry = profileCache.get(userId);
  if (!entry) return undefined;
  profileCache.delete(userId);
  profileCache.set(userId, entry);
  return entry;
}

function profileCacheSet(
  userId: string,
  value: { tier: string; isAdmin: boolean; ts: number },
): void {
  if (profileCache.has(userId)) profileCache.delete(userId);
  profileCache.set(userId, value);
  while (profileCache.size > PROFILE_CACHE_MAX) {
    const oldest = profileCache.keys().next().value;
    if (oldest === undefined) break;
    profileCache.delete(oldest);
  }
}

const RequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  tone: z.string().default("Professional"),
  category: z.string().default("כללי"),
  capability_mode: z.string().optional(),
  mode_params: z.record(z.string(), z.string()).optional(),
  previousResult: z.string().max(50_000).optional(),
  refinementInstruction: z.string().max(5_000).optional(),
  // Bounded refinement Q/A payload. Prevents an oversized `answers` map
  // (long keys, long values, or thousands of entries) from bloating the
  // engine prompt and burning tokens on garbage input.
  answers: z
    .record(z.string().max(200), z.string().max(2_000))
    .refine((r) => Object.keys(r).length <= 50, { message: "answers exceeds 50 entries" })
    .optional(),
  iteration: z.number().int().min(0).optional(),
  target_model: z.enum(["chatgpt", "claude", "gemini", "general"]).default("general").optional(),
  model_profile_slug: z.string().max(64).optional(),
  output_language: z.enum(["hebrew", "english"]).optional(),
  // Accepts both the legacy shape { type, name, content } and the new
  // ContextBlock shape { id, type, sha256, stage, display, injected }.
  // All fields are explicitly typed and size-bounded — no passthrough() —
  // to prevent client-controlled display fields from acting as prompt injection vectors.
  context: z
    .array(
      z.object({
        type: z.enum(["file", "url", "image"]),
        // Legacy fields
        name: z.string().max(500).optional(),
        content: z.string().max(100_000).optional(),
        tokenCount: z.number().max(200_000).optional(),
        format: z.string().max(50).optional(),
        filename: z.string().max(500).optional(),
        url: z.string().max(2048).optional(),
        description: z.string().max(5_000).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        // New ContextBlock fields — explicitly bounded
        id: z.string().max(128).optional(),
        sha256: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
        stage: z
          .enum(["uploading", "extracting", "enriching", "ready", "warning", "error"])
          .optional(),
        display: z
          .object({
            title: z.string().max(200),
            documentType: z.string().max(50),
            summary: z.string().max(2_000),
            keyFacts: z.array(z.string().max(500)).max(10),
            entities: z
              .array(
                z.object({
                  name: z.string().max(100),
                  type: z.string().max(50),
                }),
              )
              .max(20),
            rawText: z.string().max(50_000).optional(),
            metadata: z.record(z.string(), z.unknown()),
          })
          .optional(),
        injected: z
          .object({
            header: z.string().max(500),
            body: z.string().max(10_000),
            tokenCount: z.number().min(0).max(100_000),
          })
          .optional(),
        imageBase64: z.string().max(1_400_000).optional(),
        imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
      }),
    )
    .max(20)
    .optional(),
});

/**
 * Standardized error for rate limiting
 */
const RateLimitError = (reset: number) =>
  NextResponse.json(
    { error: "יותר מדי בקשות. נסה שוב מאוחר יותר", code: "too_many_requests", reset_at: reset },
    { status: 429, headers: { "Retry-After": reset.toString() } },
  );

export async function POST(req: Request) {
  // Declare outside try so catch block can access for credit refund
  let userId: string | undefined;
  let supabase: Awaited<ReturnType<typeof createClient>> | undefined;
  // Guest credit refund path — mirrors `userId` hoisting above. Without this,
  // a mid-request exception would charge a guest without refund.
  let guestId: string | null = null;
  let isRefinementOuter = false;
  // Declared here so catch block can release the in-flight lock on any
  // error path, not just the happy path that reaches after().
  let releaseInflightLock: (() => Promise<void>) | null = null;

  // Parse JSON before main try block so SyntaxError doesn't trigger credit refund
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    const {
      prompt,
      tone,
      category,
      capability_mode,
      mode_params,
      previousResult,
      refinementInstruction,
      answers,
      iteration,
      context: contextAttachments,
      target_model,
      model_profile_slug,
      output_language,
    } = RequestSchema.parse(json);

    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);
    isRefinementOuter = isRefinement;

    supabase = await createClient();

    // Support Bearer token auth for Chrome extension + Developer API keys
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    let useServiceClient = false;

    if (bearerToken?.startsWith("prk_")) {
      // Developer API key auth
      const apiKeyResult = await validateApiKey(bearerToken);
      if (!apiKeyResult.valid) {
        return NextResponse.json(
          { error: apiKeyResult.error || "Invalid API key" },
          { status: 401 },
        );
      }
      userId = apiKeyResult.userId;
      useServiceClient = true;
    } else {
      const {
        data: { user },
      } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();
      if (bearerToken) {
        if (!user) {
          return NextResponse.json(
            { error: "טוקן אימות לא תקין או פג תוקף", code: "invalid_token" },
            { status: 401 },
          );
        }
        if (user.aud !== "authenticated") {
          return NextResponse.json(
            { error: "טוקן אימות אינו מאושר", code: "invalid_token_audience" },
            { status: 401 },
          );
        }
      }
      userId = user?.id;
      if (bearerToken && userId) useServiceClient = true;
    }

    // Guest access: allow unauthenticated users with IP-based rate limiting
    const isGuest = !userId;

    // When using Bearer token or API key, RLS won't have auth.uid() set,
    // so use service role client to bypass RLS
    const queryClient = useServiceClient ? createServiceClient() : supabase;

    // 1. Context Fetching - check cache for profile/tier first
    let tier: "free" | "pro" | "admin" | "guest" = "guest";
    let isAdmin = false;
    let cachedHit = false;

    if (userId) {
      const cached = profileCacheGet(userId);
      if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL) {
        tier = cached.tier as "free" | "pro" | "admin";
        isAdmin = cached.isAdmin;
        cachedHit = true;
      } else {
        // Dedup concurrent profile fetches for the same user (thundering-herd protection).
        // Multiple requests racing on a cold cache all share the same in-flight promise
        // so we hit the DB exactly once per TTL window per user per instance.
        let inflight = profileInflight.get(userId);
        if (!inflight) {
          inflight = (async () => {
            const [pRes, arRes] = await Promise.all([
              queryClient.from("profiles").select("plan_tier").eq("id", userId!).maybeSingle(),
              queryClient
                .from("user_roles")
                .select("role")
                .eq("user_id", userId!)
                .eq("role", "admin")
                .maybeSingle(),
            ]);
            const t = (pRes.data?.plan_tier as "free" | "pro" | "admin") || "free";
            const a = !!arRes.data;
            profileCacheSet(userId!, { tier: t, isAdmin: a, ts: Date.now() });
            return { tier: t, isAdmin: a };
          })().finally(() => profileInflight.delete(userId!));
          profileInflight.set(userId, inflight);
        }
        const result = await inflight;
        tier = result.tier as "free" | "pro" | "admin";
        isAdmin = result.isAdmin;
        cachedHit = true;
      }
    }

    // Parallel fetch: skip profile+admin queries if cached
    // Uses queryClient (service role for Bearer token, regular supabase otherwise)
    //
    // History recall source: by default we now fetch from `history` (top-3
    // most recent enhances) which gives us the *enhanced_prompt* — letting
    // the model see before→after pairs instead of raw user prompts only.
    // Set PEROOT_LEGACY_HISTORY_RECALL=1 to revert to the use_count-ordered
    // fetch from personal_library (raw prompts only).
    const useHistoryTable = memoryFlags.useHistoryTableForRecall;
    const historyRecallPromise =
      !isRefinement && memoryFlags.historyEnabled
        ? useHistoryTable
          ? queryClient
              .from("history")
              .select("title, prompt, enhanced_prompt")
              .eq("user_id", userId)
              .not("enhanced_prompt", "is", null)
              .order("created_at", { ascending: false })
              .limit(3)
          : queryClient
              .from("personal_library")
              .select("title, prompt")
              .eq("user_id", userId)
              .order("use_count", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(3)
        : Promise.resolve({ data: null });

    const contextPromise = userId
      ? Promise.all([
          cachedHit
            ? Promise.resolve({ data: null })
            : queryClient.from("profiles").select("plan_tier").eq("id", userId).maybeSingle(),
          historyRecallPromise,
          !isRefinement && memoryFlags.personalityEnabled
            ? queryClient
                .from("user_style_personality")
                .select("style_tokens, personality_brief, preferred_format")
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          cachedHit
            ? Promise.resolve({ data: null })
            : queryClient
                .from("user_roles")
                .select("role")
                .eq("user_id", userId)
                .eq("role", "admin")
                .maybeSingle(),
          !isRefinement && memoryFlags.factsEnabled
            ? queryClient
                .from("user_memory_facts")
                .select("fact, category")
                .eq("user_id", userId)
                .gte("confidence", 0.6)
                .order("updated_at", { ascending: false })
                .limit(20)
            : Promise.resolve({ data: null }),
        ])
      : Promise.resolve([
          { data: null },
          { data: null },
          { data: null },
          { data: null },
          { data: null },
        ]);

    const [profileRes, historyRes, personalityRes, adminRoleRes, factsRes] = await contextPromise;

    // 1.1 Process Profile & Tier (from DB if not cached)
    if (!cachedHit && profileRes.data) {
      const profile = profileRes.data;
      tier = (profile.plan_tier as "free" | "pro" | "admin") || "free";
      isAdmin = !!adminRoleRes?.data || isAdmin;

      // Store in cache
      if (userId) {
        profileCacheSet(userId, { tier, isAdmin, ts: Date.now() });
      }
    }

    // 1.5 Capability Mode Gating -- only guests are locked to STANDARD.
    // Registered users (free + pro + admin) get all modes.
    const mode = parseCapabilityMode(capability_mode);
    if (mode !== CapabilityMode.STANDARD && isGuest) {
      return NextResponse.json(
        { error: "התחבר כדי להשתמש במצב זה", code: "login_required" },
        { status: 403 },
      );
    }

    // 1.6 Guests cannot use context attachments (minimum cost + registration incentive)
    if (isGuest && contextAttachments && contextAttachments.length > 0) {
      return NextResponse.json(
        { error: "התחבר כדי לצרף קבצים וקישורים", code: "login_required" },
        { status: 403 },
      );
    }

    // Aggregate image payload guard — each image ≤1.4M chars (≈1MB base64);
    // total kept under 4M to stay well within Vercel's 4.5MB body limit.
    const totalBase64Chars = (contextAttachments ?? []).reduce(
      (sum, a) => sum + ((a as { imageBase64?: string }).imageBase64?.length ?? 0),
      0,
    );
    if (totalBase64Chars > 4_000_000) {
      return NextResponse.json(
        { error: "התמונה גדולה מדי, אנא העלה קובץ קטן יותר", code: "image_too_large" },
        { status: 413 },
      );
    }

    // Guest id resolution (only when we'll actually spend a credit below).
    let guestNeedsCookie = false;

    if (!isAdmin) {
      // 2. Execute Rate Limiting (kept as a coarse abuse guard on top of credits).
      // Use x-real-ip (Vercel-injected, not spoofable) or the rightmost entry in
      // x-forwarded-for (Vercel appends the true client IP at the right; [0] is
      // client-controlled and must not be trusted).
      // Validate parsed values with `net.isIP()` before they reach the
      // rate-limit bucket key. A malformed/garbage value would otherwise
      // collide all bad-IP traffic into a single shared bucket and
      // mis-attribute usage across unrelated callers (DoS amplifier on
      // the free tier).
      const rawRealIp = req.headers.get("x-real-ip");
      const rawXff = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
      const clientIp =
        (rawRealIp && isIP(rawRealIp) ? rawRealIp : null) ??
        (rawXff && isIP(rawXff) ? rawXff : null);
      const identifier = userId || clientIp;
      if (!identifier) {
        return NextResponse.json(
          { error: "לא ניתן לזהות את מקור הבקשה", code: "unidentified_source" },
          { status: 400 },
        );
      }

      const rateLimitTier: "free" | "pro" | "guest" = isGuest
        ? "guest"
        : tier === "free"
          ? "free"
          : "pro";
      const limitResult = await checkRateLimit(identifier, rateLimitTier);

      if (!limitResult.success) {
        return RateLimitError(limitResult.reset);
      }
    }

    // 3. In-flight dedup — acquired BEFORE credit deduction to prevent TOCTOU:
    // two concurrent identical requests would both pass the credit check before
    // either lock is visible in Redis. Lock first, then charge. A double-click
    // or retry within the 10-second window is rejected with 409.
    // If Redis is unreachable the helper fails open — see inflight-lock.ts.
    const contextFingerprint =
      contextAttachments && contextAttachments.length > 0
        ? createHash("sha256")
            .update(
              contextAttachments
                .map(
                  (c) =>
                    `${c.type}|${(c as { id?: string }).id ?? ""}|${(c as { sha256?: string }).sha256 ?? (c as { content?: string }).content?.slice(0, 64) ?? ""}`,
                )
                .join("\u0000"),
            )
            .digest("hex")
        : null;
    const lock = await acquireInflightLock({
      userId,
      prompt,
      mode: capability_mode,
      tone,
      category,
      targetModel: target_model || "general",
      isRefinement,
      contextFingerprint,
    });
    if (!lock.acquired) {
      // Credits not yet decremented — no refund needed.
      return NextResponse.json(
        { error: "בקשה זהה כבר בתהליך. נסה שוב בעוד רגע." },
        { status: 409, headers: { "Retry-After": "2" } },
      );
    }
    releaseInflightLock = lock.release;

    if (!isAdmin) {
      // 4. ATOMIC Credit Enforcement (after lock to eliminate TOCTOU window).
      // GENIUS refinement/answers are absorbed — skip decrement on refinement turns.
      if (!isRefinement) {
        if (userId) {
          const creditResult = await checkAndDecrementCredits(userId, tier, queryClient);
          if (!creditResult.allowed) {
            await releaseInflightLock();
            releaseInflightLock = null;
            return NextResponse.json(
              {
                error: creditResult.error || "Insufficient credits or profile not found",
                balance: creditResult.remaining,
                code: "quota_exhausted",
              },
              { status: 403 },
            );
          }
        } else {
          // Guest path — Redis-backed rolling 24h
          const resolved = await resolveGuestId(req);
          guestId = resolved.id;
          guestNeedsCookie = resolved.needsCookie;
          const guestResult = await checkAndDecrementGuestCredits(guestId);
          if (!guestResult.allowed) {
            await releaseInflightLock();
            releaseInflightLock = null;
            const res = NextResponse.json(
              {
                error: "מכסת האורח מוצתה. הירשם לקבלת 2 פרומפטים וגישה לכל המנועים.",
                balance: 0,
                refresh_at: guestResult.refreshAt?.toISOString() ?? null,
                code: "guest_quota_exhausted",
              },
              { status: 403 },
            );
            if (guestNeedsCookie) applyGuestCookie(res, guestId);
            return res;
          }
        }
      }
    }

    // 4. Engine Selection & Generation
    const engine = await getEngine(mode);

    // Apply model profile when the extension provides an explicit slug
    // (e.g. "gpt-5", "claude-sonnet-4", "gemini-2.5"). Non-blocking on miss —
    // engine renders with its base system prompt unchanged.
    let activeProfile: ModelProfile | null = null;
    if (model_profile_slug) {
      activeProfile = await engine.applyModelProfile(model_profile_slug);
    }

    // 4.5 Style RAG Processing (using pre-fetched data)
    let userHistory: { title: string; prompt: string; enhanced?: string }[] = [];
    let userPersonality: { tokens: string[]; brief?: string; format?: string } | undefined =
      undefined;
    let userFacts: { fact: string; category: string }[] | undefined = undefined;

    if (userId && !isGuest && !isRefinement) {
      if (historyRes.data) {
        // historyRes can come from two sources depending on the flag:
        //   - history table:        { title, prompt, enhanced_prompt }
        //   - personal_library:     { title, prompt }
        // We normalize both into the engine's expected shape so the
        // engine code stays source-agnostic.
        const rawRows = historyRes.data as Array<{
          title?: string | null;
          prompt?: string | null;
          enhanced_prompt?: string | null;
        }>;
        userHistory = rawRows
          .filter((r) => r.prompt && r.prompt.trim().length > 0)
          .map((r) => ({
            title: r.title || "",
            prompt: r.prompt as string,
            ...(r.enhanced_prompt ? { enhanced: r.enhanced_prompt } : {}),
          }));
      }

      if (personalityRes.data) {
        userPersonality = {
          tokens: personalityRes.data.style_tokens || [],
          brief: personalityRes.data.personality_brief,
          format: personalityRes.data.preferred_format,
        };
      }

      if (factsRes?.data && factsRes.data.length > 0) {
        userFacts = factsRes.data as { fact: string; category: string }[];
      }
    }

    const engineInput: EngineInput = {
      prompt,
      tone,
      category,
      mode,
      modeParams: mode_params,
      previousResult,
      refinementInstruction,
      answers,
      userHistory,
      userPersonality,
      userFacts,
      iteration,
      // Cast to satisfy EngineInput — name/content may be absent on new ContextBlock shape;
      // BaseEngine.buildContextSummaryForUserPrompt handles both shapes defensively.
      context: contextAttachments as EngineInput["context"],
      tier: tier === "pro" || tier === "admin" ? "pro" : "free",
      targetModel: target_model || "general",
      outputLanguage: output_language,
    };

    const engineOutput = engine.finalizeOutput(
      isRefinement ? engine.generateRefinement(engineInput) : engine.generate(engineInput),
    );

    // Anchor 4: classify the input by what the USER attached, not where the
    // request came from. The first context attachment wins; raw text is the
    // default. This populates history.input_source so the dashboard and
    // future filters can group "from PDF" vs "from URL" etc.
    const firstContextType = contextAttachments?.[0]?.type;
    const inputSource: "text" | "file" | "url" | "image" =
      firstContextType === "file"
        ? "file"
        : firstContextType === "url"
          ? "url"
          : firstContextType === "image"
            ? "image"
            : "text";

    // 4.55 Stage-1 score gate. When a model profile is active and the user's
    // raw prompt already scores at or above the skip threshold, we bypass the
    // LLM entirely and return a profile-tagged wrapper around their input.
    // This is the cheapest tier of the cost funnel: zero tokens, near-zero
    // latency. Skipped for refinements (always re-render), context-bearing
    // requests (the engine must merge the attachments), and JSON-output
    // engines (image/video — wrapping a JSON spec breaks downstream parsing).
    const SCORE_GATE_THRESHOLD = 80;
    const isJsonEngine = engineOutput.outputFormat === "json";
    const canScoreGate =
      !!activeProfile && !isRefinement && !isJsonEngine && (contextAttachments?.length ?? 0) === 0;
    if (canScoreGate && activeProfile) {
      const promptScore = BaseEngine.scorePrompt(prompt, mode);
      if (shouldSkipLLM(promptScore.score, SCORE_GATE_THRESHOLD)) {
        const wrappedText = applyModelTagWrapper(prompt, activeProfile);

        // Refund the credit decremented above — stage-1 costs us no LLM tokens.
        if (userId) {
          await refundCredit(userId);
        } else if (guestId && !isRefinement) {
          await refundGuestCredit(guestId);
        }

        // Track as a zero-token row so the cost dashboard can compute the
        // skip rate without a NULL-handling special case.
        trackApiUsage({
          userId,
          modelId: "gemini-2.5-flash",
          inputTokens: 0,
          outputTokens: 0,
          durationMs: 0,
          endpoint: "enhance",
          cacheHit: false,
        });

        after(async () => {
          try {
            if (userId && supabase) {
              await queryClient
                .from("history")
                .insert({
                  user_id: userId,
                  prompt,
                  enhanced_prompt: wrappedText,
                  tone,
                  category,
                  capability_mode: capability_mode || "STANDARD",
                  title: prompt.slice(0, 60),
                  source: bearerToken?.startsWith("prk_")
                    ? "api"
                    : bearerToken
                      ? "extension"
                      : "web",
                  input_source: inputSource,
                  cost_funnel_stage: 1,
                  updated_at: new Date().toISOString(),
                })
                .then(({ error: histErr }) => {
                  if (histErr)
                    logger.warn("[Enhance:score-gate] History insert failed:", histErr.message);
                });
            }
          } finally {
            await lock.release();
          }
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(wrappedText));
            controller.close();
          },
        });
        const headers: Record<string, string> = {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Peroot-Cache": "score-gate",
        };
        if (guestId && guestNeedsCookie) {
          headers["Set-Cookie"] = buildGuestCookieHeader(guestId);
        }
        return new Response(stream, { headers });
      }
    }

    // 4.6 Result cache lookup. Scoped PER USER (no cross-user sharing) and
    // skipped whenever personalization signal or context attachments are
    // present — see src/lib/ai/enhance-cache.ts for the full skip rules.
    // The X-Peroot-Cache-Bypass header lets pro/admin users force a fresh run.
    // Restricted to pro/admin to prevent free/guest users from bypassing the cache
    // and forcing expensive LLM calls on every request.
    const bypassCache =
      (isAdmin || tier === "pro") && req.headers.get("x-peroot-cache-bypass") === "1";
    // Always compute the key. Bypass suppresses the read (so we re-run the
    // LLM) but the key is retained for the post-stream write — that way the
    // forced fresh result overwrites the stale entry. Without this, a bypass
    // request would leave the prior cached value intact and the next
    // non-bypass caller would read the stale text.
    // Runtime cache_version (5-min memo). Bumping the row in extension_configs
    // partitions the cache without needing a code-side ENGINE_VERSION change.
    const runtimeCacheVersion = await getRuntimeCacheVersion();
    const cacheKey = buildCacheKey({
      prompt,
      mode: capability_mode,
      tone,
      category,
      targetModel: target_model || "general",
      modelProfileSlug: model_profile_slug ?? null,
      cacheVersion: runtimeCacheVersion,
      userId,
      hasContext: !!(contextAttachments && contextAttachments.length > 0),
      hasPersonalization: !!(userHistory.length > 0 || userPersonality),
      isRefinement,
    });

    if (bypassCache && cacheKey) {
      // Proactively evict the existing entry so any concurrent reader after
      // this point misses and waits for the fresh write below.
      await deleteCached(cacheKey);
    }

    if (cacheKey && !bypassCache) {
      const cacheCheckStart = Date.now();
      const cached = await getCached(cacheKey);
      if (cached) {
        const cacheLatencyMs = Date.now() - cacheCheckStart;

        // Runtime-validate the cached modelId against the current model
        // union. A model removed between cache write and read (e.g., the
        // recent removal of gemini-2.5-pro / deepseek-chat) would otherwise
        // write 'unknown' provider rows and pollute the dashboard.
        const cachedModelId: ModelId =
          cached.modelId in AVAILABLE_MODELS ? (cached.modelId as ModelId) : "gemini-2.5-flash";

        // Log the hit so the dashboard can compute hit rate. inputTokens
        // and outputTokens are 0 because no LLM was called. durationMs
        // reflects the actual cache-lookup latency (small, but real — so
        // cache-hit rows do not skew average-duration metrics toward 0).
        trackApiUsage({
          userId,
          modelId: cachedModelId,
          inputTokens: 0,
          outputTokens: 0,
          durationMs: cacheLatencyMs,
          endpoint: "enhance",
          cacheHit: true,
        });

        // Fix #3: refund the credit we decremented above. Cache hits cost
        // Peroot zero LLM tokens, so the user should not pay a quota unit
        // for them either. Guests get their rolling-window slot restored
        // via the Lua-bounded refundGuestCredit; admins were never charged.
        if (userId) {
          await refundCredit(userId);
        } else if (guestId && !isRefinement) {
          await refundGuestCredit(guestId);
        }

        // Cache-hit side effects run AFTER the response is sent so the
        // client gets its bytes immediately and the function duration
        // isn't blocked on DB latency. `after()` is a first-class Next.js
        // 16 primitive for exactly this pattern.
        after(async () => {
          try {
            if (userId && supabase) {
              await queryClient
                .from("history")
                .insert({
                  user_id: userId,
                  prompt,
                  enhanced_prompt: cached.text,
                  tone,
                  category,
                  capability_mode: capability_mode || "STANDARD",
                  title: prompt.slice(0, 60),
                  source: bearerToken?.startsWith("prk_")
                    ? "api"
                    : bearerToken
                      ? "extension"
                      : "web",
                  input_source: inputSource,
                  cost_funnel_stage: 2,
                  updated_at: new Date().toISOString(),
                })
                .then(({ error: histErr }) => {
                  if (histErr)
                    logger.warn("[Enhance:cache-hit] History insert failed:", histErr.message);
                });

              await queryClient
                .from("activity_logs")
                .insert({
                  user_id: userId,
                  action: isRefinement ? "Prmpt Refine" : "Prmpt Enhance",
                  entity_type: "prompt",
                  details: {
                    mode,
                    model: cachedModelId,
                    latency_ms: cacheLatencyMs,
                    tokens: { inputTokens: 0, outputTokens: 0 },
                    prompt_length: prompt.length,
                    result_length: cached.text.length,
                    tone,
                    category,
                    capability_mode: capability_mode || "STANDARD",
                    target_model: target_model || "general",
                    is_refinement: isRefinement,
                    has_context: !!(contextAttachments && contextAttachments.length > 0),
                    context_count: contextAttachments?.length || 0,
                    attachment_tokens_est: (contextAttachments || []).reduce(
                      (sum, c) => sum + (c.tokenCount || 0),
                      0,
                    ),
                    iteration: iteration || 0,
                    json_output: engineOutput.outputFormat === "json",
                    // Non-null marker so admins can filter cache-hit rows
                    // in activity_logs without adding a new column.
                    cache_hit: true,
                  },
                })
                .then(({ error: actErr }) => {
                  if (actErr)
                    logger.warn("[Enhance:cache-hit] Activity log insert failed:", actErr.message);
                });

              try {
                await enqueueJob("achievement_check", { userId });
              } catch (bgError) {
                logger.error("[EnhanceAPI:cache-hit] achievement_check enqueue failed:", bgError);
              }
            }
          } finally {
            await lock.release();
          }
        });

        // Return the cached text as a plain text stream. We use a
        // ReadableStream rather than a new Response(text) so the client
        // sees the same text-stream shape as the live path, keeping the
        // frontend parser unchanged.
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(cached.text));
            controller.close();
          },
        });
        const headers: Record<string, string> = {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Peroot-Cache": "hit",
        };
        if (guestId && guestNeedsCookie) {
          headers["Set-Cookie"] = buildGuestCookieHeader(guestId);
        }
        return new Response(stream, { headers });
      }
    }

    // 5. Execution with Streaming & Telemetry via Gateway
    const startTime = Date.now();
    // NOTE: Do NOT pass temperature/maxOutputTokens here. The gateway's
    // pickDefaults() chooses task-aware values (e.g., image/video get
    // 0.5 temp + 8192 maxOutputTokens because JSON image prompts need
    // more headroom and tighter structure than prose). Overriding with a
    // hardcoded 0.7 here would bypass that and cause the exact truncation
    // bug we just fixed upstream.
    const resolvedTask =
      mode === CapabilityMode.IMAGE_GENERATION
        ? "image"
        : mode === CapabilityMode.VIDEO_GENERATION
          ? "video"
          : mode === CapabilityMode.DEEP_RESEARCH
            ? "research"
            : mode === CapabilityMode.AGENT_BUILDER
              ? "agent"
              : "enhance";
    const isJsonOutput = engineOutput.outputFormat === "json";

    // Refine requests (previousResult + refinementInstruction/answers) reuse
    // the enhance task preset (4096 tokens). That preset is tuned for a
    // first-pass prompt rewrite, but Refine output is longer: the engine
    // re-emits the full enhanced prompt AND a fresh [GENIUS_QUESTIONS] block
    // AND a [PROMPT_TITLE] block, which together commonly exceed 4096 tokens
    // and trigger finishReason='length' mid-answer. We lift the ceiling to
    // 8192 for Refine on enhance, and to 12288 for research (whose preset is
    // already 10240 — refinement output is measurably longer because it
    // restates the original brief before emitting the upgraded version).
    // Image/video already use their own 16384 preset.
    const refinementMaxTokens = isRefinement
      ? resolvedTask === "enhance"
        ? 8192
        : resolvedTask === "research"
          ? 12288
          : undefined
      : undefined;

    // Only pass items that carry the new ContextBlock shape (have injected.tokenCount).
    // Legacy-shape context payloads (old { type, name, content } format) are skipped
    // so the router gracefully falls back to the default model.
    const contextBlocks = (contextAttachments ?? []).filter((a) => {
      const block = a as unknown as ContextBlock;
      return (
        block.injected &&
        typeof block.injected.tokenCount === "number" &&
        block.injected.tokenCount > 0 &&
        block.injected.tokenCount < 100_000
      );
    }) as unknown as ContextBlock[];
    // Tier routing.
    //   * Context blocks present → context-aware router wins (token-budget aware).
    //   * Refinement requests → never downgrade (refinement quality is critical
    //     and the *user* prompt is small while engine context is large).
    //   * Otherwise → route by RENDERED system+user length (not raw prompt
    //     length) so we don't downgrade requests where the engine assembled
    //     a long context-rich prompt around a short raw input.
    const renderedLength = engineOutput.systemPrompt.length + engineOutput.userPrompt.length;
    const preferredModel: ModelId =
      contextBlocks.length > 0
        ? selectEngineModel({ blocks: contextBlocks })
        : isRefinement
          ? "gemini-2.5-flash"
          : selectModelByLength(renderedLength);
    const contextTokens = contextBlocks.reduce((sum, b) => sum + (b.injected?.tokenCount ?? 0), 0);
    // Rough token estimate: system + user prompt chars ÷ 4, plus injected context
    const estimatedInputTokens =
      Math.ceil((engineOutput.systemPrompt.length + engineOutput.userPrompt.length) / 4) +
      contextTokens;

    const { result, modelId } = await AIGateway.generateStream({
      system: engineOutput.systemPrompt,
      prompt: engineOutput.userPrompt,
      task: resolvedTask,
      preferredModel,
      estimatedInputTokens,
      // Refine lifts the ceiling from 4096 → 8192; everything else stays
      // on the task preset (undefined = use pickDefaults).
      ...(refinementMaxTokens !== undefined ? { maxOutputTokens: refinementMaxTokens } : {}),
      userTier: tier === "guest" ? "guest" : tier === "admin" ? "pro" : tier,
      ...(engineOutput.imageAttachments && engineOutput.imageAttachments.length > 0
        ? { imageAttachments: engineOutput.imageAttachments }
        : {}),
      onFinish: async (completion) => {
        const durationMs = Date.now() - startTime;
        const textCopy = completion.text;
        const usageCopy = completion.usage;
        const finishReasonCopy = (completion as { finishReason?: string }).finishReason;

        // All non-critical work (DB writes, telemetry, job enqueue,
        // cache write, refund) runs AFTER the client's stream finishes.
        // This drops p95/p99 because the function's wall-clock duration
        // no longer includes DB latency. `after()` is the Next.js 16
        // primitive designed for exactly this pattern.
        after(async () => {
          try {
            // JSON validity check — applied only to engines that declared
            // outputFormat 'json' (currently: Stable Diffusion JSON and
            // Gemini Image JSON). We strip GENIUS_QUESTIONS / PROMPT_TITLE
            // trailing blocks before parsing because the engine appends
            // those after the main JSON payload. If parsing still fails,
            // we log the first 200 chars of the failing output to
            // activity_logs so admins can monitor invalid-JSON rate.
            let jsonValid: boolean | null = null;
            let jsonError: string | null = null;
            if (isJsonOutput && textCopy.length > 0) {
              const cleaned = textCopy
                .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]/, "")
                .replace(/\[GENIUS_QUESTIONS\][\s\S]*$/, "")
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```\s*$/i, "")
                .trim();
              try {
                JSON.parse(cleaned);
                jsonValid = true;
              } catch (err) {
                jsonValid = false;
                jsonError = err instanceof Error ? err.message : String(err);
                logger.warn("[Enhance] Invalid JSON output", {
                  modelId,
                  capability_mode,
                  error: jsonError,
                  sample: cleaned.slice(0, 200),
                });
              }
            }

            // Track API usage for cost analysis.
            // AI SDK v6 uses inputTokens/outputTokens (v5 was
            // promptTokens/completionTokens). We keep the legacy names as a
            // fallback so older SDK versions don't silently log zeros.
            const usage = usageCopy as
              | {
                  inputTokens?: number;
                  outputTokens?: number;
                  promptTokens?: number;
                  completionTokens?: number;
                }
              | undefined;
            trackApiUsage({
              userId: userId,
              modelId,
              inputTokens: usage?.inputTokens ?? usage?.promptTokens ?? 0,
              outputTokens: usage?.outputTokens ?? usage?.completionTokens ?? 0,
              durationMs,
              endpoint: "enhance",
              cacheHit: false,
            });

            // Store successful (non-empty) generations in the result cache so
            // future identical requests can skip the LLM entirely. Fire-and-
            // forget — cache failures must not break the response. We do not
            // cache empty or errored outputs (those will be refunded below).
            if (cacheKey && textCopy.length > 0 && finishReasonCopy !== "error") {
              setCached(cacheKey, {
                text: textCopy,
                modelId,
                cachedAt: Date.now(),
              });
            }

            // Refund on genuinely failed generations: empty output, error
            // finish reason, OR finishReason === 'length' (output was
            // truncated mid-stream by the token ceiling). A truncated
            // research/enhance output routinely breaks the [GENIUS_QUESTIONS]
            // JSON and cuts sections mid-word — the user should not be
            // charged for that. Short valid responses with finishReason
            // === 'stop' are legitimate and do NOT trigger a refund.
            const isTruncated = finishReasonCopy === "length";
            const shouldRefund =
              textCopy.length === 0 || finishReasonCopy === "error" || isTruncated;
            if (shouldRefund) {
              if (userId) {
                await refundCredit(userId);
              } else if (guestId && !isRefinement) {
                await refundGuestCredit(guestId);
              }
              logger.warn("[Enhance] Failed/truncated generation, refunding credit", {
                userId,
                guestId,
                length: textCopy.length,
                finishReason: finishReasonCopy,
                truncated: isTruncated,
                task: resolvedTask,
              });
            }

            if (userId && supabase) {
              // Save to history table so admin can see actual prompts
              await queryClient
                .from("history")
                .insert({
                  user_id: userId,
                  prompt,
                  enhanced_prompt: textCopy,
                  tone,
                  category,
                  capability_mode: capability_mode || "STANDARD",
                  title: prompt.slice(0, 60),
                  source: bearerToken?.startsWith("prk_")
                    ? "api"
                    : bearerToken
                      ? "extension"
                      : "web",
                  input_source: inputSource,
                  cost_funnel_stage: 3,
                  updated_at: new Date().toISOString(),
                })
                .then(({ error: histErr }) => {
                  if (histErr) logger.warn("[Enhance] History insert failed:", histErr.message);
                });

              await queryClient
                .from("activity_logs")
                .insert({
                  user_id: userId,
                  action: isRefinement ? "Prmpt Refine" : "Prmpt Enhance",
                  entity_type: "prompt",
                  details: {
                    mode,
                    model: modelId,
                    latency_ms: durationMs,
                    tokens: usageCopy,
                    prompt_length: prompt.length,
                    result_length: textCopy.length,
                    tone,
                    category,
                    capability_mode: capability_mode || "STANDARD",
                    target_model: target_model || "general",
                    is_refinement: isRefinement,
                    has_context: !!(contextAttachments && contextAttachments.length > 0),
                    context_count: contextAttachments?.length || 0,
                    attachment_tokens_est: (contextAttachments || []).reduce(
                      (sum, c) => sum + (c.tokenCount || 0),
                      0,
                    ),
                    iteration: iteration || 0,
                    // JSON mode observability: lets the admin audit page
                    // compute "invalid JSON rate" by filtering on
                    // details->>json_valid = 'false'.
                    json_output: isJsonOutput,
                    json_valid: jsonValid,
                    json_error: jsonError,
                    // Memory injection telemetry — see InjectionStats
                    // in src/lib/engines/types.ts. Lets us A/B-test the
                    // L2/L3 layers by joining on these fields.
                    injection: engineOutput.injectionStats || null,
                  },
                })
                .then(({ error: actErr }) => {
                  if (actErr) logger.warn("[Enhance] Activity log insert failed:", actErr.message);
                });

              // L0 fact extraction — fire-and-forget, never blocks response
              if (!isRefinement && textCopy.length > 0) {
                extractFacts(prompt)
                  .then((facts) => {
                    if (facts.length > 0) mergeFactsForUser(userId!, facts);
                  })
                  .catch(() => {});
              }

              try {
                const { count } = await queryClient
                  .from("activity_logs")
                  .select("*", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .in("action", ["Prmpt Enhance", "Prmpt Refine"]);

                if (count && count % 20 === 0) {
                  await enqueueJob("style_analysis", { userId: userId });
                }

                await enqueueJob("achievement_check", { userId: userId });
              } catch (bgError) {
                logger.error("[EnhanceAPI] Error enqueuing background jobs:", bgError);
              }
            }
          } finally {
            await lock.release();
          }
        });
      },
    });

    const streamResp = result.toTextStreamResponse();
    if (guestId && guestNeedsCookie) {
      streamResp.headers.append("Set-Cookie", buildGuestCookieHeader(guestId));
    }
    return streamResp;
  } catch (error) {
    // Release the in-flight lock on any error path so the next retry is
    // not blocked by a 10s stale lock. Happy path releases inside after().
    if (releaseInflightLock) {
      try {
        await releaseInflightLock();
      } catch {
        /* best effort */
      }
    }

    // Handle concurrency limit (server too busy)
    if (error instanceof ConcurrencyError) {
      logger.warn("[EnhanceAPI] Concurrency limit reached:", error.message);
      // Refund credit since we never called AI
      if (userId) {
        await refundCredit(userId);
      } else if (guestId && !isRefinementOuter) {
        await refundGuestCredit(guestId);
      }
      return NextResponse.json(
        { error: "השרת עמוס כרגע. נסה שוב בעוד כמה שניות." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }

    logger.error("[EnhanceAPI] Error:", error);
    // Best-effort credit refund on failure
    if (userId) {
      await refundCredit(userId);
    } else if (guestId && !isRefinementOuter) {
      await refundGuestCredit(guestId);
    }
    return NextResponse.json(
      { error: "שגיאת שרת פנימית, אנא נסה שוב", code: "internal_error" },
      { status: 500 },
    );
  }
}

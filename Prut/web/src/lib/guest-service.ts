/**
 * Guest credit service — Redis-backed rolling 24h quota for anonymous users.
 *
 * Guests get 1 prompt per 24h window. Tracking is by HttpOnly cookie
 * `peroot_guest_id` (UUID) with an IP-hash backup to blunt trivial
 * cookie-clearing abuse.
 *
 * Keys:
 *   guest:<uuid>          JSON { credits_balance, last_prompt_at } TTL 31d
 *   guest:ip:<ip_hash>    <uuid> — maps recent IP back to its guest id (TTL 24h)
 */

import { randomUUID, createHash } from "crypto";
import { isIP } from "net";
import type { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Kill switch: site_settings.allow_guest_access, cached per instance for 60s
// so the enhance hot path pays one DB read a minute, not one per request.
// Fails CLOSED (guests denied): a kill switch that cannot be read must not
// be assumed to be off.
// ---------------------------------------------------------------------------

let guestAccessCache: { value: boolean; ts: number } | null = null;

export async function isGuestAccessAllowed(): Promise<boolean> {
  if (guestAccessCache && Date.now() - guestAccessCache.ts < 60_000) {
    return guestAccessCache.value;
  }
  try {
    const { data } = await createServiceClient()
      .from("site_settings")
      .select("allow_guest_access")
      .limit(1)
      .maybeSingle();
    // Explicit === true: a null/missing column must not read as "open".
    const value = data?.allow_guest_access === true;
    guestAccessCache = { value, ts: Date.now() };
    return value;
  } catch (e) {
    // FAIL CLOSED. This is a kill switch: if we cannot confirm it is on, the
    // safe answer is that guests are locked out (the pre-guest-access
    // behavior, which costs signups and nothing else). Failing open meant a
    // Supabase blip silently re-opened an unauthenticated LLM endpoint.
    logger.error("[GuestService] allow_guest_access read failed, denying guests:", e);
    return false;
  }
}

const GUEST_COOKIE = "peroot_guest_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The guest cookie is HttpOnly, which stops scripts from READING it — it does
 * nothing to stop a caller from WRITING it. An unsigned cookie meant the
 * quota key was client-chosen, so rotating it per request reset the balance
 * every time and the credit system bounded nothing. The value is therefore
 * signed: `<uuid>.<hmac>`, and an id we did not mint is refused.
 */
function guestSecret(): string {
  const salt = process.env.GUEST_IP_SALT;
  if (!salt && process.env.NODE_ENV === "production") {
    logger.error("[guest-service] GUEST_IP_SALT missing: guest cookies are forgeable.");
  }
  return salt || "peroot_guest_salt_v1";
}

function signGuestId(id: string): string {
  return createHash("sha256").update(`${guestSecret()}:sig:${id}`).digest("hex").slice(0, 24);
}

/** Cookie value for a freshly minted id. */
export function encodeGuestCookieValue(id: string): string {
  return `${id}.${signGuestId(id)}`;
}

/** Returns the id only when the signature verifies. */
function decodeGuestCookieValue(raw: string): string | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!UUID_RE.test(id)) return null;
  const expected = signGuestId(id);
  // Constant-time-ish: lengths are fixed, and a mismatch reveals nothing
  // useful since the id is public anyway.
  return sig === expected ? id : null;
}
const GUEST_DAILY_LIMIT = 1;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const GUEST_KEY_TTL = 60 * 60 * 24 * 31; // 31 days
const IP_BACKUP_TTL = 60 * 60 * 24; // 24h — enough for the rolling window

interface GuestState {
  credits_balance: number;
  last_prompt_at: string | null; // ISO
}

interface GuestCheckResult {
  allowed: boolean;
  remaining: number;
  refreshAt: Date | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// IP helpers
// ---------------------------------------------------------------------------

function getRequestIp(request: NextRequest | Request): string | null {
  const headers = request.headers;
  // On Vercel, x-real-ip is set by the platform edge and is not forwarded
  // from the client — prefer it over x-forwarded-for which is a
  // client-controllable header on non-Vercel deployments.
  const real = headers.get("x-real-ip");
  if (real) {
    const trimmed = real.trim();
    if (isIP(trimmed)) return trimmed;
  }
  // The RIGHTMOST x-forwarded-for entry, not the first: proxies APPEND the
  // true client IP, so entry [0] is whatever the caller typed. The enhance
  // route already parses it this way; both places now agree, and both
  // validate with net.isIP() rather than a loose shape regex (which accepted
  // "deadbeef" and "999.999.999.999").
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const last = fwd.split(",").at(-1)?.trim();
    if (last && isIP(last)) return last;
  }
  return null;
}

let warnedMissingSalt = false;
function hashIp(ip: string): string {
  const salt = process.env.GUEST_IP_SALT;
  if (!salt) {
    if (!warnedMissingSalt && process.env.NODE_ENV === "production") {
      logger.warn(
        "[guest-service] GUEST_IP_SALT is not set, IP hashes are trivially reversible. Set a random 32+ char value in env.",
      );
      warnedMissingSalt = true;
    }
    return createHash("sha256").update(`peroot_guest_salt_v1:${ip}`).digest("hex").slice(0, 32);
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Guest id resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the guest id from cookie, falling back to IP-hash backup.
 * Returns { id, needsCookie } — the caller must call `applyGuestCookie`
 * on the outgoing response when `needsCookie` is true.
 */
export async function resolveGuestId(
  request: NextRequest | Request,
): Promise<{ id: string; needsCookie: boolean }> {
  const cookieHeader = request.headers.get("cookie") || "";
  // Anchor on start-of-string or `; ` so `fake_peroot_guest_id=...` can't hijack.
  const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`));
  const cookieId = cookieMatch?.[1] ? decodeGuestCookieValue(cookieMatch[1]) : null;
  if (cookieId) {
    // Claim the IP backup only when it is unset. Overwriting it let a caller
    // pin an already-exhausted id onto a shared egress IP (office NAT), which
    // exhausted every other visitor behind it.
    claimIpBackupIfUnset(request, cookieId).catch(() => {});
    return { id: cookieId, needsCookie: false };
  }

  const ip = getRequestIp(request);
  if (ip) {
    const ipKey = `guest:ip:${hashIp(ip)}`;
    try {
      const existing = await redis.get<string>(ipKey);
      if (existing) {
        return { id: existing, needsCookie: true };
      }

      // TOCTOU guard: two concurrent requests from the same IP with no
      // cookie could both mint a fresh UUID and each get their own quota.
      // Use SET NX EX to atomically claim the slot — whoever loses the
      // race reads the winner's UUID and reuses it.
      const candidate = randomUUID();
      const set = (await redis.set(ipKey, candidate, {
        nx: true,
        ex: IP_BACKUP_TTL,
      })) as "OK" | null;
      if (set === "OK") {
        return { id: candidate, needsCookie: true };
      }
      const winner = await redis.get<string>(ipKey);
      if (winner) {
        return { id: winner, needsCookie: true };
      }
    } catch (e) {
      logger.error("[guest-service] IP backup lookup failed:", e);
    }
  }

  // Fall-through: no IP available or Redis failure — fresh id, best-effort write.
  const id = randomUUID();
  claimIpBackupIfUnset(request, id).catch(() => {});
  return { id, needsCookie: true };
}

/** Write the guest id cookie on a NextResponse. */
export function applyGuestCookie(response: NextResponse, id: string): void {
  response.cookies.set(GUEST_COOKIE, encodeGuestCookieValue(id), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Build a raw Set-Cookie header value for use on `Response` (non-Next) objects. */
export function buildGuestCookieHeader(id: string): string {
  const parts = [
    `${GUEST_COOKIE}=${encodeGuestCookieValue(id)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/**
 * Claim the IP-hash backup for this id ONLY if no id is bound yet (NX).
 * Never overwrites: an unconditional write let a caller re-point a shared
 * egress IP at an exhausted id and starve everyone behind that NAT.
 */
async function claimIpBackupIfUnset(request: NextRequest | Request, id: string): Promise<void> {
  const ip = getRequestIp(request);
  if (!ip) return;
  try {
    await redis.set(`guest:ip:${hashIp(ip)}`, id, { nx: true, ex: IP_BACKUP_TTL });
  } catch (e) {
    logger.error("[guest-service] IP backup write failed:", e);
  }
}

// ---------------------------------------------------------------------------
// State read/write
// ---------------------------------------------------------------------------

async function readGuestState(guestId: string): Promise<GuestState> {
  try {
    // New format: hash fields { b: balance, t: last_prompt_ms }
    const hash = (await redis.hgetall(`guest:${guestId}`)) as Record<string, string> | null;
    if (hash && (hash.b !== undefined || hash.t !== undefined)) {
      const b = Number(hash.b);
      const t = Number(hash.t);
      return {
        credits_balance: Number.isFinite(b) ? b : GUEST_DAILY_LIMIT,
        last_prompt_at: Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null,
      };
    }

    // Legacy JSON fallback — tolerate existing keys from prior format.
    const raw = await redis.get<GuestState | string>(`guest:${guestId}`);
    if (!raw) return { credits_balance: GUEST_DAILY_LIMIT, last_prompt_at: null };
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as GuestState;
      } catch {
        return { credits_balance: GUEST_DAILY_LIMIT, last_prompt_at: null };
      }
    }
    return raw;
  } catch (e) {
    logger.error("[guest-service] readGuestState failed:", e);
    return { credits_balance: GUEST_DAILY_LIMIT, last_prompt_at: null };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Atomic Lua script: applies the rolling 24h reset then decrements in a
 * single round-trip so two concurrent requests on the same guest id can't
 * both be allowed.
 *
 * KEYS[1] = guest:<id>
 * ARGV    = now_ms, window_ms, daily_limit, ttl_seconds
 * Returns [allowed:0|1, balance_after, last_prompt_ms]
 */
const DECREMENT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local b_raw = redis.call('HGET', key, 'b')
local t_raw = redis.call('HGET', key, 't')
local b = tonumber(b_raw)
local t = tonumber(t_raw)
if b == nil then b = limit end
if t == nil then t = 0 end

if t > 0 and (now - t) >= window then
  b = limit
end

if b < 1 then
  return {0, b, t}
end

b = b - 1
redis.call('HSET', key, 'b', b, 't', now)
redis.call('EXPIRE', key, ttl)
return {1, b, now}
`;

export async function checkAndDecrementGuestCredits(guestId: string): Promise<GuestCheckResult> {
  const now = Date.now();
  try {
    const result = (await redis.eval(
      DECREMENT_SCRIPT,
      [`guest:${guestId}`],
      [String(now), String(ROLLING_WINDOW_MS), String(GUEST_DAILY_LIMIT), String(GUEST_KEY_TTL)],
    )) as [number, number, number];

    const [allowed, balance, lastMs] = result;

    if (!allowed) {
      const refreshAt = lastMs > 0 ? new Date(lastMs + ROLLING_WINDOW_MS) : null;
      return {
        allowed: false,
        remaining: 0,
        refreshAt,
        error: "Guest quota exhausted",
      };
    }

    return {
      allowed: true,
      remaining: balance,
      refreshAt: new Date(now + ROLLING_WINDOW_MS),
    };
  } catch (e) {
    logger.error("[guest-service] eval-based decrement failed, falling back:", e);
    // Non-atomic fallback (e.g. if Redis eval is unavailable): best-effort RMW.
    // NOTE: readGuestState itself fails open (returns a full balance) — that is
    // handled below, where an unconfirmed write denies the request.
    const state = await readGuestState(guestId);
    const last = state.last_prompt_at ? new Date(state.last_prompt_at) : null;
    const shouldReset = !last || now - last.getTime() >= ROLLING_WINDOW_MS;
    let balance = shouldReset ? GUEST_DAILY_LIMIT : state.credits_balance;
    if (balance < 1) {
      return {
        allowed: false,
        remaining: 0,
        refreshAt: last ? new Date(last.getTime() + ROLLING_WINDOW_MS) : null,
        error: "Guest quota exhausted",
      };
    }
    balance -= 1;
    try {
      await redis.hset(`guest:${guestId}`, { b: balance, t: now });
      await redis.expire(`guest:${guestId}`, GUEST_KEY_TTL);
    } catch (writeErr) {
      // FAIL CLOSED for unauthenticated callers. If the spend cannot be
      // recorded, allowing the request turns a Redis outage into an
      // unmetered public LLM proxy: every retry reads a full balance and
      // every write is swallowed. Registered users keep failing open, since
      // their ledger lives in Postgres.
      logger.error("[guest-service] fallback write failed, denying guest:", writeErr);
      return {
        allowed: false,
        remaining: 0,
        refreshAt: null,
        error: "Guest quota unavailable",
      };
    }
    return {
      allowed: true,
      remaining: balance,
      refreshAt: new Date(now + ROLLING_WINDOW_MS),
    };
  }
}

/**
 * Read-only quota status for the UI. Does not mutate state. Applies the
 * rolling reset in-memory so the UI sees a fresh balance at/after the
 * refresh boundary.
 */
export async function getGuestQuotaStatus(
  guestId: string,
): Promise<{ remaining: number; refreshAt: Date | null; dailyLimit: number }> {
  const state = await readGuestState(guestId);
  const now = Date.now();
  const last = state.last_prompt_at ? new Date(state.last_prompt_at).getTime() : null;
  const msSinceLast = last ? now - last : Infinity;
  const shouldReset = msSinceLast >= ROLLING_WINDOW_MS;

  if (shouldReset) {
    return { remaining: GUEST_DAILY_LIMIT, refreshAt: null, dailyLimit: GUEST_DAILY_LIMIT };
  }

  const refreshAt = last ? new Date(last + ROLLING_WINDOW_MS) : null;
  return {
    remaining: state.credits_balance,
    refreshAt: state.credits_balance > 0 ? null : refreshAt,
    dailyLimit: GUEST_DAILY_LIMIT,
  };
}

/**
 * Refund one credit to a guest, bounded by DAILY_LIMIT so a runaway refund
 * path can't grant unlimited quota. Mirrors refundCredit() for authed users
 * — called on cache hits and truncated/failed generations where the guest
 * was charged but no useful work was done.
 */
const REFUND_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local b_raw = redis.call('HGET', key, 'b')
local b = tonumber(b_raw)
if b == nil then b = 0 end
b = b + 1
if b > limit then b = limit end
redis.call('HSET', key, 'b', b)
redis.call('EXPIRE', key, ttl)
return b
`;

export async function refundGuestCredit(guestId: string): Promise<void> {
  try {
    await redis.eval(
      REFUND_SCRIPT,
      [`guest:${guestId}`],
      [String(GUEST_DAILY_LIMIT), String(GUEST_KEY_TTL)],
    );
  } catch (e) {
    logger.error("[guest-service] refundGuestCredit failed:", e);
  }
}

export const GUEST_CONSTANTS = {
  COOKIE_NAME: GUEST_COOKIE,
  DAILY_LIMIT: GUEST_DAILY_LIMIT,
  ROLLING_WINDOW_MS,
};

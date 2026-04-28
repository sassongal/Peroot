"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Crown, Shield, Sparkles } from "lucide-react";
import { logger } from "@/lib/logger";

interface Quota {
  plan_tier: "free" | "pro" | "admin";
  credits_balance: number;
  daily_limit: number;
  refresh_at: string | null;
}

interface LedgerEntry {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  source: string;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  registration_bonus: "בונוס הרשמה",
  daily_reset: "איפוס יומי",
  subscription_grant: "מנוי Pro",
  spend: "שימוש",
  refund: "החזר",
  admin_grant: "הענקת מנהל",
  admin_revoke: "שלילה ע״י מנהל",
  admin_tier_change: "שינוי מסלול",
  churn_revoke: "ביטול מנוי",
  referral_bonus: "בונוס הפניה",
};

function timeLeft(toIso: string): string {
  const ms = new Date(toIso).getTime() - Date.now();
  if (ms <= 0) return "מתחדש כעת";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}ש ${m}ד ${s}ש`;
}

export function CreditsPanel() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qRes, lRes] = await Promise.all([
          fetch("/api/me/quota", { credentials: "include" }),
          fetch("/api/me/credits/ledger", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (qRes.ok) setQuota(await qRes.json());
        if (lRes.ok) {
          const json = await lRes.json();
          setLedger(json.entries ?? []);
        }
      } catch (e) {
        logger.error("[CreditsPanel] load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!quota?.refresh_at) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [quota?.refresh_at]);

  if (loading || !quota) {
    return (
      <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-8 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-12 w-24 bg-zinc-800 rounded" />
      </div>
    );
  }

  const tier = quota.plan_tier;
  const tierBadge =
    tier === "admin" ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
        <Shield className="w-3 h-3" /> מנהל
      </span>
    ) : tier === "pro" ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
        <Crown className="w-3 h-3" /> Pro
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800/60 border border-white/5 text-zinc-300 text-[10px] font-black uppercase tracking-widest">
        <Sparkles className="w-3 h-3" /> חינמי
      </span>
    );

  void tick;

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-8 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-3">
          <Coins className="w-4 h-4 text-amber-400" />
          קרדיטים
        </h3>
        {tierBadge}
      </div>

      <div className="flex items-end gap-4">
        {tier === "admin" ? (
          <span className="text-5xl font-black text-blue-400">∞</span>
        ) : (
          <span className="text-5xl font-black text-white">{quota.credits_balance}</span>
        )}
        {tier === "free" && (
          <span className="text-xs text-zinc-500 mb-2">/ {quota.daily_limit} ביום</span>
        )}
      </div>

      {tier === "admin" && <p className="text-xs text-zinc-400">חשבון מנהל — ללא הגבלת שימוש.</p>}

      {tier === "free" && quota.refresh_at && (
        <p className="text-xs text-zinc-500">
          חידוש בעוד <span className="text-amber-400 font-mono">{timeLeft(quota.refresh_at)}</span>
        </p>
      )}

      {tier === "free" && (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
        >
          שדרג ל-Pro
        </Link>
      )}
      {tier === "pro" && (
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
        >
          ניהול מנוי
        </Link>
      )}

      {ledger.length > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-2">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            פעילות אחרונה
          </span>
          <ul className="space-y-1.5">
            {ledger.map((e) => {
              const positive = e.delta > 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/2 border border-white/5"
                >
                  <span className="text-xs font-bold text-zinc-300">
                    {REASON_LABELS[e.reason] ?? e.reason}
                  </span>
                  <span
                    className={
                      positive
                        ? "text-xs font-mono text-emerald-400"
                        : "text-xs font-mono text-red-400"
                    }
                  >
                    {positive ? "+" : ""}
                    {e.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

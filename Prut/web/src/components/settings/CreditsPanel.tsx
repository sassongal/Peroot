"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { fetchMeQuota } from "@/lib/quota-client";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface Quota {
  plan_tier: "free" | "pro" | "admin";
  credits_balance: number;
  daily_limit: number;
  refresh_at: string | null;
  /** Live referral-bonus bucket (0 when expired/absent). */
  bonus_credits?: number;
  bonus_expires_at?: string | null;
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
  admin_revoke: "שלילה על ידי מנהל",
  admin_tier_change: "שינוי מסלול",
  churn_revoke: "ביטול מנוי",
  referral_bonus: "בונוס הפניה",
};

/** "בעוד 3 שעות ו-12 דקות": hours and minutes, no seconds ticking. */
function timeLeft(toIso: string): string {
  const ms = new Date(toIso).getTime() - Date.now();
  if (ms <= 0) return "מתחדש כעת";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const hours = h === 1 ? "שעה" : h === 2 ? "שעתיים" : h > 0 ? `${h} שעות` : "";
  const minutes = m === 1 ? "דקה" : m === 2 ? "שתי דקות" : `${m} דקות`;
  return hours ? `בעוד ${hours} ו-${minutes}` : `בעוד ${minutes}`;
}

/**
 * The credit balance and its ledger, under "מנוי וקרדיטים".
 *
 * This card used to repeat the plan badge and the upgrade button that the
 * billing card right above it already shows, and linked to a page that does
 * not exist. It now does one thing: the number, when it refreshes, and what
 * moved it. The plan and the upgrade live in the billing card.
 */
export function CreditsPanel() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [q, lRes] = await Promise.all([
          fetchMeQuota(),
          fetch("/api/me/credits/ledger", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (q) setQuota(q);
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

  // The countdown shows hours and minutes, so once a minute is enough.
  useEffect(() => {
    if (!quota?.refresh_at) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [quota?.refresh_at]);

  if (loading || !quota) {
    return (
      <div
        className="rounded-2xl border border-(--glass-border) bg-(--glass-bg) p-5 animate-pulse motion-reduce:animate-none"
        aria-busy="true"
        aria-label="טוען קרדיטים"
      >
        <div className="h-5 w-32 bg-(--glass-border) rounded mb-4" />
        <div className="h-10 w-20 bg-(--glass-border) rounded" />
      </div>
    );
  }

  const tier = quota.plan_tier;

  return (
    <div className="rounded-2xl border border-(--glass-border) bg-(--glass-bg) p-5 space-y-4">
      <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
        <Coins className="w-4 h-4 text-amber-500" aria-hidden="true" />
        קרדיטים
      </h3>

      <div className="flex items-baseline gap-2">
        {tier === "admin" ? (
          <span
            className="text-4xl font-bold font-mono text-(--text-primary)"
            aria-label="ללא הגבלה"
          >
            ∞
          </span>
        ) : (
          <span className="text-4xl font-bold font-mono text-(--text-primary)">
            {quota.credits_balance}
          </span>
        )}
        {tier === "free" ? (
          <span className="text-sm text-(--text-muted)">מתוך {quota.daily_limit} להיום</span>
        ) : tier === "pro" ? (
          <span className="text-sm text-(--text-muted)">נותרו מהמכסה החודשית</span>
        ) : (
          <span className="text-sm text-(--text-muted)">חשבון מנהל, ללא מדידה</span>
        )}
        {/* The referral bonus is a second bucket, spent after the daily one.
            Without this line a user whose daily ran out saw "נגמרו להיום"
            while sitting on live bonus credits nobody showed them. */}
        {(quota.bonus_credits ?? 0) > 0 ? (
          <span className="text-sm font-semibold text-amber-500">
            + {quota.bonus_credits} בונוס הפניות
          </span>
        ) : null}
      </div>

      {tier === "free" && quota.refresh_at ? (
        <p className="text-xs text-(--text-muted)">
          המכסה מתחדשת {timeLeft(quota.refresh_at)}. קרדיטים שלא נוצלו לא נצברים.
        </p>
      ) : null}

      {ledger.length > 0 ? (
        <div className="pt-3 border-t border-(--glass-border) space-y-2">
          <h4 className="text-xs font-medium text-(--text-muted)">תנועות אחרונות</h4>
          <ul className="space-y-1.5">
            {ledger.map((e) => {
              const positive = e.delta > 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-(--glass-bg) border border-(--glass-border)"
                >
                  <span className="text-xs text-(--text-secondary)">
                    {REASON_LABELS[e.reason] ?? e.reason}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-mono",
                      positive ? "text-emerald-700 dark:text-emerald-300" : "text-(--text-muted)",
                    )}
                    dir="ltr"
                  >
                    {positive ? "+" : ""}
                    {e.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-(--text-muted)">עוד אין תנועות. השיפור הראשון יופיע כאן.</p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle, Check, Crown, ExternalLink, Zap } from "lucide-react";
import type { Subscription } from "@/hooks/useSubscription";
import { PLANS } from "@/lib/lemonsqueezy";
import { useQuotaPolicy } from "@/context/QuotaPolicyContext";
import { creditsPhrase } from "@/lib/quota-policy";
import { formatDateHe } from "@/lib/dates/format";

interface SettingsBillingSectionProps {
  billingSuccess: boolean;
  isPro: boolean;
  subscription: Subscription;
  portalUrl: string;
}

/**
 * The plan card. One primary action per state: upgrade for free users, the
 * LemonSqueezy portal for Pro (cancellation lives there too, so the old
 * red "ביטול מנוי" button that opened the same page is gone). The Pro
 * bullets come from PLANS so this list and the pricing page cannot drift.
 */
export function SettingsBillingSection({
  billingSuccess,
  isPro,
  subscription,
  portalUrl,
}: SettingsBillingSectionProps) {
  const { freeDaily } = useQuotaPolicy();

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-billing-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-billing-heading" className="text-xl font-bold">
          מנוי וקרדיטים
        </h2>
        <p className="text-sm text-(--text-muted)">התוכנית שלכם, החיוב, והקרדיטים שנותרו</p>
      </header>

      {billingSuccess ? (
        <div
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3"
          role="status"
        >
          <Check
            className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm text-emerald-800 dark:text-emerald-200">
            תודה שהצטרפתם ל-Peroot Pro. השינוי נכנס לתוקף תוך דקות ספורות.
          </span>
        </div>
      ) : null}

      <div
        className={
          isPro
            ? "p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 space-y-4"
            : "p-5 rounded-2xl border border-(--glass-border) bg-(--glass-bg) space-y-4"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={
                isPro
                  ? "w-10 h-10 shrink-0 rounded-full bg-amber-500/15 flex items-center justify-center"
                  : "w-10 h-10 shrink-0 rounded-full bg-(--glass-border) flex items-center justify-center"
              }
            >
              {isPro ? (
                <Crown className="w-5 h-5 text-amber-500" aria-hidden="true" />
              ) : (
                <Zap className="w-5 h-5 text-(--text-muted)" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-(--text-primary)">
                {isPro ? "Peroot Pro" : "תוכנית חינם"}
              </h3>
              <p className="text-xs text-(--text-muted)">
                {isPro
                  ? subscription.ends_at
                    ? `פעיל עד ${formatDateHe(subscription.ends_at)}`
                    : subscription.renews_at
                      ? `פעיל, מתחדש ב-${formatDateHe(subscription.renews_at)}`
                      : "פעיל"
                  : `${creditsPhrase(freeDaily)} ביום, מתחדשים כל יום`}
              </p>
            </div>
          </div>
          {isPro ? (
            <span className="shrink-0 px-2.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold rounded-full border border-amber-500/30">
              Pro
            </span>
          ) : null}
        </div>

        {isPro ? (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-(--glass-border) bg-(--surface-panel) text-(--text-primary) font-medium text-sm hover:border-amber-500/40 transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>ניהול המנוי, אמצעי התשלום והחשבוניות</span>
          </a>
        ) : (
          <Link
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
          >
            <Crown className="w-4 h-4" aria-hidden="true" />
            <span>שדרוג ל-Pro, ₪{PLANS.pro.price} לחודש</span>
          </Link>
        )}
      </div>

      {isPro && subscription.ends_at ? (
        <div
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3"
          role="status"
        >
          <AlertTriangle
            className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            המנוי בוטל ויסתיים ב-{formatDateHe(subscription.ends_at)}. עד אז הכול נשאר פתוח, ואחר כך
            החשבון עובר לתוכנית החינם.
          </p>
        </div>
      ) : null}

      {isPro && !subscription.ends_at ? (
        <p className="text-xs text-(--text-muted)">
          ביטול נעשה מדף ניהול המנוי ונכנס לתוקף בסוף תקופת החיוב הנוכחית. הגישה ל-Pro נשמרת עד אז.
        </p>
      ) : null}

      {!isPro ? (
        <div className="p-5 bg-(--glass-bg) border border-(--glass-border) rounded-2xl space-y-3">
          <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" aria-hidden="true" />
            מה מקבלים ב-Pro
          </h3>
          <ul className="space-y-2 text-sm text-(--text-secondary)">
            {PLANS.pro.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

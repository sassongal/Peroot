"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Crown,
  Trash2,
  Zap,
} from "lucide-react";
import type { Subscription } from "@/hooks/useSubscription";

interface SettingsBillingSectionProps {
  billingSuccess: boolean;
  isPro: boolean;
  subscription: Subscription;
  portalUrl: string;
}

export function SettingsBillingSection({
  billingSuccess,
  isPro,
  subscription,
  portalUrl,
}: SettingsBillingSectionProps) {
  return (
    <section className="space-y-6 animate-in fade-in duration-300" aria-labelledby="settings-billing-heading">
      <header className="space-y-1">
        <h2 id="settings-billing-heading" className="text-xl font-bold">
          מנוי וחיוב
        </h2>
        <p className="text-sm text-slate-500">נהל את המנוי והתשלום שלך</p>
      </header>

      {billingSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400 shrink-0" />
          <span className="text-sm text-green-300">
            תודה שהצטרפת ל-Peroot Pro! ייתכן שהשינוי ייכנס לתוקף תוך מספר דקות.
          </span>
        </div>
      )}

      <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPro ? (
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">{isPro ? "Peroot Pro" : "תוכנית חינם"}</h3>
              <p className="text-xs text-slate-500">
                {isPro
                  ? `סטטוס: פעיל${subscription.renews_at ? ` · מתחדש ב-${new Date(subscription.renews_at).toLocaleDateString("he-IL")}` : ""}`
                  : "2 קרדיטים ביום"}
              </p>
            </div>
          </div>
          {isPro && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
              PRO
            </span>
          )}
        </div>

        {!isPro && (
          <Link
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
          >
            <Crown className="w-4 h-4" />
            <span>שדרג ל-Pro - ₪3.99/חודש</span>
          </Link>
        )}

        {isPro && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-xl transition-colors text-sm border border-amber-500/20"
            >
              <CreditCard className="w-4 h-4" />
              <span>ניהול מנוי</span>
            </a>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors text-sm border border-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>ביטול מנוי</span>
            </a>
          </div>
        )}
      </div>

      {!isPro && (
        <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
          <h3 className="font-semibold text-amber-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            מה כולל Pro?
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              150 קרדיטים בחודש
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              גישה לכל המנועים המתקדמים
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              שיפור איטרטיבי מתקדם
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ספריה אישית + מועדפים ללא הגבלה
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              תוסף Chrome עם סנכרון מלא
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              תמיכה בעדיפות
            </li>
          </ul>
        </div>
      )}

      {isPro && subscription.ends_at && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-300">
            המנוי שלך בוטל ויסתיים ב-{new Date(subscription.ends_at).toLocaleDateString("he-IL")}. לאחר מכן תעבור לתוכנית החינם.
          </p>
        </div>
      )}

      {isPro && !subscription.ends_at && (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ביטול יכנס לתוקף בסוף תקופת החיוב הנוכחית
          </p>
          <p className="text-xs text-slate-600">
            לביטול המנוי לחץ על &quot;ביטול מנוי&quot; למעלה. הגישה ל-Pro תישמר עד סוף תקופת החיוב הנוכחית.
          </p>
        </div>
      )}

      {!isPro && (
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">רוצה פרומפטים ללא הגבלה?</p>
            <p className="text-xs text-slate-500 mt-0.5">שדרג ל-Pro ב-₪3.99 בלבד לחודש</p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>שדרג ל-Pro</span>
          </Link>
        </div>
      )}
    </section>
  );
}

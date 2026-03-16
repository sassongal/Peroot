"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, X, Sparkles, Zap, ArrowRight, Crown, Shield, Chrome, Gift, Brain, RefreshCw, Library, Headphones, Bot } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { PLANS } from "@/lib/lemonsqueezy";
import { createClient } from "@/lib/supabase/client";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { ProBadge } from "@/components/ui/ProBadge";

const COMPARISON_FEATURES = [
  {
    name: "קרדיטים",
    free: "2 ביום",
    pro: "150 בחודש",
    icon: Sparkles,
  },
  {
    name: "מודלים בסיסיים (Gemini Flash)",
    free: true,
    pro: true,
    icon: Bot,
  },
  {
    name: "מודלים פרימיום (Gemini Pro, DeepSeek)",
    free: false,
    pro: true,
    icon: Crown,
  },
  {
    name: "שיפור איטרטיבי מתקדם",
    free: false,
    pro: true,
    icon: RefreshCw,
  },
  {
    name: "ספריית 480+ פרומפטים",
    free: true,
    pro: true,
    icon: Library,
  },
  {
    name: "ספריה אישית ללא הגבלה",
    free: false,
    pro: true,
    icon: Library,
  },
  {
    name: "למידת סגנון אישי (RAG)",
    free: false,
    pro: true,
    icon: Brain,
  },
  {
    name: "תוסף Chrome",
    free: true,
    pro: true,
    icon: Chrome,
  },
  {
    name: "סנכרון Chrome מלא",
    free: false,
    pro: true,
    icon: Chrome,
  },
  {
    name: "שיתוף פרומפטים",
    free: true,
    pro: true,
    icon: Zap,
  },
  {
    name: "תמיכה בעדיפות",
    free: false,
    pro: true,
    icon: Headphones,
  },
];

export default function PricingPage() {
  const { isPro, checkout, loading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [supabase]);

  const handleUpgrade = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setCheckoutLoading(true);
    try {
      await checkout();
    } catch {
      toast.error("שגיאה ביצירת תשלום. נסה שוב.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Back */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-12"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            שדרג את הפרומפטים שלך
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-linear-to-l from-white to-zinc-500 bg-clip-text text-transparent">
            בחר את התוכנית שלך
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            התחל בחינם, שדרג כשתרצה. כולל 4 ימי ניסיון חינם. ללא התחייבות.
          </p>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03]">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-300">
              <span className="font-bold text-white">50,000+</span> פרומפטים שודרגו על ידי המשתמשים שלנו
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8 flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{PLANS.free.nameHe}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">&#8362;0</span>
                <span className="text-slate-500 text-sm">/ לתמיד</span>
              </div>
              <p className="text-slate-500 text-sm mt-2">מושלם להתחלה</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PLANS.free.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-slate-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/"
              className="w-full py-3 rounded-xl border border-white/10 text-center text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors block"
            >
              התוכנית הנוכחית
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="rounded-3xl border-2 border-amber-500/40 bg-linear-to-b from-amber-500/5 to-zinc-950 p-8 flex flex-col relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-0 left-0 right-0 bg-linear-to-l from-amber-500 to-amber-600 text-black text-xs font-bold text-center py-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                הכי פופולרי
              </div>
            </div>

            <div className="mb-8 mt-4">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                {PLANS.pro.nameHe}
                <Zap className="w-5 h-5 text-amber-400" />
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">&#8362;{PLANS.pro.price}</span>
                <span className="text-slate-500 text-sm">/ חודש</span>
              </div>
              <p className="text-amber-400/80 text-sm mt-2">150 קרדיטים בחודש</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Gift className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-medium">4 ימי ניסיון חינם</span>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PLANS.pro.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            {isPro ? (
              <div className="w-full py-3 rounded-xl bg-amber-500/20 text-center text-sm font-medium text-amber-400 border border-amber-500/30">
                התוכנית הנוכחית שלך
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading || (loading && isLoggedIn !== false)}
                className="w-full py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {checkoutLoading ? "מעבד..." : isLoggedIn === false ? "התחבר ושדרג לפרו" : "שדרג לפרו"}
              </button>
            )}
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">השוואת תכונות מפורטת</h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/10">
              <div className="p-4 text-sm font-semibold text-slate-400">תכונה</div>
              <div className="p-4 text-sm font-semibold text-slate-300 text-center">חינם</div>
              <div className="p-4 text-sm font-semibold text-amber-400 text-center flex items-center justify-center gap-1.5">
                <ProBadge size="md" />
                פרו
              </div>
            </div>
            {/* Table Rows */}
            {COMPARISON_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className={`grid grid-cols-3 ${i < COMPARISON_FEATURES.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/[0.02] transition-colors`}
                >
                  <div className="p-4 flex items-center gap-2.5 text-sm text-slate-300">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    {feature.name}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {typeof feature.free === 'string' ? (
                      <span className="text-sm text-slate-400">{feature.free}</span>
                    ) : feature.free ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {typeof feature.pro === 'string' ? (
                      <span className="text-sm font-semibold text-amber-400">{feature.pro}</span>
                    ) : feature.pro ? (
                      <Check className="w-4 h-4 text-amber-400" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span>4 ימי ניסיון חינם</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>תשלום מאובטח</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>ביטול בכל עת</span>
          </div>
          <div className="flex items-center gap-2">
            <Chrome className="w-4 h-4" />
            <span>תוסף Chrome כלול</span>
          </div>
        </div>

        {/* Cross-links */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/features"
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/30 transition-colors group"
          >
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">מה כלול? ראו כל היכולות</p>
            <p className="text-xs text-slate-500 mt-1">5 מנועי AI, תמונות, סרטונים וסוכנים</p>
          </Link>
          <Link
            href="/examples"
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/30 transition-colors group"
          >
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">דוגמאות לפרומפטים שיוצרים</p>
            <p className="text-xs text-slate-500 mt-1">לפני ואחרי — שדרוג אמיתי</p>
          </Link>
          <Link
            href="/prompts"
            className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/30 transition-colors group"
          >
            <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">גישה לספריית 480+ תבניות</p>
            <p className="text-xs text-slate-500 mt-1">פרומפטים מוכנים ב-30+ קטגוריות</p>
          </Link>
        </div>

        {/* Credit system explanation */}
        <div className="max-w-2xl mx-auto mt-16 p-6 bg-zinc-900/50 border border-white/10 rounded-2xl">
          <h2 className="text-lg font-bold text-white mb-4 text-center">איך עובדת מערכת הקרדיטים?</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200">תוכנית חינם</h4>
              <p className="text-slate-400">מקבלים 2 קרדיטים ביום שמתחדשים אוטומטית ב-14:00. כל שדרוג פרומפט = קרדיט אחד.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-400">תוכנית Pro</h4>
              <p className="text-slate-400">150 קרדיטים בחודש שמתחדשים עם כל חיוב. גישה למודלים פרימיום + למידת סגנון אישי.</p>
            </div>
          </div>
        </div>
      </div>

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="נדרשת התחברות לשדרוג"
        message="כדי לשדרג לתוכנית Pro, יש להתחבר לחשבון שלך תחילה."
        feature="שדרוג לתוכנית Pro"
      />
    </div>
  );
}

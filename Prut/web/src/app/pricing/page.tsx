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
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

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
    name: "מצבים מתקדמים",
    free: "רגיל בלבד",
    pro: "מחקר, תמונה, סוכן, וידאו",
    icon: Zap,
  },
  {
    name: "שיפור איטרטיבי מתקדם",
    free: false,
    pro: true,
    icon: RefreshCw,
  },
  {
    name: `ספריית ${PROMPT_LIBRARY_COUNT} פרומפטים`,
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
    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Back */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit mb-12"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </Link>

        {/* Header */}
        <section className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            שדרג את הפרומפטים שלך
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-linear-to-l from-foreground to-zinc-500 bg-clip-text text-transparent">
            בחר את התוכנית שלך
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            התחל בחינם, שדרג כשתרצה. כולל יום ניסיון במתנה. ללא התחייבות.
          </p>
        </section>

        {/* Social Proof */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-border bg-secondary">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-foreground">
              <span className="font-bold text-foreground">50,000+</span> פרומפטים שודרגו על ידי המשתמשים שלנו
            </span>
          </div>
        </div>

        {/* Plans */}
        <section className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-foreground mb-2">{PLANS.free.nameHe}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">&#8362;0</span>
                <span className="text-muted-foreground text-sm">/ לתמיד</span>
              </div>
              <p className="text-muted-foreground text-sm mt-2">מושלם להתחלה</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PLANS.free.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="w-4 h-4 text-muted-foreground shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/"
              className="w-full py-3 rounded-xl border border-border text-center text-sm font-medium text-foreground hover:bg-secondary transition-colors block"
            >
              התוכנית הנוכחית
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="rounded-3xl border-2 border-amber-500/40 bg-linear-to-b from-amber-500/5 to-card p-6 md:p-8 flex flex-col relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-0 left-0 right-0 bg-linear-to-l from-amber-500 to-amber-600 text-black text-xs font-bold text-center py-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                הכי פופולרי
              </div>
            </div>

            <div className="mb-8 mt-4">
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                {PLANS.pro.nameHe}
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-400/80 line-through decoration-red-500/60 decoration-2">&#8362;9.99</span>
                <span className="text-4xl font-black text-foreground">&#8362;{PLANS.pro.price}</span>
                <span className="text-muted-foreground text-sm">/ חודש</span>
              </div>
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">מחיר השקה! עולה ל-&#8362;9.99 ב-1.5</span>
              </div>
              <p className="text-red-500 dark:text-red-400 text-xs font-medium mt-1.5">&#x23F0; המחיר עולה ב-1 במאי 2026</p>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-sm mt-2">150 קרדיטים בחודש</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Gift className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-medium">יום ניסיון במתנה</span>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PLANS.pro.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground">
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
        </section>

        {/* Feature Comparison Table */}
        <section className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">השוואת תכונות מפורטת</h2>
          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1.6fr_minmax(64px,auto)_minmax(72px,auto)] md:grid-cols-3 bg-secondary border-b border-border">
              <div className="p-3 md:p-4 text-xs md:text-sm font-semibold text-muted-foreground">תכונה</div>
              <div className="p-3 md:p-4 text-xs md:text-sm font-semibold text-foreground text-center">חינם</div>
              <div className="p-3 md:p-4 text-xs md:text-sm font-semibold text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1.5">
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
                  className={`grid grid-cols-[1.6fr_minmax(64px,auto)_minmax(72px,auto)] md:grid-cols-3 ${i < COMPARISON_FEATURES.length - 1 ? 'border-b border-border' : ''} hover:bg-secondary transition-colors`}
                >
                  <div className="p-3 md:p-4 flex items-center gap-2 md:gap-2.5 text-xs md:text-sm text-foreground leading-snug wrap-break-word">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="min-w-0">{feature.name}</span>
                  </div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {typeof feature.free === 'string' ? (
                      <span className="text-xs md:text-sm text-muted-foreground text-center">{feature.free}</span>
                    ) : feature.free ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                  <div className="p-3 md:p-4 flex items-center justify-center">
                    {typeof feature.pro === 'string' ? (
                      <span className="text-xs md:text-sm font-semibold text-amber-600 dark:text-amber-400 text-center">{feature.pro}</span>
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
        </section>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span>יום ניסיון במתנה</span>
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
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CrossLinkCard href="/features" title="מה כלול? ראו כל היכולות" description="5 מנועי AI, תמונות, סרטונים וסוכנים" />
          <CrossLinkCard href="/examples" title="דוגמאות לפרומפטים שיוצרים" description="לפני ואחרי - שדרוג אמיתי" />
          <CrossLinkCard href="/prompts" title={`גישה לספריית ${PROMPT_LIBRARY_COUNT} תבניות`} description="פרומפטים מוכנים ב-30+ קטגוריות" />
          <CrossLinkCard href="/templates" title="תבניות פרומפטים מוכנות" description="בחרו תבנית עם משתנים, מלאו והעתיקו" />
        </div>

        {/* Credit system explanation */}
        <div className="max-w-2xl mx-auto mt-16 p-6 bg-card border border-border rounded-2xl">
          <h2 className="text-lg font-bold text-foreground mb-4 text-center">איך עובדת מערכת הקרדיטים?</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">תוכנית חינם</h4>
              <p className="text-muted-foreground">מקבלים 2 קרדיטים ביום שמתחדשים אוטומטית ב-14:00. כל שדרוג פרומפט = קרדיט אחד.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-600 dark:text-amber-400">תוכנית Pro</h4>
              <p className="text-muted-foreground">150 קרדיטים בחודש שמתחדשים עם כל חיוב. גישה למודלים פרימיום + למידת סגנון אישי.</p>
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
    </main>
  );
}

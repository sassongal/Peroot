"use client";

import { useState } from "react";
import {
    Rocket, ArrowRight, ArrowLeft,
    MessageSquare, Globe, Palette, Bot,
    Sparkles, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface OnboardingOverlayProps {
    onComplete: (data: { role: string; goal: string }) => void;
}

const CAPABILITY_MODES = [
    {
        icon: MessageSquare,
        color: "sky",
        labelHe: "סטנדרטי",
        descriptionHe: "יצירת טקסט וצ'אט רגיל - מושלם לרוב המשימות",
    },
    {
        icon: Globe,
        color: "emerald",
        labelHe: "מחקר מעמיק",
        descriptionHe: "חיפוש ברשת עם מקורות ושרשרת חשיבה מפורטת",
    },
    {
        icon: Palette,
        color: "purple",
        labelHe: "יצירת תמונה",
        descriptionHe: "יצירת פרומפטים לתמונות עם DALL-E או Midjourney",
    },
    {
        icon: Bot,
        color: "amber",
        labelHe: "בונה סוכנים",
        descriptionHe: "הגדרת GPT מותאמים וסוכני AI עצמאיים",
        comingSoon: true,
    },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    sky:     { bg: "bg-sky-500/10",     border: "border-sky-500/30",     text: "text-sky-400",     ring: "ring-sky-500/20"     },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", ring: "ring-emerald-500/20" },
    purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  ring: "ring-purple-500/20"  },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   ring: "ring-amber-500/20"   },
};

const TOTAL_STEPS = 3;

// 5.7 Mark onboarding as complete in the DB
async function markOnboardingComplete(): Promise<void> {
    try {
        await fetch(getApiPath("/api/user/onboarding/complete"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        logger.warn("Failed to mark onboarding complete", e);
    }
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
    const [step, setStep] = useState(1);
    const [isVisible, setIsVisible] = useState(true);

    const handleNext = () => {
        if (step === TOTAL_STEPS) {
            handleFinish();
        } else {
            setStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setStep((prev) => Math.max(1, prev - 1));
    };

    const handleFinish = async () => {
        // 5.7 Mark onboarding complete in DB
        await markOnboardingComplete();

        // Award Pioneer achievement (fire-and-forget)
        fetch(getApiPath("/api/user/achievements/award"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ achievementId: "pioneer" }),
        }).catch((e) => logger.warn("Failed to award pioneer badge", e));

        setIsVisible(false);
        setTimeout(() => {
            onComplete({ role: "", goal: "" });
        }, 500);
    };

    const handleSkip = async () => {
        // 5.7 Mark onboarding complete even when skipped
        markOnboardingComplete().catch((e) => logger.warn("Failed to mark onboarding complete on skip", e));

        setIsVisible(false);
        setTimeout(() => {
            onComplete({ role: "", goal: "" });
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500 overscroll-contain overflow-y-auto">
            <div
                className="w-full max-w-lg glass-card rounded-[40px] border-white/10 bg-zinc-950/90 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-700"
                dir="rtl"
            >
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-amber-500/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-yellow-500/10 blur-[120px] rounded-full" />
                </div>

                {/* Skip button */}
                <div className="absolute top-6 left-6 z-20">
                    <button
                        onClick={handleSkip}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-4 py-2.5 min-h-[44px] flex items-center rounded-lg hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                    >
                        דלג
                    </button>
                </div>

                {/* Step dots */}
                <div className="pt-8 sm:pt-10 px-6 sm:px-10 md:px-14 flex items-center justify-center gap-3 relative z-10">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-500",
                                i + 1 === step
                                    ? "w-8 bg-gradient-to-r from-amber-400 to-yellow-500"
                                    : "w-1.5 bg-white/10"
                            )}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div className="px-6 sm:px-10 md:px-14 pt-8 sm:pt-10 pb-0 relative z-10 min-h-[280px] sm:min-h-[340px]">

                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="text-center space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/20 mx-auto shadow-2xl shadow-amber-500/10">
                                <Rocket className="w-12 h-12 text-amber-400" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                                    ברוך הבא ל-Peroot!
                                </h2>
                                <p className="text-lg text-slate-400 max-w-md mx-auto leading-relaxed">
                                    Peroot משדרג את הפרומפטים שלך באמצעות AI מתקדם - הפוך כל רעיון גולמי לפרומפט מקצועי ומפורט בשניות.
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-6 pt-2">
                                {[
                                    { icon: Sparkles, label: "שיפור אוטומטי" },
                                    { icon: Globe, label: "מחקר חכם" },
                                    { icon: Bot, label: "בניית סוכנים" },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <span className="text-xs text-slate-500">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Capability Modes */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="text-center">
                                <h2 className="text-3xl font-serif font-bold text-white mb-2">
                                    בחר מצב פרומפט
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Peroot מציע 4 מצבי עבודה - כל אחד מותאם לסוג משימה אחר
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {CAPABILITY_MODES.map(({ icon: Icon, color, labelHe, descriptionHe, comingSoon }) => {
                                    const c = COLOR_MAP[color];
                                    return (
                                        <div
                                            key={labelHe}
                                            className={cn(
                                                "flex items-start gap-3 p-4 rounded-2xl border transition-all relative",
                                                comingSoon && "opacity-50 cursor-not-allowed",
                                                c.bg, c.border
                                            )}
                                        >
                                            {comingSoon && (
                                                <span className="absolute top-2 left-2 text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                    בקרוב
                                                </span>
                                            )}
                                            <div
                                                className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1",
                                                    c.bg, c.ring
                                                )}
                                            >
                                                <Icon className={cn("w-4 h-4", c.text)} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={cn("text-sm font-bold", c.text)}>
                                                    {labelHe}
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                                    {descriptionHe}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Ready */}
                    {step === 3 && (
                        <div className="text-center space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mx-auto shadow-2xl shadow-emerald-500/10 animate-pulse-once">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-serif font-bold text-white tracking-tight">
                                    מוכן להתחיל!
                                </h2>
                                <p className="text-lg text-slate-400 max-w-sm mx-auto leading-relaxed">
                                    כתוב פרומפט או בחר מהספרייה ותן ל-AI לעשות את הקסם
                                </p>
                            </div>
                            <div className="px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm text-slate-400 leading-relaxed">
                                <span className="text-amber-400 font-semibold">טיפ: </span>
                                השתמש בסוגריים מסולסלים כמו <code className="text-amber-300 bg-amber-500/10 px-1 rounded">{"{שם_לקוח}"}</code> בפרומפט כדי ליצור תבניות חכמות שניתן למלא בקליק.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer controls */}
                <div className="mt-8 sm:mt-10 px-6 sm:px-10 md:px-14 pb-8 sm:pb-10 md:pb-14 flex items-center justify-between relative z-10">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                            >
                                <ArrowLeft className="w-4 h-4 rtl-flip" />
                                הקודם
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        className={cn(
                            "flex items-center gap-3 px-8 py-4 rounded-2xl text-black font-bold transition-all shadow-xl active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none",
                            step === TOTAL_STEPS
                                ? "bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-900/20 hover:scale-[1.03] focus-visible:ring-emerald-500"
                                : "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-amber-900/20 hover:scale-[1.03] focus-visible:ring-amber-500"
                        )}
                    >
                        <span>{step === TOTAL_STEPS ? "התחל עכשיו" : "הבא"}</span>
                        {step === TOTAL_STEPS ? (
                            <Rocket className="w-5 h-5" />
                        ) : (
                            <ArrowRight className="w-5 h-5 rtl-flip" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

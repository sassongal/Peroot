"use client";

import { useState, useMemo } from "react";
import { 
    Target, Zap, Rocket, CheckCircle2, 
    ArrowRight, ArrowLeft, Sparkles, Send,
    Briefcase, Code, Palette, Megaphone,
    Search, BarChart3, GraduationCap,
    Wand2, Info, Layout, MousePointer2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { highlightTextWithPlaceholders } from "@/lib/text-utils";
import { useI18n } from "@/context/I18nContext";
import { getApiPath } from "@/lib/api-path";

interface OnboardingOverlayProps {
    onComplete: (data: { role: string; goal: string }) => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
    const t = useI18n();
    const [step, setStep] = useState(1);
    const [role, setRole] = useState("");
    const [goal, setGoal] = useState("");
    const [isVisible, setIsVisible] = useState(true);

    const ROLES = useMemo(() => [
        { id: 'marketing', label: t.onboarding.roles.marketing, icon: Megaphone },
        { id: 'dev', label: t.onboarding.roles.dev, icon: Code },
        { id: 'creative', label: t.onboarding.roles.creative, icon: Palette },
        { id: 'sales', label: t.onboarding.roles.sales, icon: Briefcase },
        { id: 'product', label: t.onboarding.roles.product, icon: Target },
        { id: 'education', label: t.onboarding.roles.education, icon: GraduationCap },
        { id: 'data', label: t.onboarding.roles.data, icon: BarChart3 },
        { id: 'other', label: t.onboarding.roles.other, icon: Search },
    ], [t]);

    const GOALS = useMemo(() => [
        { id: 'efficiency', label: t.onboarding.goals.efficiency, icon: Zap },
        { id: 'quality', label: t.onboarding.goals.quality, icon: Sparkles },
        { id: 'learning', label: t.onboarding.goals.learning, icon: Rocket },
        { id: 'automation', label: t.onboarding.goals.automation, icon: Send },
    ], [t]);

    // --- Simulator State ---
    const simInput = t.onboarding.sim_input;
    const [simVariables, setSimVariables] = useState<Record<string, string>>({ client_name: "", issue: "" });
    const [simIsEnhanced, setSimIsEnhanced] = useState(false);
    const [simIsLoading, setSimIsLoading] = useState(false);

    const handleNext = () => {
        if (step === 7) {
            handleFinish();
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(1, prev - 1));
    };

    const handleFinish = async () => {
        // Award Pioneer Achievement
        fetch(getApiPath("/api/user/achievements/award"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ achievementId: 'pioneer' })
        }).catch(e => console.warn("Failed to award pioneer badge", e));

        setIsVisible(false);
        setTimeout(() => {
            onComplete({ role, goal });
        }, 500);
    };

    const triggerSimEnhance = () => {
        setSimIsLoading(true);
        setTimeout(() => {
            setSimIsLoading(false);
            setSimIsEnhanced(true);
        }, 1500);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className={cn(
                "w-full glass-card rounded-[40px] border-white/10 bg-zinc-950/90 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all duration-700",
                step >= 4 && step <= 6 ? "max-w-5xl" : "max-w-2xl"
            )} dir="rtl">
                
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-500/20 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/20 blur-[120px] rounded-full"></div>
                </div>

                {/* Header Container */}
                <div className="p-10 md:p-14 pb-0">
                    {/* Progress Dots */}
                    <div className="flex items-center justify-center gap-3 mb-10 relative z-10">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div 
                                key={i} 
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    i === step ? "w-8 bg-gradient-to-r from-amber-400 to-yellow-500" : "w-1.5 bg-white/10"
                                )} 
                            />
                        ))}
                    </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="text-center space-y-8 animate-in slide-in-from-left-4 duration-500 relative z-10">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/20 mx-auto shadow-2xl shadow-amber-500/10">
                            <Rocket className="w-12 h-12 text-amber-400" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">{t.onboarding.welcome}</h2>
                            <p className="text-lg text-slate-400 max-w-md mx-auto leading-relaxed">
                                {t.onboarding.description}
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Role */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 relative z-10">
                        <div className="text-center">
                            <h2 className="text-3xl font-serif font-bold text-white mb-3">{t.onboarding.role_question}</h2>
                            <p className="text-slate-400">{t.onboarding.role_description}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {ROLES.map((r) => {
                                const Icon = r.icon;
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => setRole(r.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 group",
                                            role === r.id 
                                                ? "bg-white/10 border-amber-500/50 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10" 
                                                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                                            role === r.id ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={cn(
                                            "text-xs font-medium text-center",
                                            role === r.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                        )}>{r.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Goal */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 relative z-10">
                        <div className="text-center">
                            <h2 className="text-3xl font-serif font-bold text-white mb-3">{t.onboarding.goal_question}</h2>
                            <p className="text-slate-400">{t.onboarding.goal_description}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {GOALS.map((g) => {
                                const Icon = g.icon;
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => setGoal(g.id)}
                                        className={cn(
                                            "flex items-center gap-5 p-6 rounded-2xl border transition-all duration-300 group text-right",
                                            goal === g.id 
                                                ? "bg-white/10 border-amber-500/50 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10" 
                                                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-inner shrink-0",
                                            goal === g.id ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-slate-500 group-hover:text-slate-300"
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className={cn(
                                            "text-base font-medium",
                                            goal === g.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                        )}>{g.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                    {/* Step 4: Simulator - Concept */}
                    {step === 4 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 relative z-10">
                            <div className="text-center max-w-xl mx-auto">
                                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">{t.onboarding.live_badge}</span>
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">{t.onboarding.variables_title}</h2>
                                <p className="text-slate-400" dangerouslySetInnerHTML={{ __html: t.onboarding.variables_description }} />
                            </div>
                            
                            <div className="bg-black/40 rounded-3xl border border-white/5 p-8 max-w-3xl mx-auto relative group">
                                <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs">
                                    <Info className="w-4 h-4" />
                                    <span>{t.onboarding.variables_magic}</span>
                                </div>
                                <div className="text-2xl md:text-3xl text-slate-300 leading-relaxed font-sans text-center">
                                    {highlightTextWithPlaceholders(simInput)}
                                </div>
                                <div className="absolute -top-4 -right-4 bg-amber-500 text-black px-4 py-2 rounded-2xl font-bold text-sm rotate-12 shadow-xl animate-pulse">
                                    {t.onboarding.placeholder_badge}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Simulator - Variables */}
                    {step === 5 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 relative z-10">
                            <div className="text-center max-w-xl mx-auto">
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">{t.onboarding.fill_title}</h2>
                                <p className="text-slate-400">{t.onboarding.fill_description}</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
                                <div className="glass-card p-6 rounded-2xl border-white/10 bg-white/[0.02] space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                        <Layout className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-bold text-slate-200">{t.onboarding.variables_panel}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-sky-400 font-bold block text-right">{`{client_name}`}</label>
                                            <div className="relative">
                                                <input 
                                                    autoFocus
                                                    dir="rtl"
                                                    value={simVariables.client_name}
                                                    onChange={e => setSimVariables({...simVariables, client_name: e.target.value})}
                                                    placeholder={t.onboarding.sim_placeholder}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500/50"
                                                />
                                                {!simVariables.client_name && (
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none animate-bounce">
                                                        <MousePointer2 className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 opacity-50">
                                            <label className="text-xs text-slate-500 font-bold block text-right">{`{issue}`}</label>
                                            <input disabled dir="rtl" value={t.onboarding.sim_issue_val} className="w-full bg-black/20 border border-white/5 rounded-lg py-3 px-4 text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">{t.onboarding.preview}</div>
                                    <div className="bg-black/40 rounded-2xl border border-white/10 p-6 text-lg text-slate-200 leading-relaxed shadow-inner font-sans text-right">
                                        {t.onboarding.sim_input.split('{client_name}')[0]} <span className={cn("px-1 rounded bg-blue-500/20 text-blue-400 transition-all font-bold", simVariables.client_name && "bg-emerald-500/20 text-emerald-400")}>{simVariables.client_name || "{client_name}"}</span> {t.onboarding.sim_input.split('{client_name}')[1].split('{issue}')[0]} <span className="px-1 rounded bg-blue-500/20 text-blue-400">{t.onboarding.sim_issue_val}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Simulator - Enhance */}
                    {step === 6 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 relative z-10">
                            <div className="text-center max-w-xl mx-auto">
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">{t.onboarding.enhance_title}</h2>
                                <p className="text-slate-400">{t.onboarding.enhance_description}</p>
                            </div>

                            <div className="max-w-4xl mx-auto">
                                {!simIsEnhanced ? (
                                    <div className="flex flex-col items-center gap-8 py-10">
                                        <div className="w-full bg-black/40 rounded-3xl border border-white/10 p-8 text-xl text-slate-400 italic text-center font-sans">
                                            &quot;{t.onboarding.sim_input.replace('{client_name}', simVariables.client_name || "דני").replace('{issue}', t.onboarding.sim_issue_val)}&quot;
                                        </div>
                                        <button 
                                            onClick={triggerSimEnhance}
                                            disabled={simIsLoading}
                                            className="group relative px-12 py-6 rounded-2xl bg-white text-black font-black text-xl transition-all hover:scale-110 hover:-rotate-2 hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                {simIsLoading ? <Zap className="w-8 h-8 animate-spin" /> : <Wand2 className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
                                                <span>{simIsLoading ? t.onboarding.buttons.analyzing : t.onboarding.buttons.enhance_cta}</span>
                                            </div>
                                            {simIsLoading && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent translate-x-[-100%] animate-shimmer" />
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-700">
                                        <div className="p-6 rounded-2xl border border-white/5 bg-white/5 space-y-3">
                                            <div className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase opacity-60">{t.onboarding.original_prompt}</div>
                                            <p className="text-sm text-slate-400">{t.onboarding.sim_input.replace('{client_name}', simVariables.client_name || "דני").replace('{issue}', t.onboarding.sim_issue_val)}</p>
                                        </div>
                                        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-black font-black text-[8px] rounded-bl-lg">PRO</div>
                                            <div className="text-[10px] text-emerald-400 font-bold tracking-tighter uppercase">{t.onboarding.peroot_result}</div>
                                            <div className="text-xs text-slate-200 leading-relaxed font-sans space-y-2 text-right" dir="rtl">
                                                <p className="text-emerald-300 font-bold">{t.onboarding.mission_mode}</p>
                                                <p>{t.onboarding.mission_description}</p>
                                                <p className="text-emerald-300 font-bold">{t.onboarding.mission}</p>
                                                <p>{t.onboarding.mission_task.replace('{name}', simVariables.client_name || "דני")}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 7: Finish */}
                    {step === 7 && (
                        <div className="text-center space-y-8 animate-in slide-in-from-left-4 duration-500 relative z-10">
                            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mx-auto animate-bounce shadow-2xl shadow-emerald-500/10 text-emerald-400">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-serif font-bold text-white tracking-tight">{t.onboarding.ready_title}</h2>
                                <p className="text-lg text-slate-400 leading-relaxed whitespace-pre-line">
                                    {t.onboarding.ready_description}
                                </p>
                            </div>
                            <div className="pt-4 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{t.common.role}</p>
                                    <p className="text-sm text-white font-bold">{ROLES.find(r => r.id === role)?.label || t.common.not_selected}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{t.common.goal}</p>
                                    <p className="text-sm text-white font-bold">{GOALS.find(g => g.id === goal)?.label || t.common.not_selected}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="mt-14 px-10 md:px-14 pb-10 md:pb-14 flex items-center justify-between relative z-10">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
                            >
                                <ArrowLeft className="w-4 h-4 rtl-flip" />
                                {t.common.back}
                            </button>
                        )}
                    </div>
                    
                    <button
                        onClick={handleNext}
                        disabled={(step === 2 && !role) || (step === 3 && !goal) || (step === 5 && !simVariables.client_name) || (step === 6 && !simIsEnhanced)}
                        className={cn(
                            "flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed",
                            step === 7 
                                ? "bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-900/20" 
                                : (step >= 4 && step <= 6 ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-blue-900/20" : "bg-gradient-to-r from-amber-600 to-yellow-600 shadow-amber-900/20")
                        )}
                    >
                        <span>
                            {step === 1 ? t.onboarding.buttons.start : 
                             step === 4 ? t.onboarding.buttons.understand :
                             step === 5 ? t.onboarding.buttons.advanced :
                             step === 6 ? t.onboarding.buttons.amazing :
                             step === 7 ? t.onboarding.buttons.lets_go : t.onboarding.buttons.continue}
                        </span>
                        {step === 7 ? <Rocket className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rtl-flip" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

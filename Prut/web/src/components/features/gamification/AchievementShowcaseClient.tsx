"use client";

import { 
    Rocket, 
    Layout, 
    Building2, 
    Brain, 
    Zap,
    Lock,
    Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Achievement } from "@/lib/types";

import { useI18n } from "@/context/I18nContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Rocket, Layout, Building2, Brain, Zap
};

interface AchievementShowcaseClientProps {
    achievements: Achievement[];
    unlockedIds: string[];
}

export function AchievementShowcaseClient({ achievements, unlockedIds }: AchievementShowcaseClientProps) {
    const t = useI18n();
    
    if (!achievements || achievements.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>{t.gamification.achievements_title}</span>
            </div>

            <div className="flex flex-wrap gap-4">
                {achievements.map((ach) => {
                    const isUnlocked = unlockedIds.includes(ach.id);
                    const Icon = ICON_MAP[ach.icon] || Trophy;

                    return (
                        <div 
                            key={ach.id}
                            className={cn(
                                "group relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border",
                                isUnlocked 
                                    ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
                                    : "bg-white/[0.02] border-white/5 text-zinc-700 grayscale"
                            )}
                        >
                            {isUnlocked ? (
                                <Icon className="w-6 h-6 animate-in zoom-in duration-700" />
                            ) : (
                                <Lock className="w-4 h-4 opacity-20" />
                            )}

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 p-4 rounded-2xl glass-card border border-white/10 bg-zinc-950 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 translate-y-2 group-hover:translate-y-0">
                                <div className="text-xs font-black text-white mb-1">{ach.name_he}</div>
                                <div className="text-[10px] text-zinc-500 leading-normal">{ach.description_he}</div>
                                {isUnlocked && (
                                    <div className="mt-2 text-[8px] font-black text-amber-500 uppercase tracking-tighter">
                                        {t.gamification.unlocked_badge}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

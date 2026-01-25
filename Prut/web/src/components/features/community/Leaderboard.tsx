
"use client";

import { useState, useEffect } from "react";
import { 
    Trophy, 
    Medal, 
    Users, 
    Copy, 
    Star, 
    TrendingUp,
    ChevronLeft,
    Crown,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    rank_title: string;
    contribution_score: number;
    total_copies: number;
    total_saves_by_others: number;
}

export function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch("/api/community/leaderboard");
                const data = await res.json();
                setEntries(data);
            } catch (e) {
                console.error("Failed to fetch leaderboard", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 rounded-3xl bg-white/5 border border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000" dir="rtl">
            
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 items-end pb-10 border-b border-white/5">
                {/* 2nd Place */}
                <PodiumCard entry={entries[1]} rank={2} color="text-slate-400" />
                
                {/* 1st Place */}
                <PodiumCard entry={entries[0]} rank={1} color="text-amber-400" isCrown />
                
                {/* 3rd Place */}
                <PodiumCard entry={entries[2]} rank={3} color="text-orange-600" />
            </div>

            {/* Scrolling List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    <div className="flex items-center gap-10">
                        <span>#</span>
                        <span>אדריכל/ית</span>
                    </div>
                    <div className="flex items-center gap-12">
                        <span>העתקות</span>
                        <span>נקודות תרומה</span>
                    </div>
                </div>

                {entries.slice(3).map((entry, idx) => (
                    <div 
                        key={entry.user_id}
                        className="group flex items-center justify-between p-5 rounded-[32px] bg-zinc-950/50 border border-white/5 hover:border-blue-500/30 hover:bg-zinc-900 transition-all duration-500"
                    >
                        <div className="flex items-center gap-6">
                            <span className="text-[10px] font-black text-zinc-800 tabular-nums w-4">#{idx + 4}</span>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden">
                                    {entry.avatar_url ? (
                                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-black text-blue-400">{entry.full_name[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{entry.full_name}</div>
                                    <div className="text-[10px] font-bold text-zinc-600 uppercase">{entry.rank_title}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-12">
                            <div className="flex items-center gap-2">
                                <Copy className="w-3 h-3 text-zinc-700" />
                                <span className="text-xs font-black text-zinc-400 tabular-nums">{entry.total_copies}</span>
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black tabular-nums border border-blue-500/20">
                                {entry.contribution_score.toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}

function PodiumCard({ entry, rank, color, isCrown }: { entry?: LeaderboardEntry, rank: number, color: string, isCrown?: boolean }) {
    if (!entry) return null;

    return (
        <div className={cn(
            "flex flex-col items-center gap-4 relative transition-all duration-700 hover:scale-105",
            rank === 1 ? "scale-110 -translate-y-4" : ""
        )}>
            {isCrown && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <Crown className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                </div>
            )}
            
            <div className={cn(
                "relative w-24 h-24 rounded-[32px] bg-zinc-950 border-4 flex items-center justify-center overflow-hidden shadow-2xl",
                rank === 1 ? "border-amber-500/50" : "border-white/5"
            )}>
                {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-2xl font-black text-white/20 uppercase">{entry.full_name[0]}</div>
                )}
                
                <div className={cn(
                    "absolute bottom-0 inset-x-0 py-1 bg-black/80 backdrop-blur-md text-[10px] font-black text-center uppercase tracking-tighter",
                    color
                )}>
                    RANK #{rank}
                </div>
            </div>

            <div className="text-center space-y-1">
                <div className="text-sm font-black text-white tracking-tight">{entry.full_name}</div>
                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{entry.rank_title}</div>
            </div>

            <div className={cn(
                "px-4 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-white tabular-nums shadow-lg",
                rank === 1 && "bg-amber-500/10 border-amber-500/20"
            )}>
                {entry.contribution_score.toLocaleString()}
            </div>
        </div>
    );
}

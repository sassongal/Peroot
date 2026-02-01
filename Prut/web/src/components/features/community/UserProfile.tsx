
"use client";

import { useState, useEffect } from "react";
import { 
    ShieldCheck, 
    Link as LinkIcon, 
    Calendar, 
    Users, 
    Star, 
    Copy,
    Brain,
    Trophy,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { AchievementShowcase } from "../gamification/AchievementShowcase";

interface ProfileData {
    id: string;
    full_name: string;
    avatar_url?: string;
    rank_title: string;
    contribution_score: number;
    total_copies: number;
    total_saves_by_others: number;
    created_at: string;
    is_following?: boolean;
}

export function UserProfile({ userId }: { userId: string }) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(getApiPath(`/api/community/profile/${userId}`));
                const data = await res.json();
                setProfile(data);
            } catch (e) {
                console.error("Failed to fetch profile", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-12 animate-pulse py-10">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-32 h-32 rounded-[48px] bg-white/5 border border-white/5" />
                    <div className="space-y-4 flex-1">
                        <div className="h-10 w-48 bg-white/5 rounded-xl" />
                        <div className="h-4 w-32 bg-white/5 rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-3xl bg-white/5 border border-white/5" />)}
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="max-w-5xl mx-auto py-10 space-y-12" dir="rtl">
            
            {/* Header / Identity */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end justify-between bg-zinc-950/50 p-10 rounded-[60px] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-20">
                     <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full transition-transform duration-1000 group-hover:scale-110"></div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center md:items-center relative z-10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-[48px] bg-zinc-900 border-2 border-blue-500/20 flex items-center justify-center overflow-hidden shadow-2xl transition-transform duration-500 hover:rotate-3">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-black text-white/10">{profile.full_name[0]}</div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -left-2 p-2.5 rounded-2xl bg-blue-600 text-white shadow-xl ring-4 ring-black">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="text-center md:text-right space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-4xl font-black text-white tracking-tight">{profile.full_name}</h1>
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">{profile.rank_title}</span>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-zinc-500 text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                <span>הצטרף/ה ב-{new Date(profile.created_at).toLocaleDateString('he-IL')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 relative z-10">
                    <button className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-xl shadow-blue-900/20 active:scale-95">
                        עקוב/י אחרי האדריכל
                    </button>
                </div>
            </div>

            {/* Metrics Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    label="נקודות תרומה" 
                    value={profile.contribution_score.toLocaleString()} 
                    icon={Trophy} 
                    color="text-amber-400"
                    desc="דירוג משוקלל בקהילה"
                />
                <MetricCard 
                    label="העתקות של אחרים" 
                    value={profile.total_copies.toLocaleString()} 
                    icon={Copy} 
                    color="text-purple-400"
                    desc="פרומפטים שהועתקו לספריות אחרות"
                />
                <MetricCard 
                    label="ספריות שומרות" 
                    value={profile.total_saves_by_others.toLocaleString()} 
                    icon={Star} 
                    color="text-emerald-400"
                    desc="משתמשים ששמרו למועדפים"
                />
            </div>

            {/* Content Tabs / Achievements */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Right: Achievements Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="p-8 rounded-[40px] bg-zinc-950 border border-white/5">
                        <AchievementShowcase userId={profile.id} />
                    </div>

                    <div className="p-8 rounded-[40px] bg-zinc-950 border border-white/5 space-y-6">
                        <div className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest">
                            <Brain className="w-3 h-3 text-blue-500" />
                            <span>תחומי התמחות (Style)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['Professional', 'Concise', 'Creative', 'Instructional'].map(tag => (
                                <span key={tag} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Left: Content Grid (Prompts) */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                         <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <ExternalLink className="w-5 h-5 text-blue-500" />
                            <span>פורטפוליו פרומפטים ציבורי</span>
                         </h2>
                         <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Latest Masterpieces</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="group p-6 rounded-[32px] bg-zinc-950/40 border border-white/5 hover:border-blue-500/30 transition-all duration-500 cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                     <div className="space-y-1">
                                        <h3 className="text-base font-black text-white group-hover:text-blue-400 transition-colors">מנוף שיווקי ל-SaaS {i}</h3>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Marketing • Standard Mode</p>
                                     </div>
                                     <div className="flex gap-2">
                                        <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5">
                                            <Copy className="w-3 h-3 text-zinc-500" />
                                            <span className="text-[10px] font-black text-zinc-400">12</span>
                                        </div>
                                     </div>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                                    אתה מומחה שיווק דיגיטלי המתמחה בחברות SaaS בשלבים מוקדמים. המשימה שלך היא...
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, desc }: { label: string; value: string; icon: any; color: string; desc: string }) {
    return (
        <div className="p-8 rounded-[40px] bg-zinc-950 border border-white/5 space-y-6 group hover:border-white/10 transition-all duration-500">
            <div className="flex items-center justify-between">
                <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/5 transition-transform duration-500 group-hover:scale-110", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="text-4xl font-black text-white tracking-tighter tabular-nums">{value}</div>
            </div>
            <div className="space-y-1 text-right">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</div>
                <p className="text-[9px] text-zinc-700 font-bold leading-none">{desc}</p>
            </div>
        </div>
    );
}

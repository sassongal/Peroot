
"use client";

import { useState, useEffect } from "react";
import { 
    Brain, 
    Zap, 
    Activity, 
    ChevronRight,
    Search,
    Dna
} from "lucide-react";
import { getApiPath } from "@/lib/api-path";

interface IntelMetrics {
    topTokens: { token: string; count: number }[];
    metrics: {
        avgLatency: number;
        avgTokens: number;
        sampleSize: number;
    };
}

export function IntelligenceHub() {
    const [data, setData] = useState<IntelMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIntel = async () => {
            try {
                const res = await fetch(getApiPath("/api/admin/intelligence"));
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error("Failed to fetch intelligence", e);
            } finally {
                setLoading(false);
            }
        };
        fetchIntel();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Brain className="w-8 h-8 text-purple-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Syncing Intelligence...</span>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000" dir="rtl">
            
            {/* Intel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Style Token Popularity */}
                <div className="glass-card p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1 h-full bg-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Dna className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">Style Token Map</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">Linguistic Pattern Detection</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {data?.topTokens.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group/token hover:bg-white/[0.05] transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-zinc-800 tabular-nums">#{idx + 1}</span>
                                    <span className="text-sm font-bold text-zinc-300 transition-colors group-hover/token:text-purple-400">{item.token}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-black text-white">{item.count}</div>
                                    <div className="text-[10px] font-bold text-zinc-700 uppercase">USERS</div>
                                </div>
                            </div>
                        ))}

                        {(!data?.topTokens || data.topTokens.length === 0) && (
                            <div className="py-10 text-center text-zinc-700 font-mono text-xs uppercase tracking-widest">
                                No style data detected in current sequence
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Generation Health and Metrics */}
                <div className="space-y-8">
                    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">Engine Velocity</h3>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">Inference Performance</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Avg Latency</div>
                                <div className="text-4xl font-black text-white tracking-tighter">
                                    {data?.metrics.avgLatency || 0}<span className="text-sm text-zinc-700 ml-1 italic">ms</span>
                                </div>
                            </div>
                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Avg Tokens</div>
                                <div className="text-4xl font-black text-white tracking-tighter">
                                    {data?.metrics.avgTokens || 0}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Health Index: 98.4%</span>
                                </div>
                                <span className="text-[9px] font-bold text-zinc-700 italic">Sample: {data?.metrics.sampleSize} sequences</span>
                            </div>
                        </div>
                    </div>

                    <button className="w-full p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all duration-700">
                        <div className="flex items-center gap-6">
                             <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-600 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                                <Search className="w-6 h-6" />
                             </div>
                             <div className="text-right">
                                <h4 className="text-lg font-black text-white uppercase tracking-tight">Drill-down Analytics</h4>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Explore raw RAG interactions</p>
                             </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-zinc-800 transition-transform group-hover:translate-x-[-10px] group-hover:text-white" />
                    </button>
                    
                </div>

            </div>

        </div>
    );
}

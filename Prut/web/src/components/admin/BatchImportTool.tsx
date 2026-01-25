
"use client";

import { useState } from "react";
import { Upload, FileJson, CheckCircle2, AlertCircle, X, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BatchImportTool({ onComplete }: { onComplete: () => void }) {
    const [jsonInput, setJsonInput] = useState("");
    const [status, setStatus] = useState<'idle' | 'validating' | 'importing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [stats, setStats] = useState<{ count: number } | null>(null);

    const handleImport = async () => {
        if (!jsonInput.trim()) return;
        
        setStatus('importing');
        setErrorMsg(null);

        try {
            // Basic format validation before sending
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) throw new Error("Input must be an array of prompts.");

            const res = await fetch("/api/admin/library/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to process batch");
            }

            setStats({ count: data.count });
            setStatus('success');
            toast.success(`Successfully imported ${data.count} prompts!`);
            onComplete();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Invalid JSON structure or Server Error";
            console.error(e);
            setStatus('error');
            setErrorMsg(msg);
            toast.error("Batch import failed");
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-700" dir="rtl">
            <div className="p-8 rounded-[40px] bg-zinc-950 border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
                            <Upload className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">Batch Import Pipeline</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">JSON Dataset Management</p>
                        </div>
                    </div>
                    {status === 'success' && (
                         <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-4 h-4" />
                            Import Complete
                         </div>
                    )}
                </div>

                <div className="relative group">
                    <textarea 
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="הדבק כאן את נתוני ה-JSON של הפרומפטים..."
                        className="w-full h-80 bg-zinc-900 border border-white/5 rounded-[32px] p-8 text-xs font-mono text-blue-400/80 resize-none focus:outline-none focus:border-blue-500/30 transition-all custom-scrollbar"
                        dir="ltr"
                    />
                    {!jsonInput && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                            <FileJson className="w-12 h-12 mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Sequence...</span>
                        </div>
                    )}
                </div>

                {status === 'error' && (
                    <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 text-red-500">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{errorMsg}</span>
                    </div>
                )}

                <div className="flex gap-4">
                    <button 
                        onClick={handleImport}
                        disabled={!jsonInput || status === 'importing'}
                        className={cn(
                            "flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                            status === 'importing' ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20"
                        )}
                    >
                        {status === 'importing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Execute Batch Import
                    </button>
                    <button 
                        onClick={() => { setJsonInput(""); setStatus('idle'); }}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-600 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {status === 'success' && stats && (
                <div className="p-8 rounded-[40px] bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 text-center animate-in zoom-in-95 duration-500">
                    <div className="text-5xl font-black tracking-tighter mb-2">{stats.count}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em]">Prompts Successfully Integrated</div>
                </div>
            )}
        </div>
    );
}

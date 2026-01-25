"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Zap, 
  Search, 
  Image as ImageIcon, 
  Bot, 
  Cpu, 
  Brain,
  ChevronRight,
  Activity,
  History as HistoryIcon,
  LucideIcon
} from "lucide-react";
import Link from "next/link";
import { CapabilityMode } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";

interface EngineRow {
  id: string;
  mode: string;
  name: string;
  description: string;
  is_active: boolean;
  updated_at: string;
}

const MODE_ICONS: Record<string, LucideIcon> = {
  [CapabilityMode.STANDARD]: Zap,
  [CapabilityMode.DEEP_RESEARCH]: Search,
  [CapabilityMode.IMAGE_GENERATION]: ImageIcon,
  [CapabilityMode.AGENT_BUILDER]: Bot,
};

export default function EnginesListPage() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngines = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prompt_engines")
        .select("*")
        .order("mode");
      
      if (!error && data) {
        setEngines(data);
      }
      setLoading(false);
    };
    fetchEngines();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Interrogating Subsystems...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none" dir="rtl">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                   <Cpu className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Core Orchestration</span>
             </div>
             <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
                Nexus Engines
             </h1>
             <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
                ניהול ושדרוג מנועי הבינה המלאכותית בליבת המערכת. כל שינוי משפיע מיידית על חוויית המשתמש.
             </p>
          </div>

          <div className="flex gap-4">
             <button className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95 flex items-center gap-3">
                <HistoryIcon className="w-4 h-4" />
                Global History
             </button>
          </div>
        </div>

        {/* Grid of Command Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {engines.map((engine) => {
            const Icon = MODE_ICONS[engine.mode] || Zap;
            return (
              <Link 
                key={engine.id} 
                href={`/admin/engines/${engine.mode}`}
                className="group relative overflow-hidden rounded-[40px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:scale-[1.02] hover:shadow-3xl hover:border-white/10"
              >
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-10 rounded-[38px] bg-zinc-950 flex flex-col gap-10 h-full">
                   <div className="flex justify-between items-start">
                      <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 text-zinc-100 group-hover:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl">
                         <Icon className="w-10 h-10" />
                      </div>
                      <div className="flex flex-col items-end gap-3">
                         <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                            engine.is_active 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                              : 'bg-red-500/10 border-red-500/20 text-red-500'
                         )}>
                            {engine.is_active ? 'Online' : 'Offline'}
                         </span>
                         <span className="text-[9px] font-black text-zinc-800 uppercase tracking-tighter decoration-zinc-800 underline-offset-4 underline">ID: {engine.id.slice(0, 8)}</span>
                      </div>
                   </div>

                   <div className="space-y-4 flex-1">
                      <h3 className="text-4xl font-black text-white tracking-tighter group-hover:translate-x-2 transition-transform duration-500">
                        {engine.name}
                      </h3>
                      <p className="text-zinc-500 text-base font-medium leading-relaxed group-hover:text-zinc-400 transition-colors max-w-sm">
                        {engine.description}
                      </p>
                   </div>

                   <div className="pt-10 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-10">
                         <Metric label="Latency" value="180ms" />
                         <Metric label="Success" value="100%" />
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 group-hover:text-white group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500 shadow-xl">
                         <ChevronRight className="w-6 h-6 rtl-flip" />
                      </div>
                   </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Global Performance Monitoring (Visual Only) */}
        <div className="pt-10">
           <div className="p-12 rounded-[48px] border border-white/5 bg-zinc-950 relative overflow-hidden group shadow-3xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative">
                 <div className="flex items-center gap-8">
                    <div className="p-6 rounded-[32px] bg-zinc-900 border border-white/5 shadow-2xl">
                       <Brain className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Intelligence Pipeline Metrics</h3>
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Cross-engine throughput analysis</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-12">
                    <div className="text-right">
                       <div className="text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-widest">Compute Load</div>
                       <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full w-[14%] bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]" />
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black text-zinc-600 uppercase mb-3 tracking-widest">Token Velocity</div>
                       <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full w-[68%] bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.3)]" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
       <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{label}</div>
       <div className="text-xl font-black text-zinc-300">{value}</div>
    </div>
  );
}

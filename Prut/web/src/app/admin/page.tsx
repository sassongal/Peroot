"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { 
  Users, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Cpu,
  BarChart3,
  Terminal,
  ArrowUpRight,
  Database,
  Box,
  Brain
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IntelligenceHub } from "@/components/admin/IntelligenceHub";
import { getApiPath } from "@/lib/api-path";

interface AdminStats {
  totalUsers: number;
  totalPrompts: number;
  todayPrompts: number;
  totalActivity: number;
  totalStyles: number;
}

import { useI18n } from "@/context/I18nContext";

export default function AdminPage() {
  const t = useI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(getApiPath("/api/admin/stats"));
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.dashboard.loading}</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-12 animate-in fade-in duration-1000 select-none pb-20" dir="rtl">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                   <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Operational Authority Level 1</span>
             </div>
             <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
                Nexus Hub
             </h1>
             <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
                {t.admin.dashboard.description}
             </p>
          </div>

          <div className="flex gap-4">
             <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
             </div>
          </div>
        </div>

        {/* Stats Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label={t.admin.dashboard.stats.active_users} 
            value={stats?.totalUsers || 0} 
            icon={Users} 
            trend="+12%" 
            color="blue"
            href="/admin/users"
          />
          <StatCard 
            label={t.admin.dashboard.stats.generated_prompts} 
            value={stats?.totalPrompts || 0} 
            icon={Cpu} 
            trend="+45%" 
            color="purple"
            href="/admin/prompts"
          />
          <StatCard 
            label={t.admin.dashboard.stats.velocity} 
            value={stats?.todayPrompts || 0} 
            icon={Zap} 
            trend="Peak" 
            color="amber"
            href="/admin/activity"
          />
          <StatCard 
            label={t.admin.dashboard.stats.active_styles} 
            value={stats?.totalStyles || 0} 
            icon={Brain} 
            trend="+8%" 
            color="purple"
            href="#intelligence"
          />
        </div>

        {/* Intelligence Layer */}
        <div id="intelligence" className="space-y-8">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-l from-purple-500/50 to-transparent" />
              <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm font-black text-purple-400 uppercase tracking-[0.4em]">System Intelligence</h2>
              </div>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-purple-500/50 to-transparent" />
           </div>
           
           <IntelligenceHub />
        </div>

        {/* Control Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Subsystem Health Overlay */}
          <div className="xl:col-span-2 space-y-6">
             <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5">
                         <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Intelligence Pipeline</h3>
                   </div>
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Inference Real-time</span>
                </div>
                
                <div className="space-y-8">
                   <PipelineMetric label="Engine Cluster v4" pct={84} status="Heavy Load" />
                   <PipelineMetric label="Memory Buffer" pct={32} status="Stable" />
                   <PipelineMetric label="Network Latency" pct={12} status="Optimal" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QuickAction 
                  title={t.admin.dashboard.quick_actions.consolidate} 
                  desc={t.admin.dashboard.quick_actions.consolidate_desc} 
                  icon={Box} 
                  href="/admin/engines"
                />
                <QuickAction 
                  title={t.admin.dashboard.quick_actions.maintenance} 
                  desc={t.admin.dashboard.quick_actions.maintenance_desc} 
                  icon={Database} 
                  href="/admin/database"
                />
             </div>
          </div>

          {/* Telemetry Stream */}
          <div className="rounded-[40px] border border-white/5 bg-zinc-950 p-8 flex flex-col gap-6 relative shadow-3xl">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                   <Terminal className="w-4 h-4 text-zinc-500" />
                   Telemetry
                </h3>
                <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase">Live Feed</div>
             </div>
             
             <div className="flex-1 space-y-4 font-mono text-[10px] text-zinc-600 overflow-y-auto max-h-[400px] custom-scrollbar pr-2" dir="ltr">
                <div className="flex gap-3">
                   <span className="text-zinc-800">[13:42:01]</span>
                   <span className="text-emerald-500/80">INFO: Intelligence pipeline synchronized</span>
                </div>
                <div className="flex gap-3 text-zinc-500">
                   <span className="text-zinc-800">[13:42:05]</span>
                   <span>AUTH: User sequence #8291 validated</span>
                </div>
                <div className="flex gap-3 text-zinc-500">
                   <span className="text-zinc-800">[13:42:12]</span>
                   <span>CRON: Database snapshot initialized</span>
                </div>
                <div className="flex gap-3">
                   <span className="text-zinc-800">[13:42:30]</span>
                   <span className="text-blue-500">ENGINE: Gemini 2.0 Pro Inference started</span>
                </div>
                <div className="flex gap-3 text-zinc-800">
                   <span>[......] SYSTEM STANDBY [......]</span>
                </div>
             </div>

             <button className="w-full py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95">
                View All Events
             </button>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon: Icon, trend, color, href }: { label: string; value: number | string; icon: React.ElementType; trend: string; color: string; href: string }) {
  const colors: Record<string, string> = {
    blue: "group-hover:text-blue-400 group-hover:border-blue-500/30",
    purple: "group-hover:text-purple-400 group-hover:border-purple-500/30",
    emerald: "group-hover:text-emerald-400 group-hover:border-emerald-500/30",
    amber: "group-hover:text-amber-400 group-hover:border-amber-500/30",
  };

  return (
    <Link 
      href={href}
      className={cn(
        "p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6 transition-all duration-700 hover:scale-[1.03] hover:shadow-3xl group",
        colors[color]
      )}
    >
       <div className="flex justify-between items-start">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 group-hover:bg-zinc-800 transition-all duration-500">
             <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{trend}</span>
       </div>
       <div className="space-y-1">
          <div className="text-4xl font-black text-white tracking-tighter">{value}</div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
       </div>
    </Link>
  );
}

function PipelineMetric({ label, pct, status }: { label: string; pct: number; status: string }) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
          <span className="text-[9px] font-black text-zinc-600 bg-white/5 px-2 py-0.5 rounded uppercase">{status}</span>
       </div>
       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
             className="h-full bg-blue-600 transition-all duration-[3000ms] shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
             style={{ width: `${pct}%` }}
          />
       </div>
    </div>
  );
}

function QuickAction({ title, desc, icon: Icon, href }: { title: string; desc: string; icon: React.ElementType; href: string }) {
  return (
    <Link 
      href={href}
      className="p-6 rounded-[32px] bg-zinc-950/40 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all duration-500"
    >
       <div className="flex items-center gap-5">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 group-hover:text-blue-400 transition-colors">
             <Icon className="w-5 h-5" />
          </div>
          <div>
             <h4 className="text-sm font-black text-white uppercase tracking-tight">{title}</h4>
             <p className="text-[10px] text-zinc-600 font-bold">{desc}</p>
          </div>
       </div>
       <ArrowUpRight className="w-4 h-4 text-zinc-800 group-hover:text-white transition-colors" />
    </Link>
  );
}

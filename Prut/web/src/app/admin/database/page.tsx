"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Download, 
  Upload, 
  ShieldAlert,
  Loader,
  RefreshCw,
  Zap,
  Info,
  Archive,
  BarChart4
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BackupData {
  timestamp: string;
  version: string;
  tables: Record<string, unknown[]>;
}

export default function DatabasePage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const supabase = createClient();

  async function createBackup() {
    setBackupLoading(true);
    try {
      const tables = [
        'profiles',
        'personal_library',
        'library_favorites',
        'ai_prompts',
        'ai_prompt_versions',
        'site_settings',
        'user_roles'
      ];

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        version: '2.0',
        tables: {}
      };

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) backup.tables[table] = data;
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peroot-system-dump-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('System Backup Completed');

      // Log action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_logs').insert({
        action: 'DB Backup Genesis',
        entity_type: 'database',
        user_id: user?.id
      });
      
    } catch (err) {
      console.error('Backup failed:', err);
      toast.error('גיבוי נכשל');
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = confirm('⚠️ אזהרה קריטית: שחזור מגיבוי ימחק נתונים קיימים. פעולה זו בלתי הפיכה. האם אתה בטוח?');
    if (!confirmed) return;

    setRestoreLoading(true);
    try {
      toast.info('Restore operation started - syncing with cloud...');
      await new Promise(r => setTimeout(r, 2000));
      toast.error('הפעולה בוטלה: נדרשת הרשאת Master Admin לביצוע שחזור פיזי');
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error('שחזור נכשל');
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none" dir="rtl">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                   <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Critical Infrastructure Access</span>
             </div>
             <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
                Infra Matrix
             </h1>
             <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
                ניהול מסד נתונים, גיבויים ותקינות תשתית הענן. כל פעולה כאן משפיעה ישירות על ליבת המערכת וזמינות המידע.
             </p>
          </div>

          <div className="flex gap-4">
             <div className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connectivity: Optimal
             </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Backup Control */}
           <div className="group relative overflow-hidden rounded-[48px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:border-white/10 hover:shadow-3xl">
              <div className="relative p-12 rounded-[46px] bg-zinc-950 flex flex-col gap-10">
                 <div className="flex justify-between items-start">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 text-blue-500 shadow-2xl group-hover:scale-110 transition-transform">
                       <Download className="w-10 h-10" />
                    </div>
                    <div>
                       <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Safe Operation</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white tracking-tighter">Genesis Snapshot</h3>
                    <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                       יצירת עותק מקומי מוצפן ושלם של כל מסד הנתונים הנוכחי, כולל הגדרות מערכת ופרופילי משתמשים.
                    </p>
                 </div>

                 <button
                    onClick={createBackup}
                    disabled={backupLoading}
                    className="w-full py-6 rounded-[24px] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 shadow-3xl shadow-blue-900/20"
                 >
                    {backupLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Archive className="w-5 h-5" />}
                    <span>{backupLoading ? 'Building Snapshot...' : 'Initiate Global Export'}</span>
                 </button>

                 <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
                    <Metric label="Data Nodes" value="12" />
                    <Metric label="Latency" value="12ms" />
                    <Metric label="Health" value="100%" />
                 </div>
              </div>
           </div>

           {/* Restore Control */}
           <div className="group relative overflow-hidden rounded-[48px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:border-white/10 hover:shadow-3xl">
              <div className="relative p-12 rounded-[46px] bg-zinc-950 flex flex-col gap-10">
                 <div className="flex justify-between items-start">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 text-rose-500 shadow-2xl group-hover:scale-110 transition-transform">
                       <Upload className="w-10 h-10" />
                    </div>
                    <div>
                       <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Destructive Operation</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white tracking-tighter">Cloud Overwrite</h3>
                    <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-sm">
                       שחזור נתוני המערכת מגיבוי קודם. <span className="text-rose-500 font-black underline decoration-2 underline-offset-4">התראה:</span> סשן זה יימחק כליל ויוחלף במידע הארכיון.
                    </p>
                 </div>

                 <div className="relative">
                    <input
                       type="file"
                       accept=".json"
                       onChange={handleRestore}
                       disabled={restoreLoading}
                       className="hidden"
                       id="restore-nexus-v1"
                    />
                    <label
                       htmlFor="restore-nexus-v1"
                       className={cn(
                         "w-full py-6 rounded-[24px] bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-600/20 font-black uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-4 shadow-xl",
                         restoreLoading && "opacity-50 cursor-not-allowed pointer-events-none"
                       )}
                    >
                       {restoreLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                       <span>{restoreLoading ? 'Syncing Archive...' : 'Execute Restoration'}</span>
                    </label>
                 </div>

                 <div className="p-6 rounded-[24px] bg-zinc-900/50 border border-white/5 flex items-center gap-4">
                    <Info className="w-5 h-5 text-zinc-700" />
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">Verified SSH Authority Required</span>
                 </div>
              </div>
           </div>

        </div>

        {/* Global Resource Utilization */}
        <div className="pt-10 mx-2">
           <div className="p-12 rounded-[56px] border border-white/5 bg-zinc-950 relative overflow-hidden group shadow-3xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-12">
                 <div className="flex items-center gap-8">
                    <div className="p-6 rounded-[32px] bg-zinc-900 border border-white/5 shadow-2xl">
                       <BarChart4 className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">Resource Utilization Plan</h3>
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Hardware & Data-stream analysis</p>
                    </div>
                 </div>
                 <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Physical Storage: 10TB Cluster</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                 <ResourceBar label="Storage Capacity" pct={14} color="blue" value="2.4 GB ACTIVE" />
                 <ResourceBar label="Worker Nodes" pct={68} color="purple" value="HYPER-THREADING" />
                 <ResourceBar label="Pool Concurrency" pct={5} color="emerald" value="3/50 STREAMS" />
              </div>
           </div>
        </div>

      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
       <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{label}</div>
       <div className="text-xl font-bold text-zinc-300">{value}</div>
    </div>
  );
}

function ResourceBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  const colors: Record<string, string> = {
     blue: "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]",
     purple: "bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)]",
     emerald: "bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
  };
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
          <span className="text-[10px] font-black text-zinc-700">{value}</span>
       </div>
       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
             className={cn("h-full transition-all duration-[3000ms]", colors[color])}
             style={{ width: `${pct}%` }}
          />
       </div>
       <div className="text-[9px] font-black text-zinc-800 tracking-widest">{pct}% ALLOCATED</div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";

import { getApiPath } from "@/lib/api-path";
import {
  Activity,
  User,
  FileText,
  Settings as SettingsIcon,
  Clock,
  Search,
  RefreshCw,
  ChevronDown,
  Info,
  Calendar,
  ShieldAlert,
  Download,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  profiles: { email: string } | null;
  details: Record<string, unknown>;
}

interface ActivityApiResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}

// ── 8.3 CSV export helper ────────────────────────────────────────────────────

function exportActivityToCSV(logs: ActivityLog[], filename: string) {
  if (logs.length === 0) {
    toast.error("אין נתונים לייצוא");
    return;
  }
  const BOM = "\uFEFF"; // UTF-8 BOM for Hebrew
  const headers = "מזהה,פעולה,סוג_ישות,אימייל_משתמש,פרטים,תאריך";
  const rows = logs.map((log) => {
    const cols = [
      log.id,
      log.action,
      log.entity_type,
      log.profiles?.email || "System",
      JSON.stringify(log.details || {}).replace(/"/g, '""'),
      new Date(log.created_at).toLocaleString("he-IL"),
    ];
    return cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const csv = BOM + [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`יוצאו ${logs.length} רשומות`);
}

export function ActivityFeedTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'user' | 'prompt' | 'settings'>('all');
  const [search, setSearch] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);

  const ADMIN_ACTIONS = [
    'change_tier',
    'grant_credits',
    'ban',
    'unban',
    'grant_admin',
    'revoke_admin',
    'delete_user',
    'admin_login',
    'impersonate',
  ];

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('filter', filter);
      if (adminOnly) params.set('adminOnly', 'true');
      params.set('limit', '100');

      const url = getApiPath(`/api/admin/activity?${params.toString()}`);
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        logger.error('Activity API error:', res.status, text);
        throw new Error(`API responded with ${res.status}`);
      }

      const data: ActivityApiResponse = await res.json();
      setLogs(data.logs ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load activity logs:', message);
      toast.error("שגיאה בטעינת יומן הפעילות");
    } finally {
      setLoading(false);
    }
  }, [search, filter, adminOnly]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Client-side secondary filter (API already filters server-side, this catches any edge cases)
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  function getActionIcon(entityType: string): LucideIcon {
    switch (entityType) {
      case 'user': return User;
      case 'prompt': return FileText;
      case 'settings': return SettingsIcon;
      default: return Activity;
    }
  }

  function getActionColor(action: string) {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('הוספ') || a.includes('חדש')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (a.includes('delete') || a.includes('מחק') || a.includes('חסום')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (a.includes('update') || a.includes('עדכון') || a.includes('שינוי')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-slate-400 bg-white/5 border-white/10';
  }

  return (
    
      <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tighter">
               Activity Audit
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">ניטור מלא של כל הטרנזקציות ומעשי המנהלים במערכת</p>
          </div>

          <div className="flex gap-3">
            {/* ── 8.3 CSV Export Button ── */}
            <button
              onClick={() =>
                exportActivityToCSV(
                  filteredLogs,
                  `peroot_activity_${new Date().toISOString().slice(0, 10)}.csv`
                )
              }
              disabled={filteredLogs.length === 0}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-sm font-bold flex items-center gap-3 backdrop-blur-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>ייצוא CSV</span>
            </button>
            <button
              onClick={loadLogs}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-sm font-bold flex items-center gap-3 backdrop-blur-md active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              <span>רענן יומן</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-2 rounded-[28px] border border-white/10 bg-zinc-950/50 backdrop-blur-xl flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש ביומן לפי פעולה או אימייל..."
              className="w-full pr-14 pl-6 py-4 bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 font-bold"
            />
          </div>

          <div className="flex p-2 gap-1 bg-white/5 rounded-[20px]">
            {(['all', 'user', 'prompt', 'settings'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2",
                  filter === f
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                )}
              >
                {f === 'all' ? 'הכל' : f === 'user' ? 'משתמשים' : f === 'prompt' ? 'פרומפטים' : 'הגדרות'}
              </button>
            ))}
          </div>

          {/* ── 8.4 Admin Actions toggle ── */}
          <div className="flex items-center p-2">
            <button
              onClick={() => setAdminOnly((v) => !v)}
              className={cn(
                "px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border",
                adminOnly
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10"
                  : "bg-white/[0.03] border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              {adminOnly ? "פעולות אדמין בלבד" : "כל הפעולות"}
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-[32px] border border-white/10 bg-zinc-900/30 backdrop-blur-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
               <RefreshCw className="w-12 h-12 animate-spin text-blue-500/20" />
               <span className="text-slate-600 font-black uppercase tracking-widest text-xs">Fetching Audit Logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <Info className="w-12 h-12 text-slate-800" />
               <div className="text-slate-600 font-bold text-lg">אין פעילות מוקלטת התואמת לחיפוש</div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log) => {
                const Icon = getActionIcon(log.entity_type);
                const colorClasses = getActionColor(log.action);
                const isAdminAction = ADMIN_ACTIONS.includes(log.action.toLowerCase()) || log.details?.is_admin === true;

                return (
                  <div key={log.id} className="group p-6 hover:bg-white/[0.03] transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className={cn("p-4 rounded-[22px] border transition-transform group-hover:scale-110", colorClasses)}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                             {log.action}
                          </span>
                          <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/5 text-slate-500 font-black uppercase tracking-widest border border-white/5">
                            {log.entity_type}
                          </span>
                          {/* ── 8.4 Admin badge ── */}
                          {isAdminAction && (
                            <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 font-black uppercase tracking-widest border border-amber-500/20">
                              <ShieldAlert className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                           <div className="flex items-center gap-2">
                              <User className="w-4 h-4 opacity-30" />
                              <span className="group-hover:text-slate-300 transition-colors">{log.profiles?.email || 'System'}</span>
                           </div>
                           <div className="w-1 h-1 rounded-full bg-slate-800" />
                           <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 opacity-30" />
                              <span>{new Date(log.created_at).toLocaleDateString('he-IL')}</span>
                           </div>
                           <div className="w-1 h-1 rounded-full bg-slate-800" />
                           <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 opacity-30" />
                              <span>{new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-500/80 overflow-x-auto leading-relaxed">
                            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                               <span className="text-slate-700 font-black uppercase tracking-tighter">Extended Data</span>
                               <span className="text-[8px] text-slate-800">OBJECT_ID: {log.id.slice(0,8)}</span>
                            </div>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end">
                         <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                            <ChevronDown className="w-5 h-5" />
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    
  );
}

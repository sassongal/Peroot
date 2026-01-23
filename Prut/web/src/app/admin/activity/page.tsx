"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { Activity, User, FileText, Settings as SettingsIcon, Clock } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  profiles: { email: string } | null;
  details: Record<string, any>;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'users' | 'prompts' | 'settings'>('all');

  const supabase = createClient();

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'users') return log.entity_type === 'user';
    if (filter === 'prompts') return log.entity_type === 'prompt';
    if (filter === 'settings') return log.entity_type === 'settings';
    return true;
  });

  function getActionIcon(entityType: string) {
    switch (entityType) {
      case 'user': return User;
      case 'prompt': return FileText;
      case 'settings': return SettingsIcon;
      default: return Activity;
    }
  }

  function getActionColor(action: string) {
    if (action.includes('create')) return 'text-green-400';
    if (action.includes('delete')) return 'text-red-400';
    if (action.includes('update')) return 'text-blue-400';
    return 'text-slate-400';
  }

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">יומן פעילות</h1>
          <p className="text-slate-400">מעקב אחר כל הפעולות במערכת</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'הכל' },
            { value: 'users', label: 'משתמשים' },
            { value: 'prompts', label: 'פרומפטים' },
            { value: 'settings', label: 'הגדרות' }
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-xl transition-all ${
                filter === f.value
                  ? 'bg-white/10 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Activity List */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">טוען...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">אין פעילות להצגה</div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredLogs.map((log) => {
                const Icon = getActionIcon(log.entity_type);
                const colorClass = getActionColor(log.action);

                return (
                  <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                            {log.entity_type}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-400 space-y-1">
                          <div>משתמש: {log.profiles?.email || 'לא ידוע'}</div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="text-xs font-mono bg-black/20 p-2 rounded mt-2">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString('he-IL')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

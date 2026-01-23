"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  Loader,
  HardDrive
} from "lucide-react";
import { toast } from "sonner";

export default function DatabasePage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const supabase = createClient();

  async function createBackup() {
    setBackupLoading(true);
    try {
      // Export all tables data
      const tables = [
        'profiles',
        'personal_library',
        'library_favorites',
        'ai_prompts',
        'ai_prompt_versions',
        'site_settings',
        'user_roles'
      ];

      const backup: Record<string, any> = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {}
      };

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (!error && data) {
          backup.tables[table] = data;
        }
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peroot-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Backup created successfully');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Backup failed');
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      'אזהרה: שחזור מגיבוי ימחק את כל הנתונים הקיימים. האם להמשיך?'
    );
    
    if (!confirmed) return;

    setRestoreLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // Validate backup format
      if (!backup.tables || !backup.version) {
        throw new Error('Invalid backup format');
      }

      toast.info('Restore feature requires admin API implementation');
      
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Restore failed');
    } finally {
      setRestoreLoading(false);
    }
  }

  async function optimizeDatabase() {
    toast.info('Database optimization via VACUUM - contact Supabase support');
  }

  async function viewDatabaseStats() {
    try {
      const stats = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('personal_library').select('*', { count: 'exact', head: true }),
        supabase.from('ai_prompts').select('*', { count: 'exact', head: true }),
      ]);

      toast.success(
        `Users: ${stats[0].count}, Prompts: ${stats[1].count}, AI Prompts: ${stats[2].count}`
      );
    } catch (error) {
      toast.error('Failed to fetch stats');
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">ניהול מסד נתונים</h1>
          <p className="text-slate-400">גיבויים, שחזורים ותחזוקה</p>
        </div>

        {/* Warning Banner */}
        <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-500 mb-1">אזהרה</div>
            <div className="text-sm text-slate-300">
              פעולות גיבוי ושחזור משפיעות על כל הנתונים במערכת. בצע רק אם אתה בטוח במה שאתה עושה.
            </div>
          </div>
        </div>

        {/* Backup Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">יצירת גיבוי</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              יצירת גיבוי מלא של כל הנתונים במערכת. הקובץ ישמר במחשב שלך בפורמט JSON.
            </p>

            <button
              onClick={createBackup}
              disabled={backupLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-xl transition-colors"
            >
              {backupLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  יוצר גיבוי...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  יצירת גיבוי עכשיו
                </>
              )}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <InfoCard label="כולל טבלאות" value="7" />
              <InfoCard label="גודל משוער" value="~5 MB" />
              <InfoCard label="פורמט" value="JSON" />
            </div>
          </div>
        </div>

        {/* Restore Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Upload className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold">שחזור מגיבוי</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              שחזור נתונים מקובץ גיבוי. <span className="text-red-400 font-semibold">פעולה זו תמחק את כל הנתונים הקיימים!</span>
            </p>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={restoreLoading}
                className="hidden"
                id="restore-file"
              />
              <label
                htmlFor="restore-file"
                className={`flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer inline-flex ${
                  restoreLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {restoreLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    משחזר...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    בחר קובץ גיבוי
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Maintenance Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/20">
              <HardDrive className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold">תחזוקה</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={optimizeDatabase}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-right"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="font-medium">אופטימיזציה</div>
                <div className="text-xs text-slate-400">נקה וארגן את מסד הנתונים</div>
              </div>
            </button>

            <button
              onClick={viewDatabaseStats}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors text-right"
            >
              <Database className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium">סטטיסטיקות</div>
                <div className="text-xs text-slate-400">הצג מידע על הטבלאות</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-white/5 rounded-lg">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

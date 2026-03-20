"use client";

import { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getApiPath } from "@/lib/api-path";

interface Version {
  id: string;
  version_number: number;
  content: string;
  title: string | null;
  created_at: string;
}

interface VersionHistoryModalProps {
  promptId: string;
  promptTitle: string;
  onClose: () => void;
  onRestore: (content: string, title: string | null) => void;
}

export function VersionHistoryModal({ promptId, promptTitle, onClose, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    async function loadVersions() {
      try {
        const res = await fetch(getApiPath(`/api/prompts/versions?promptId=${promptId}`));
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setVersions(data.versions || []);
      } catch {
        toast.error("שגיאה בטעינת היסטוריית גרסאות");
      } finally {
        setLoading(false);
      }
    }
    loadVersions();
  }, [promptId]);

  async function handleRestore(version: Version) {
    setRestoring(true);
    try {
      const res = await fetch(getApiPath("/api/prompts/versions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId, versionId: version.id }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      const data = await res.json();
      toast.success(`שוחזרה גרסה ${version.version_number}`);
      onRestore(data.content, data.title);
      onClose();
    } catch {
      toast.error("שגיאה בשחזור גרסה");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="bg-[#111] border border-[var(--glass-border)] rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl mx-4 flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">היסטוריית גרסאות</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{promptTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
              <div className="animate-pulse">טוען גרסאות...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p>אין גרסאות קודמות עדיין</p>
              <p className="text-xs mt-1">גרסאות נשמרות אוטומטית בכל עריכה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map(version => (
                <div key={version.id}>
                  <button
                    onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                    className={cn(
                      "w-full text-start p-3 rounded-xl border transition-all cursor-pointer",
                      selectedVersion?.id === version.id
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-[var(--glass-bg)] border-[var(--glass-border)] hover:bg-[var(--glass-bg)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          v{version.version_number}
                        </span>
                        {version.title && (
                          <span className="text-sm text-[var(--text-secondary)] truncate max-w-[200px]">{version.title}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(version.created_at).toLocaleString("he-IL", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </button>

                  {/* Expanded version content */}
                  {selectedVersion?.id === version.id && (
                    <div className="mt-2 p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] animate-in slide-in-from-top-2 duration-200">
                      <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto" dir="rtl">
                        {version.content}
                      </pre>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => handleRestore(version)}
                          disabled={restoring}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {restoring ? "משחזר..." : "שחזר גרסה זו"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  PenTool,
  Zap,
  Eye,
  CheckCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Plus,
  Clock,
  CheckCheck,
  Save,
  X,
  TrendingUp,
  BookOpen,
  Bookmark,
} from "lucide-react";
import type { ContentFactoryStats, PendingItem, Preset, CronSettings } from "./types";
import { ARTICLE_TYPES, DAYS_SHORT, formatDate, nextCronDate } from "./types";
import { StatCard, TypeIcon, PreviewModal } from "./shared";

// ── Tab 1: Creation + Pending ─────────────────────────────────────────────────

export function TabCreation({
  stats,
  pending,
  rawPendingData,
  onRefresh,
}: {
  stats: ContentFactoryStats | null;
  pending: PendingItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawPendingData: Record<string, any>;
  onRefresh: () => void;
}) {
  const [blogTopic, setBlogTopic] = useState("");
  const [blogTemplate, setBlogTemplate] = useState<string>(ARTICLE_TYPES[0].value);
  const [promptTopic, setPromptTopic] = useState("");
  const [promptCategory, setPromptCategory] = useState("");
  const [generatingBlog, setGeneratingBlog] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [previewItem, setPreviewItem] = useState<PendingItem | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [cronSettings, setCronSettings] = useState<CronSettings>({
    enabled: false,
    day: 1,
    hour: 9,
    draftExpiryDays: 30,
    categoryTargets: {},
  });

  useEffect(() => {
    const saved = localStorage.getItem("cf_presets");
    if (saved) {
      try { setPresets(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const cronSaved = localStorage.getItem("cf_cron");
    if (cronSaved) {
      try { setCronSettings(JSON.parse(cronSaved)); } catch { /* ignore */ }
    }
    if (stats?.categories?.[0]) {
      setPromptCategory(stats.categories[0]);
    }
  }, [stats]);

  const generateBlog = async () => {
    setGeneratingBlog(true);
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory/generate-blog"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: blogTopic, template: blogTemplate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("פוסט בלוג נוצר! ממתין לאישור.");
      setBlogTopic("");
      onRefresh();
    } catch {
      toast.error("שגיאה ביצירת פוסט בלוג");
    } finally {
      setGeneratingBlog(false);
    }
  };

  const generatePrompts = async () => {
    setGeneratingPrompts(true);
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory/generate-prompts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: promptTopic, category: promptCategory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("5 פרומפטים נוצרו! ממתינים לאישור.");
      setPromptTopic("");
      onRefresh();
    } catch {
      toast.error("שגיאה ביצירת פרומפטים");
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const approve = async (ids: string[], type: "blog" | "prompt") => {
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(type === "blog" ? "הפוסט אושר ופורסם" : `${ids.length} פרומפטים אושרו`);
      onRefresh();
    } catch {
      toast.error("שגיאה באישור");
    }
  };

  const approveAll = async () => {
    const blogIds = pending.filter((p) => p.type === "blog").map((p) => p.id);
    const promptIds = pending.filter((p) => p.type === "prompt").map((p) => p.id);
    if (blogIds.length > 0) await approve(blogIds, "blog");
    if (promptIds.length > 0) await approve(promptIds, "prompt");
  };

  const deleteDraft = async (id: string, type: "blog" | "prompt") => {
    if (!confirm("למחוק פריט זה?")) return;
    try {
      const endpoint = type === "blog" ? "/api/admin/blog" : "/api/admin/library";
      const res = await fetch(getApiPath(endpoint), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("נמחק");
      onRefresh();
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const regenerate = async (id: string, type: "blog" | "prompt") => {
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory/regenerate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("נשלח לייצור מחדש");
      onRefresh();
    } catch {
      toast.error("שגיאה בייצור מחדש");
    }
  };

  const savePreset = () => {
    if (!newPresetName.trim()) { toast.error("יש להזין שם לפרסט"); return; }
    setSavingPreset(true);
    const preset: Preset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      type: "blog",
      topic: blogTopic,
      template: blogTemplate,
      category: promptCategory,
    };
    const updated = [...presets, preset];
    setPresets(updated);
    localStorage.setItem("cf_presets", JSON.stringify(updated));
    setNewPresetName("");
    setShowPresetForm(false);
    setSavingPreset(false);
    toast.success("פרסט נשמר");
  };

  const applyPreset = (preset: Preset) => {
    if (preset.topic) setBlogTopic(preset.topic);
    if (preset.template) setBlogTemplate(preset.template);
    if (preset.category) setPromptCategory(preset.category);
    toast.success(`פרסט "${preset.name}" הוחל`);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("cf_presets", JSON.stringify(updated));
  };

  const inputCls = "w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-3 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors";
  const selectCls = "w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/40 transition-colors appearance-none";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="פרומפטים בספריה" value={stats?.totalPrompts ?? "—"} color="blue" icon={BookOpen} />
        <StatCard label="פוסטי בלוג" value={stats?.totalBlogPosts ?? "—"} color="purple" icon={PenTool} />
        <StatCard label="ממתינים לאישור" value={stats?.pendingApproval ?? "—"} color="amber" icon={Clock} />
        <StatCard label="נוצרו השבוע" value={stats?.createdThisWeek ?? "—"} color="emerald" icon={TrendingUp} />
      </div>

      {/* Generation cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blog generation card */}
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">צור פוסט בלוג</h3>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-0.5">AI Generation</p>
            </div>
          </div>
          <div className="space-y-3">
            <input type="text" value={blogTopic} onChange={(e) => setBlogTopic(e.target.value)} placeholder="נושא (אופציונלי)" className={inputCls} />
            <select value={blogTemplate} onChange={(e) => setBlogTemplate(e.target.value)} className={selectCls}>
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateBlog}
            disabled={generatingBlog}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-linear-to-l from-amber-600 to-amber-500 text-white font-black text-sm uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-600/20"
          >
            {generatingBlog ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />מייצר תוכן...</>
            ) : (
              <>🚀 צור עכשיו</>
            )}
          </button>
        </div>

        {/* Prompts generation card */}
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">צור 5 פרומפטים</h3>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-0.5">Batch Generation</p>
            </div>
          </div>
          <div className="space-y-3">
            <input type="text" value={promptTopic} onChange={(e) => setPromptTopic(e.target.value)} placeholder="נושא (אופציונלי)" className={inputCls} />
            <select value={promptCategory} onChange={(e) => setPromptCategory(e.target.value)} className={selectCls}>
              <option value="">קטגוריה כלשהי</option>
              {(stats?.categories ?? []).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generatePrompts}
            disabled={generatingPrompts}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-linear-to-l from-amber-600 to-amber-500 text-white font-black text-sm uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-600/20"
          >
            {generatingPrompts ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />מייצר תוכן...</>
            ) : (
              <>⚡ צור עכשיו</>
            )}
          </button>
        </div>
      </div>

      {/* Presets section */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bookmark className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">פרסטים שמורים</h3>
          </div>
          <button
            onClick={() => setShowPresetForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {showPresetForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showPresetForm ? "ביטול" : "שמור נוכחי"}
          </button>
        </div>
        {showPresetForm && (
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="שם הפרסט..."
              className="flex-1 bg-zinc-900 border border-white/5 text-white rounded-xl px-4 py-2 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && savePreset()}
            />
            <button
              onClick={savePreset}
              disabled={savingPreset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Save className="w-3.5 h-3.5" />שמור
            </button>
          </div>
        )}
        {presets.length === 0 && !showPresetForm ? (
          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest text-center py-4">אין פרסטים שמורים עדיין</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div key={preset.id} className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                <button onClick={() => applyPreset(preset)} className="text-[11px] font-bold text-zinc-300 hover:text-white transition-colors">{preset.name}</button>
                <button onClick={() => deletePreset(preset.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cron status */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-950/50 border border-white/5 rounded-2xl w-fit">
        <div className={cn("w-2 h-2 rounded-full", cronSettings.enabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-700")} />
        <span className="text-[11px] font-bold text-zinc-400">
          {cronSettings.enabled ? (
            <>
              Cron שבועי: <span className="text-emerald-400 font-black">פעיל ✅</span>
              {" "}|{" "}
              <span className="text-zinc-400">ריצה הבאה: יום {DAYS_SHORT[cronSettings.day]} {nextCronDate(cronSettings.day)}</span>
            </>
          ) : (
            <>Cron שבועי: <span className="text-zinc-500 font-black">כבוי</span></>
          )}
        </span>
      </div>

      {/* Pending section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">ממתינים לאישור</h3>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{pending.length} פריטים</p>
            </div>
          </div>
          {pending.length > 0 && (
            <button
              onClick={approveAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              <CheckCheck className="w-4 h-4" />
              אשר הכל ({pending.length})
            </button>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-12 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500/30 mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">אין פריטים ממתינים לאישור</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="bg-zinc-950/50 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-all group">
                <span className="shrink-0 text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">AI</span>

                {rawPendingData[item.id]?.source_metadata?.qa_score != null &&
                  rawPendingData[item.id].source_metadata.qa_score < 80 && (
                  <span className={cn(
                    "shrink-0 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest",
                    rawPendingData[item.id].source_metadata.qa_score < 50
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  )}>
                    QA {rawPendingData[item.id].source_metadata.qa_score}
                  </span>
                )}

                <TypeIcon type={item.type} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {item.type === "blog" ? "פוסט בלוג" : "פרומפט"}{" "}
                    {item.category && `· ${item.category}`} · {formatDate(item.created_at)}
                  </p>
                </div>

                {item.type === "prompt" && item.batch_id && (
                  <button
                    onClick={() => approve([item.id, ...(item.batch_items?.map((b) => b.id) ?? [])], "prompt")}
                    className="shrink-0 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    אשר 5 פרומפטים
                  </button>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setPreviewItem(item)} title="תצוגה מקדימה" className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => approve([item.id], item.type)} title="אשר" className="p-2 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <Link href={item.type === "blog" ? `/admin/blog/${item.id}` : `/admin/library`} title="ערוך" className="p-2 rounded-xl text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button onClick={() => regenerate(item.id, item.type)} title="ייצר מחדש" className="p-2 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteDraft(item.id, item.type)} title="מחק" className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} fullData={rawPendingData[previewItem.id]} />
      )}
    </div>
  );
}

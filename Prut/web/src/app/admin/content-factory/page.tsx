"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
  Factory,
  BarChart2,
  Settings,
  Layers,
  Clock,
  AlertTriangle,
  CheckCheck,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  TrendingUp,
  BookOpen,
  Bookmark,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = "creation" | "performance" | "content" | "settings";

interface ContentFactoryStats {
  totalPrompts: number;
  totalBlogPosts: number;
  pendingApproval: number;
  createdThisWeek: number;
  categories: string[];
  topPrompts: TopPrompt[];
  topBlogPosts: TopBlogPost[];
  categoryBalance: CategoryBalance[];
  deadContent: DeadItem[];
}

interface PendingItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  content?: string;
  category?: string;
  created_at: string;
  batch_id?: string;
  batch_items?: PendingItem[];
}

interface TopPrompt {
  id: string;
  title: string;
  category: string;
  use_count: number;
  favorites: number;
}

interface TopBlogPost {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
}

interface CategoryBalance {
  name: string;
  count: number;
  target: number;
}

interface DeadItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  created_at: string;
}

interface ContentItem {
  id: string;
  type: "blog" | "prompt";
  title: string;
  category: string | null;
  status: "draft" | "published";
  created_at: string;
}

interface Preset {
  id: string;
  name: string;
  type: "blog" | "prompt";
  topic: string;
  template?: string;
  category?: string;
}

interface CronSettings {
  enabled: boolean;
  day: number;
  hour: number;
  draftExpiryDays: number;
  categoryTargets: Record<string, number>;
}

const ARTICLE_TYPES = [
  { value: "guide", label: "מדריך מעמיק" },
  { value: "listicle", label: "רשימה (Listicle)" },
  { value: "comparison", label: "השוואה" },
  { value: "faq", label: "שאלות ותשובות" },
] as const;

const DAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const CATEGORY_COLORS: string[] = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  });
}

function nextCronDate(day: number): string {
  const now = new Date();
  const current = now.getDay();
  let daysUntil = day - current;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  return `${next.getDate()}/${next.getMonth() + 1}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  color: "amber" | "blue" | "emerald" | "purple";
  icon: React.ElementType;
}) {
  const colorMap = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 flex flex-col gap-4 group hover:border-white/10 transition-all">
      <div className={cn("p-3 rounded-2xl border w-fit", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
          {value}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative",
        active
          ? "bg-white/10 text-white shadow-xl"
          : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[8px] font-black flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={cn(
        "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border",
        status === "published"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      )}
    >
      {status === "published" ? "מפורסם" : "טיוטה"}
    </span>
  );
}

function TypeIcon({ type }: { type: "blog" | "prompt" }) {
  return type === "blog" ? (
    <PenTool className="w-4 h-4 text-blue-400" />
  ) : (
    <Zap className="w-4 h-4 text-amber-400" />
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  item,
  onClose,
  fullData,
}: {
  item: PendingItem;
  onClose: () => void;
  fullData?: any;
}) {

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <TypeIcon type={item.type} />
            <div>
              <h3 className="text-lg font-black text-white">{item.title}</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                {item.type === "blog" ? "פוסט בלוג" : "פרומפט"} · {formatDate(item.created_at)}
                {item.category && ` · ${item.category}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {item.type === "blog" && fullData ? (
          <div className="space-y-4">
            {fullData.meta_title && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">SEO Title</p>
                <p className="text-sm text-amber-400">{fullData.meta_title}</p>
              </div>
            )}
            {fullData.meta_description && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">SEO Description</p>
                <p className="text-sm text-zinc-300">{fullData.meta_description}</p>
              </div>
            )}
            {fullData.excerpt && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">תקציר</p>
                <p className="text-sm text-zinc-300">{fullData.excerpt}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {fullData.category && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">{fullData.category}</span>
              )}
              {fullData.read_time && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">{fullData.read_time}</span>
              )}
              {(fullData.tags ?? []).map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">#{tag}</span>
              ))}
            </div>
            {/* Hebrew QA Badge */}
            {fullData.source_metadata?.qa_score != null && (
              <div className={cn(
                "rounded-xl p-3 border",
                fullData.source_metadata.qa_score >= 80
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : fullData.source_metadata.qa_score >= 50
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-rose-500/5 border-rose-500/20"
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    fullData.source_metadata.qa_score >= 80 ? "text-emerald-400" :
                    fullData.source_metadata.qa_score >= 50 ? "text-amber-400" : "text-rose-400"
                  )}>
                    בדיקת עברית: {fullData.source_metadata.qa_score}/100
                  </span>
                  {fullData.source_metadata.qa_score < 80 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                {(fullData.source_metadata.qa_issues?.length ?? 0) > 0 && (
                  <ul className="space-y-0.5">
                    {fullData.source_metadata.qa_issues.map((issue: string, i: number) => (
                      <li key={i} className="text-xs text-zinc-400">• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="border-t border-white/5 pt-4">
              <div
                className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-2 [&_strong]:text-white [&_a]:text-amber-400 [&_ul]:list-disc [&_ol]:list-decimal"
                dangerouslySetInnerHTML={{ __html: fullData.content || "" }}
              />
            </div>
          </div>
        ) : item.type === "prompt" && fullData ? (
          <div className="space-y-4">
            {fullData.use_case && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">שימוש</p>
                <p className="text-sm text-zinc-300">{fullData.use_case}</p>
              </div>
            )}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">הפרומפט</p>
              <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-mono bg-black/30 rounded-lg p-4 border border-white/5 max-h-[40vh] overflow-y-auto">
                {fullData.prompt || "—"}
              </div>
            </div>
            {(fullData.variables?.length ?? 0) > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">משתנים</p>
                <div className="flex flex-wrap gap-2">
                  {fullData.variables.map((v: string) => (
                    <span key={v} className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
            )}
            {fullData.output_format && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">פורמט פלט</p>
                <p className="text-sm text-zinc-300">{fullData.output_format}</p>
              </div>
            )}
            {(fullData.quality_checks?.length ?? 0) > 0 && (
              <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">בדיקות איכות</p>
                <ul className="space-y-1">
                  {fullData.quality_checks.map((qc: string, i: number) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{qc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {fullData.category_id && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">{fullData.category_id}</span>
              )}
              {fullData.capability_mode && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">{fullData.capability_mode}</span>
              )}
            </div>
            {/* Hebrew QA Badge for prompts */}
            {fullData.source_metadata?.qa_score != null && (
              <div className={cn(
                "rounded-xl p-3 border",
                fullData.source_metadata.qa_score >= 80
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : fullData.source_metadata.qa_score >= 50
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-rose-500/5 border-rose-500/20"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    fullData.source_metadata.qa_score >= 80 ? "text-emerald-400" :
                    fullData.source_metadata.qa_score >= 50 ? "text-amber-400" : "text-rose-400"
                  )}>
                    בדיקת עברית: {fullData.source_metadata.qa_score}/100
                  </span>
                  {fullData.source_metadata.qa_score < 80 && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                {(fullData.source_metadata.qa_issues?.length ?? 0) > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {fullData.source_metadata.qa_issues.map((issue: string, i: number) => (
                      <li key={i} className="text-xs text-zinc-400">• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm font-bold text-center py-8">
            אין תצוגה מקדימה זמינה
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Creation + Pending ─────────────────────────────────────────────────

function TabCreation({
  stats,
  pending,
  rawPendingData,
  onRefresh,
}: {
  stats: ContentFactoryStats | null;
  pending: PendingItem[];
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
      try {
        setPresets(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    const cronSaved = localStorage.getItem("cf_cron");
    if (cronSaved) {
      try {
        setCronSettings(JSON.parse(cronSaved));
      } catch {
        // ignore
      }
    }
    if (stats?.categories?.[0]) {
      setPromptCategory(stats.categories[0]);
    }
  }, [stats]);

  const generateBlog = async () => {
    setGeneratingBlog(true);
    try {
      const res = await fetch(
        getApiPath("/api/admin/content-factory/generate-blog"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: blogTopic, template: blogTemplate }),
        }
      );
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
      const res = await fetch(
        getApiPath("/api/admin/content-factory/generate-prompts"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: promptTopic, category: promptCategory }),
        }
      );
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
      const res = await fetch(
        getApiPath("/api/admin/content-factory/approve"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, type }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(
        type === "blog" ? "הפוסט אושר ופורסם" : `${ids.length} פרומפטים אושרו`
      );
      onRefresh();
    } catch {
      toast.error("שגיאה באישור");
    }
  };

  const approveAll = async () => {
    const blogIds = pending
      .filter((p) => p.type === "blog")
      .map((p) => p.id);
    const promptIds = pending
      .filter((p) => p.type === "prompt")
      .map((p) => p.id);
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
      const res = await fetch(
        getApiPath("/api/admin/content-factory/regenerate"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, type }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("נשלח לייצור מחדש");
      onRefresh();
    } catch {
      toast.error("שגיאה בייצור מחדש");
    }
  };

  const savePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("יש להזין שם לפרסט");
      return;
    }
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

  const inputCls =
    "w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-3 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors";
  const selectCls =
    "w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/40 transition-colors appearance-none";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="פרומפטים בספריה"
          value={stats?.totalPrompts ?? "—"}
          color="blue"
          icon={BookOpen}
        />
        <StatCard
          label="פוסטי בלוג"
          value={stats?.totalBlogPosts ?? "—"}
          color="purple"
          icon={PenTool}
        />
        <StatCard
          label="ממתינים לאישור"
          value={stats?.pendingApproval ?? "—"}
          color="amber"
          icon={Clock}
        />
        <StatCard
          label="נוצרו השבוע"
          value={stats?.createdThisWeek ?? "—"}
          color="emerald"
          icon={TrendingUp}
        />
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
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-0.5">
                AI Generation
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={blogTopic}
              onChange={(e) => setBlogTopic(e.target.value)}
              placeholder="נושא (אופציונלי)"
              className={inputCls}
            />
            <select
              value={blogTemplate}
              onChange={(e) => setBlogTemplate(e.target.value)}
              className={selectCls}
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generateBlog}
            disabled={generatingBlog}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-black text-sm uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-600/20"
          >
            {generatingBlog ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                מייצר תוכן...
              </>
            ) : (
              <>
                🚀 צור עכשיו
              </>
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
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-0.5">
                Batch Generation
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={promptTopic}
              onChange={(e) => setPromptTopic(e.target.value)}
              placeholder="נושא (אופציונלי)"
              className={inputCls}
            />
            <select
              value={promptCategory}
              onChange={(e) => setPromptCategory(e.target.value)}
              className={selectCls}
            >
              <option value="">קטגוריה כלשהי</option>
              {(stats?.categories ?? []).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generatePrompts}
            disabled={generatingPrompts}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-black text-sm uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-600/20"
          >
            {generatingPrompts ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                מייצר תוכן...
              </>
            ) : (
              <>
                ⚡ צור עכשיו
              </>
            )}
          </button>
        </div>
      </div>

      {/* Presets section */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bookmark className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              פרסטים שמורים
            </h3>
          </div>
          <button
            onClick={() => setShowPresetForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {showPresetForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
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
              <Save className="w-3.5 h-3.5" />
              שמור
            </button>
          </div>
        )}

        {presets.length === 0 && !showPresetForm ? (
          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest text-center py-4">
            אין פרסטים שמורים עדיין
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <button
                  onClick={() => applyPreset(preset)}
                  className="text-[11px] font-bold text-zinc-300 hover:text-white transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cron status */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-950/50 border border-white/5 rounded-2xl w-fit">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            cronSettings.enabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"
          )}
        />
        <span className="text-[11px] font-bold text-zinc-400">
          {cronSettings.enabled ? (
            <>
              Cron שבועי:{" "}
              <span className="text-emerald-400 font-black">פעיל ✅</span>
              {" "}|{" "}
              <span className="text-zinc-400">
                ריצה הבאה: יום {DAYS_SHORT[cronSettings.day]}{" "}
                {nextCronDate(cronSettings.day)}
              </span>
            </>
          ) : (
            <>
              Cron שבועי:{" "}
              <span className="text-zinc-500 font-black">כבוי</span>
            </>
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
              <h3 className="text-lg font-black text-white">
                ממתינים לאישור
              </h3>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                {pending.length} פריטים
              </p>
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
              אין פריטים ממתינים לאישור
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-950/50 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-all group"
              >
                {/* AI badge */}
                <span className="shrink-0 text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">
                  AI
                </span>

                {/* QA warning badge */}
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

                {/* Type icon */}
                <TypeIcon type={item.type} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {item.type === "blog" ? "פוסט בלוג" : "פרומפט"}{" "}
                    {item.category && `· ${item.category}`} · {formatDate(item.created_at)}
                  </p>
                </div>

                {/* Batch approve for prompts */}
                {item.type === "prompt" && item.batch_id && (
                  <button
                    onClick={() =>
                      approve(
                        [item.id, ...(item.batch_items?.map((b) => b.id) ?? [])],
                        "prompt"
                      )
                    }
                    className="shrink-0 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/20 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    אשר 5 פרומפטים
                  </button>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewItem(item)}
                    title="תצוגה מקדימה"
                    className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => approve([item.id], item.type)}
                    title="אשר"
                    className="p-2 rounded-xl text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <Link
                    href={
                      item.type === "blog"
                        ? `/admin/blog/${item.id}`
                        : `/admin/library`
                    }
                    title="ערוך"
                    className="p-2 rounded-xl text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => regenerate(item.id, item.type)}
                    title="ייצר מחדש"
                    className="p-2 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDraft(item.id, item.type)}
                    title="מחק"
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
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

// ── Tab 2: Performance ─────────────────────────────────────────────────────────

function TabPerformance({ stats }: { stats: ContentFactoryStats | null }) {
  const maxCategoryCount = Math.max(
    ...(stats?.categoryBalance ?? []).map((c) => c.count),
    1
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top prompts */}
      <div className="space-y-4">
        <SectionTitle icon={Zap} color="amber" title="פרומפטים מובילים" sub="Top performing prompts by usage" />
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["#", "כותרת", "קטגוריה", "שימושים", "מועדפים"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {!stats?.topPrompts || stats.topPrompts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]"
                  >
                    אין נתונים זמינים
                  </td>
                </tr>
              ) : (
                stats.topPrompts.map((p, i) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4 text-[11px] font-black text-zinc-600">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white max-w-xs truncate">
                      {p.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-white tabular-nums">
                      {p.use_count.toLocaleString("he-IL")}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-400 tabular-nums">
                      {p.favorites.toLocaleString("he-IL")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top blog posts */}
      <div className="space-y-4">
        <SectionTitle icon={PenTool} color="blue" title="פוסטי בלוג מובילים" sub="Top blog posts" />
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["#", "כותרת", "קטגוריה", "תאריך יצירה"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {!stats?.topBlogPosts || stats.topBlogPosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]"
                  >
                    אין נתונים זמינים
                  </td>
                </tr>
              ) : (
                stats.topBlogPosts.map((p, i) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 text-[11px] font-black text-zinc-600">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white max-w-xs truncate">
                      {p.title}
                    </td>
                    <td className="px-6 py-4">
                      {p.category ? (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                          {p.category}
                        </span>
                      ) : (
                        <span className="text-zinc-700 text-[10px] font-bold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-zinc-500">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category balance bar chart */}
      <div className="space-y-4">
        <SectionTitle icon={BarChart2} color="emerald" title="איזון קטגוריות" sub="Content distribution across categories" />
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 space-y-4">
          {!stats?.categoryBalance || stats.categoryBalance.length === 0 ? (
            <p className="text-center text-zinc-700 font-black uppercase tracking-widest text-[9px] py-8">
              אין נתוני קטגוריות
            </p>
          ) : (
            stats.categoryBalance.map((cat, i) => {
              const pct = Math.round((cat.count / maxCategoryCount) * 100);
              const isLow = cat.target > 0 && cat.count < cat.target * 0.5;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isLow && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-sm font-bold text-zinc-300">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-zinc-500 tabular-nums">
                      {cat.count}
                      {cat.target > 0 && (
                        <span className="text-zinc-700"> / {cat.target}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        isLow && "opacity-50"
                      )}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dead content */}
      <div className="space-y-4">
        <SectionTitle icon={AlertTriangle} color="amber" title="תוכן ללא מעורבות" sub="Items with 0 engagement after 30 days" />
        <div className="space-y-2">
          {!stats?.deadContent || stats.deadContent.length === 0 ? (
            <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
                כל התוכן מציג מעורבות
              </p>
            </div>
          ) : (
            stats.deadContent.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-zinc-950/50 border border-white/5 rounded-2xl px-5 py-3.5 hover:border-white/10 transition-all"
              >
                <TypeIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-300 truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {item.type === "blog" ? "פוסט בלוג" : "פרומפט"} · {formatDate(item.created_at)}
                  </p>
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  0 מעורבות
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Content Management ──────────────────────────────────────────────────

function TabContent() {
  type ContentFilter = "all" | "blog" | "prompt";
  type StatusFilter = "all" | "draft" | "published";

  const [contentType, setContentType] = useState<ContentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 20;

  const loadContent = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });
      if (contentType !== "all") params.set("type", contentType);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(
        getApiPath(`/api/admin/content-factory?${params}`)
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: ContentItem[]; hasMore: boolean } = await res.json();
      if (reset) {
        setItems(data.items ?? []);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...(data.items ?? [])]);
      }
      setHasMore(data.hasMore ?? false);
    } catch {
      toast.error("שגיאה בטעינת תוכן");
    } finally {
      setLoading(false);
    }
  }, [contentType, statusFilter, search, page]);

  useEffect(() => {
    loadContent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const deleteItem = async (id: string, type: "blog" | "prompt") => {
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
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`למחוק ${selected.size} פריטים?`)) return;
    const toDelete = items.filter((i) => selected.has(i.id));
    for (const item of toDelete) {
      try {
        const endpoint =
          item.type === "blog" ? "/api/admin/blog" : "/api/admin/library";
        await fetch(getApiPath(endpoint), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        // continue
      }
    }
    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    toast.success(`נמחקו ${toDelete.length} פריטים`);
  };

  const typeFilterBtns: { key: ContentFilter; label: string }[] = [
    { key: "all", label: "הכל" },
    { key: "blog", label: "בלוג" },
    { key: "prompt", label: "פרומפטים" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Type toggle */}
        <div className="flex gap-1 p-1 bg-zinc-950 border border-white/5 rounded-2xl">
          {typeFilterBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setContentType(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                contentType === key
                  ? "bg-white/10 text-white"
                  : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-zinc-950 border border-white/5 text-zinc-400 rounded-2xl px-4 py-2.5 text-[11px] font-black focus:outline-none focus:border-white/10 transition-colors"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="draft">טיוטות</option>
          <option value="published">מפורסמים</option>
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-2xl px-4 py-2.5">
          <Search className="w-4 h-4 text-zinc-700 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadContent(true)}
            placeholder="חיפוש..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-zinc-700"
          />
          {search && (
            <button onClick={() => { setSearch(""); loadContent(true); }}>
              <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-300 transition-colors" />
            </button>
          )}
        </div>

        <button
          onClick={() => loadContent(true)}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <Filter className="w-3.5 h-3.5" />
          סנן
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-4 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded bg-zinc-900 border border-white/10 accent-amber-500"
                />
              </th>
              {["סוג", "כותרת", "קטגוריה", "סטטוס", "תאריך", "פעולות"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-zinc-700 mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-16 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]"
                >
                  אין תוצאות
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "hover:bg-white/[0.02] transition-colors",
                    selected.has(item.id) && "bg-white/[0.03]"
                  )}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded bg-zinc-900 border border-white/10 accent-amber-500"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <TypeIcon type={item.type} />
                  </td>
                  <td className="px-5 py-3.5 max-w-xs">
                    <p className="text-sm font-bold text-white truncate">
                      {item.title}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    {item.category ? (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-zinc-400">
                        {item.category}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-zinc-600">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link
                        href={
                          item.type === "blog"
                            ? `/admin/blog/${item.id}`
                            : `/admin/library`
                        }
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteItem(item.id, item.type)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-600">
          {items.length} פריטים נטענו
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (page > 1) {
                setPage((p) => p - 1);
                loadContent();
              }
            }}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-black text-zinc-500 px-2">
            עמוד {page}
          </span>
          <button
            onClick={() => {
              if (hasMore) {
                setPage((p) => p + 1);
                loadContent();
              }
            }}
            disabled={!hasMore}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-4 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-black text-white">
            {selected.size} נבחרו
          </span>
          <div className="w-px h-5 bg-white/10" />
          <button
            onClick={bulkDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק ({selected.size})
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-2 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Settings ───────────────────────────────────────────────────────────

function TabSettings({ stats }: { stats: ContentFactoryStats | null }) {
  const [cronSettings, setCronSettings] = useState<CronSettings>({
    enabled: false,
    day: 1,
    hour: 9,
    draftExpiryDays: 30,
    categoryTargets: {},
  });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cf_cron");
    if (saved) {
      try {
        setCronSettings(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    const savedPresets = localStorage.getItem("cf_presets");
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch {
        // ignore
      }
    }
    // Init category targets if not set
    if (stats?.categories) {
      setCronSettings((prev) => {
        const targets = { ...prev.categoryTargets };
        for (const cat of stats.categories) {
          if (!(cat in targets)) targets[cat] = 20;
        }
        return { ...prev, categoryTargets: targets };
      });
    }
  }, [stats]);

  const saveSettings = () => {
    setSaving(true);
    localStorage.setItem("cf_cron", JSON.stringify(cronSettings));
    setTimeout(() => {
      setSaving(false);
      toast.success("הגדרות נשמרו");
    }, 400);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("cf_presets", JSON.stringify(updated));
    toast.success("פרסט נמחק");
  };

  const maxCategoryCount = Math.max(
    ...(stats?.categoryBalance ?? []).map((c) => c.count),
    1
  );

  const inputCls =
    "bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500/40 transition-colors";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Cron settings */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-6">
        <SectionTitle icon={Clock} color="blue" title="Cron שבועי" sub="Automatic content generation schedule" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm font-black text-white">הפעל ייצור אוטומטי</p>
              <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                {cronSettings.enabled ? "פעיל" : "כבוי"}
              </p>
            </div>
            <button
              onClick={() =>
                setCronSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {cronSettings.enabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Day selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              יום בשבוע
            </label>
            <select
              value={cronSettings.day}
              onChange={(e) =>
                setCronSettings((prev) => ({
                  ...prev,
                  day: Number(e.target.value),
                }))
              }
              disabled={!cronSettings.enabled}
              className={cn(inputCls, "disabled:opacity-40")}
            >
              {DAYS_HE.map((day, i) => (
                <option key={i} value={i}>
                  יום {day}
                </option>
              ))}
            </select>
          </div>

          {/* Hour selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              שעה
            </label>
            <select
              value={cronSettings.hour}
              onChange={(e) =>
                setCronSettings((prev) => ({
                  ...prev,
                  hour: Number(e.target.value),
                }))
              }
              disabled={!cronSettings.enabled}
              className={cn(inputCls, "disabled:opacity-40")}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>

          {/* Draft expiry */}
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
              פג תוקף טיוטות (ימים)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={cronSettings.draftExpiryDays}
              onChange={(e) =>
                setCronSettings((prev) => ({
                  ...prev,
                  draftExpiryDays: Number(e.target.value),
                }))
              }
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-black text-[11px] uppercase tracking-widest hover:from-amber-500 hover:to-amber-400 transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-amber-600/20"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "שומר..." : "שמור הגדרות"}
        </button>
      </div>

      {/* Category balance targets */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-6">
        <SectionTitle icon={BarChart2} color="emerald" title="יעדי קטגוריות" sub="Content distribution targets" />
        {(!stats?.categoryBalance || stats.categoryBalance.length === 0) ? (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center py-6">
            אין קטגוריות זמינות
          </p>
        ) : (
          <div className="space-y-4">
            {stats.categoryBalance.map((cat, i) => {
              const pct = Math.round((cat.count / maxCategoryCount) * 100);
              const target = cronSettings.categoryTargets[cat.name] ?? cat.target ?? 20;
              const isLow = cat.count < target * 0.5;
              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      {isLow && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-sm font-bold text-zinc-300 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                        )}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-zinc-500 w-8 text-left tabular-nums">
                      {cat.count}
                    </span>
                    <span className="text-zinc-700 text-[11px]">/</span>
                    <input
                      type="number"
                      min={0}
                      value={target}
                      onChange={(e) =>
                        setCronSettings((prev) => ({
                          ...prev,
                          categoryTargets: {
                            ...prev.categoryTargets,
                            [cat.name]: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-16 bg-zinc-900 border border-white/5 text-white rounded-xl px-2 py-1.5 text-[11px] font-black text-center focus:outline-none focus:border-amber-500/40 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Presets management */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-7 space-y-5">
        <SectionTitle icon={Bookmark} color="amber" title="ניהול פרסטים" sub="Saved generation presets" />
        {presets.length === 0 ? (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center py-6">
            אין פרסטים שמורים. צור אחד בלשונית יצירה.
          </p>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{preset.name}</p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {preset.type === "blog" ? "פוסט בלוג" : "פרומפטים"}
                    {preset.topic && ` · ${preset.topic}`}
                    {preset.category && ` · ${preset.category}`}
                  </p>
                </div>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-2 rounded-xl text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared SectionTitle ────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  color,
  title,
  sub,
}: {
  icon: React.ElementType;
  color: "amber" | "blue" | "emerald" | "purple";
  title: string;
  sub: string;
}) {
  const colorMap = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2.5 rounded-xl border", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">
          {sub}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentFactoryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("creation");
  const [stats, setStats] = useState<ContentFactoryStats | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [rawPendingData, setRawPendingData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(getApiPath("/api/admin/content-factory"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: {
        stats: ContentFactoryStats;
        pendingBlogs: any[];
        pendingPrompts: any[];
        history: any[];
        categories: any[];
      } = await res.json();
      setStats(data.stats ?? null);

      // Store raw data keyed by ID for preview modal
      const rawMap: Record<string, any> = {};
      for (const b of data.pendingBlogs ?? []) rawMap[b.id] = { ...b, _type: "blog" };
      for (const p of data.pendingPrompts ?? []) rawMap[p.id] = { ...p, _type: "prompt" };
      setRawPendingData(rawMap);

      // Combine pending blogs and prompts into a unified list
      const combinedPending: PendingItem[] = [
        ...(data.pendingBlogs ?? []).map((b: any) => ({
          id: b.id,
          type: "blog" as const,
          title: b.title,
          category: b.category ?? "",
          created_at: b.created_at,
        })),
        ...(data.pendingPrompts ?? []).map((p: any) => ({
          id: p.id,
          type: "prompt" as const,
          title: p.title,
          category: p.category_id ?? "",
          created_at: p.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPending(combinedPending);
    } catch {
      toast.error("שגיאה בטעינת נתוני Content Factory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { key: "creation", label: "יצירה", icon: Factory, badge: pending.length },
    { key: "performance", label: "ביצועים", icon: BarChart2 },
    { key: "content", label: "תוכן", icon: Layers },
    { key: "settings", label: "הגדרות", icon: Settings },
  ];

  return (
    <AdminLayout>
      <div
        dir="rtl"
        className="space-y-8 animate-in fade-in duration-700 pb-24"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-zinc-950/50 p-8 rounded-[40px] border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/[0.04] to-transparent pointer-events-none" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Factory className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">
                Content Factory
              </span>
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter leading-none">
              מפעל התוכן
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-base max-w-xl">
              יצירת תוכן AI אוטומטית · ניהול ואישור פוסטים ופרומפטים · מעקב ביצועים
            </p>
          </div>
          <div className="relative flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all hover:border-white/10"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              רענן
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 p-1.5 bg-zinc-950 border border-white/5 rounded-3xl w-fit">
          {tabs.map((tab) => (
            <TabBtn
              key={tab.key}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.key}
              badge={tab.badge}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[500px]">
          {loading && activeTab === "creation" ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-500/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
                טוען נתונים...
              </span>
            </div>
          ) : (
            <>
              {activeTab === "creation" && (
                <TabCreation
                  stats={stats}
                  pending={pending}
                  rawPendingData={rawPendingData}
                  onRefresh={loadData}
                />
              )}
              {activeTab === "performance" && <TabPerformance stats={stats} />}
              {activeTab === "content" && <TabContent />}
              {activeTab === "settings" && <TabSettings stats={stats} />}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

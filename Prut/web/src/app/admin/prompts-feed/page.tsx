"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Search,
  RefreshCw,
  User,
  Clock,
  ArrowRight,
  Filter,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface PromptFeedItem {
  id: string;
  user_id: string;
  prompt: string;
  enhanced_prompt: string | null;
  title: string | null;
  tone: string | null;
  category: string | null;
  capability_mode: string | null;
  source: string | null;
  created_at: string;
  user_display: string;
}

const MODES = [
  { value: "", label: "כל המצבים" },
  { value: "standard", label: "רגיל" },
  { value: "image", label: "תמונות" },
  { value: "research", label: "מחקר" },
  { value: "agent", label: "סוכן" },
  { value: "video", label: "וידאו" },
];

const PAGE_SIZE = 25;

export default function AdminPromptsFeedPage() {
  const [items, setItems] = useState<PromptFeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PromptFeedItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (opts: { search?: string; mode?: string; offset?: number } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(opts.offset ?? 0),
        });
        if (opts.search?.trim()) params.set("search", opts.search.trim());
        if (opts.mode) params.set("mode", opts.mode);
        const res = await fetch(getApiPath(`/api/admin/prompts-feed?${params}`), {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        logger.error("[admin/prompts-feed] load failed:", e);
        toast.error("שגיאה בטעינת הפיד");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load({ search: "", mode: "", offset: 0 });
  }, [load]);

  // Debounced search + mode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      load({ search, mode, offset: 0 });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, mode, load]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const modeLabel = useMemo(() => {
    const m = MODES.find((x) => x.value === mode);
    return m?.label ?? "כל המצבים";
  }, [mode]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-black text-white" dir="rtl">
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <MessageSquare className="w-7 h-7 text-amber-400" />
                פיד פרומפטים
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                נתונים אמיתיים מטבלת <code className="text-amber-300">history</code> — מה המשתמש כתב ומה המערכת יצרה
              </p>
            </div>
            <button
              onClick={() => load({ search, mode, offset })}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              רענן
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש בפרומפט המשתמש / פלט המערכת / כותרת..."
                className="w-full bg-zinc-950 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Counts */}
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              מציג {items.length} מתוך {total.toLocaleString("he-IL")} · {modeLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = Math.max(0, offset - PAGE_SIZE);
                  setOffset(next);
                  load({ search, mode, offset: next });
                }}
                disabled={offset === 0 || loading}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
                aria-label="קודם"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-zinc-400 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  const next = offset + PAGE_SIZE;
                  if (next >= total) return;
                  setOffset(next);
                  load({ search, mode, offset: next });
                }}
                disabled={offset + PAGE_SIZE >= total || loading}
                className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30"
                aria-label="הבא"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading && items.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">טוען...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">אין תוצאות</div>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelected(it)}
                  className="w-full text-right bg-zinc-950 border border-white/5 rounded-xl p-4 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/admin/users/${it.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-medium"
                      >
                        <User className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{it.user_display}</span>
                      </Link>
                      {it.capability_mode && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 font-medium uppercase tracking-wider">
                          {it.capability_mode}
                        </span>
                      )}
                      {it.source && (
                        <span className="text-[10px] text-zinc-600">מקור: {it.source}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(it.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                      <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-1">
                        קלט משתמש
                      </div>
                      <div className="text-xs text-zinc-300 line-clamp-3 whitespace-pre-line">
                        {it.prompt || <span className="text-zinc-600 italic">(ריק)</span>}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-500/50 rotate-180" />
                    <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                      <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        פלט מערכת
                      </div>
                      <div className="text-xs text-zinc-200 line-clamp-3 whitespace-pre-line">
                        {it.enhanced_prompt || (
                          <span className="text-zinc-600 italic">(ללא פלט)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Drawer for full content */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-stretch justify-start"
            onClick={() => setSelected(null)}
            dir="rtl"
          >
            <div
              className="ml-auto w-full max-w-2xl bg-zinc-950 border-l border-white/10 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">פרומפט מלא</h2>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <Link
                        href={`/admin/users/${selected.user_id}`}
                        className="text-amber-300 hover:text-amber-200"
                      >
                        {selected.user_display}
                      </Link>
                      <span>·</span>
                      <span>{new Date(selected.created_at).toLocaleString("he-IL")}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-zinc-500 hover:text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                {selected.title && (
                  <div className="text-sm font-medium text-zinc-300">{selected.title}</div>
                )}
                <div className="flex gap-2 flex-wrap text-[11px]">
                  {selected.capability_mode && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 uppercase tracking-wider">
                      {selected.capability_mode}
                    </span>
                  )}
                  {selected.tone && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      tone: {selected.tone}
                    </span>
                  )}
                  {selected.category && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      {selected.category}
                    </span>
                  )}
                  {selected.source && (
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                      {selected.source}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-2">
                    קלט משתמש
                  </div>
                  <pre className="bg-zinc-900/60 rounded-lg p-4 text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed border border-white/5">
                    {selected.prompt || "(ריק)"}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    פלט מערכת
                  </div>
                  <pre className="bg-amber-500/5 rounded-lg p-4 text-sm text-zinc-100 whitespace-pre-wrap font-sans leading-relaxed border border-amber-500/20">
                    {selected.enhanced_prompt || "(ללא פלט)"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

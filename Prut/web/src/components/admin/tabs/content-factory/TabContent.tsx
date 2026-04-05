"use client";

import { useState, useCallback, useEffect } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  Edit2,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { ContentItem } from "./types";
import { formatDate } from "./types";
import { StatusBadge, TypeIcon } from "./shared";

// ── Tab 3: Content Management ──────────────────────────────────────────────────

export function TabContent() {
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
      const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
      if (contentType !== "all") params.set("type", contentType);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(getApiPath(`/api/admin/content-factory?${params}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: ContentItem[]; hasMore: boolean } = await res.json();
      if (reset) { setItems(data.items ?? []); setPage(1); }
      else { setItems((prev) => [...prev, ...(data.items ?? [])]); }
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
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const deleteItem = async (id: string, type: "blog" | "prompt") => {
    if (!confirm("למחוק פריט זה?")) return;
    try {
      const endpoint = type === "blog" ? "/api/admin/blog" : "/api/admin/library";
      const res = await fetch(getApiPath(endpoint), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("נמחק");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch { toast.error("שגיאה במחיקה"); }
  };

  const bulkDelete = async () => {
    if (!confirm(`למחוק ${selected.size} פריטים?`)) return;
    const toDelete = items.filter((i) => selected.has(i.id));
    for (const item of toDelete) {
      try {
        const endpoint = item.type === "blog" ? "/api/admin/blog" : "/api/admin/library";
        await fetch(getApiPath(endpoint), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      } catch { /* continue */ }
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
        <div className="flex gap-1 p-1 bg-zinc-950 border border-white/5 rounded-2xl">
          {typeFilterBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setContentType(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                contentType === key ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300"
              )}
            >{label}</button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-zinc-950 border border-white/5 text-zinc-400 rounded-2xl px-4 py-2.5 text-[11px] font-black focus:outline-none focus:border-white/10 transition-colors"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="draft">טיוטות</option>
          <option value="published">מפורסמים</option>
        </select>
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
                <th key={h} className="px-5 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading && items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center"><RefreshCw className="w-8 h-8 animate-spin text-zinc-700 mx-auto" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]">אין תוצאות</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className={cn("hover:bg-white/[0.02] transition-colors", selected.has(item.id) && "bg-white/[0.03]")}>
                  <td className="px-5 py-3.5">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded bg-zinc-900 border border-white/10 accent-amber-500" />
                  </td>
                  <td className="px-5 py-3.5"><TypeIcon type={item.type} /></td>
                  <td className="px-5 py-3.5 max-w-xs"><p className="text-sm font-bold text-white truncate">{item.title}</p></td>
                  <td className="px-5 py-3.5">
                    {item.category ? (
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-zinc-400">{item.category}</span>
                    ) : (
                      <span className="text-zinc-700 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-zinc-600">{formatDate(item.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Link href={item.type === "blog" ? `/admin/blog/${item.id}` : `/admin/library`} className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => deleteItem(item.id, item.type)} className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
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
        <span className="text-[10px] font-bold text-zinc-600">{items.length} פריטים נטענו</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (page > 1) { setPage((p) => p - 1); loadContent(); } }}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-black text-zinc-500 px-2">עמוד {page}</span>
          <button
            onClick={() => { if (hasMore) { setPage((p) => p + 1); loadContent(); } }}
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
          <span className="text-sm font-black text-white">{selected.size} נבחרו</span>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={bulkDelete} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
            מחק ({selected.size})
          </button>
          <button onClick={() => setSelected(new Set())} className="p-2 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

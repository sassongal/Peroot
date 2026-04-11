"use client";

import { cn } from "@/lib/utils";
import {
  PenTool,
  Zap,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import type { ContentFactoryStats } from "./types";
import { CATEGORY_COLORS, formatDate } from "./types";
import { TypeIcon, SectionTitle } from "./shared";

// ── Tab 2: Performance ─────────────────────────────────────────────────────────

export function TabPerformance({ stats }: { stats: ContentFactoryStats | null }) {
  const maxCategoryCount = Math.max(...(stats?.categoryBalance ?? []).map((c) => c.count), 1);

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
                  <th key={h} className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {!stats?.topPrompts || stats.topPrompts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]">אין נתונים זמינים</td></tr>
              ) : (
                stats.topPrompts.map((p, i) => (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-black text-zinc-600">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white max-w-xs truncate">{p.title}</td>
                    <td className="px-6 py-4"><span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">{p.category}</span></td>
                    <td className="px-6 py-4 text-sm font-black text-white tabular-nums">{p.use_count.toLocaleString("he-IL")}</td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-400 tabular-nums">{p.favorites.toLocaleString("he-IL")}</td>
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
                  <th key={h} className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/3">
              {!stats?.topBlogPosts || stats.topBlogPosts.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-700 font-black uppercase tracking-widest text-[9px]">אין נתונים זמינים</td></tr>
              ) : (
                stats.topBlogPosts.map((p, i) => (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-black text-zinc-600">{i + 1}</td>
                    <td className="px-6 py-4 text-sm font-bold text-white max-w-xs truncate">{p.title}</td>
                    <td className="px-6 py-4">
                      {p.category ? (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">{p.category}</span>
                      ) : (
                        <span className="text-zinc-700 text-[10px] font-bold">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-zinc-500">{formatDate(p.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category balance */}
      <div className="space-y-4">
        <SectionTitle icon={BarChart2} color="emerald" title="איזון קטגוריות" sub="Content distribution across categories" />
        <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 space-y-4">
          {!stats?.categoryBalance || stats.categoryBalance.length === 0 ? (
            <p className="text-center text-zinc-700 font-black uppercase tracking-widest text-[9px] py-8">אין נתוני קטגוריות</p>
          ) : (
            stats.categoryBalance.map((cat, i) => {
              const pct = Math.round((cat.count / maxCategoryCount) * 100);
              const isLow = cat.target > 0 && cat.count < cat.target * 0.5;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="text-sm font-bold text-zinc-300">{cat.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-zinc-500 tabular-nums">
                      {cat.count}{cat.target > 0 && <span className="text-zinc-700"> / {cat.target}</span>}
                    </span>
                  </div>
                  <div className="h-2 bg-white/4 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", CATEGORY_COLORS[i % CATEGORY_COLORS.length], isLow && "opacity-50")}
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
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">כל התוכן מציג מעורבות</p>
            </div>
          ) : (
            stats.deadContent.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-zinc-950/50 border border-white/5 rounded-2xl px-5 py-3.5 hover:border-white/10 transition-all">
                <TypeIcon type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-300 truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                    {item.type === "blog" ? "פוסט בלוג" : "פרומפט"} · {formatDate(item.created_at)}
                  </p>
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">0 מעורבות</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

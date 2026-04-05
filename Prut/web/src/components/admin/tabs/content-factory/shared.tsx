"use client";

import { cn } from "@/lib/utils";
import { SafeHtml } from "@/components/ui/SafeHtml";
import {
  PenTool,
  Zap,
  X,
  AlertTriangle,
} from "lucide-react";
import type { PendingItem } from "./types";
import { formatDate } from "./types";

// ── Sub-components ────────────────────────────────────────────────────────────

export function StatCard({
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

export function InnerTabBtn({
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

export function StatusBadge({ status }: { status: "draft" | "published" }) {
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

export function TypeIcon({ type }: { type: "blog" | "prompt" }) {
  return type === "blog" ? (
    <PenTool className="w-4 h-4 text-blue-400" />
  ) : (
    <Zap className="w-4 h-4 text-amber-400" />
  );
}

// ── Shared SectionTitle ────────────────────────────────────────────────────────

export function SectionTitle({
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
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

export function PreviewModal({
  item,
  onClose,
  fullData,
}: {
  item: PendingItem;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              <SafeHtml
                html={fullData.content || ""}
                className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-2 [&_strong]:text-white [&_a]:text-amber-400 [&_ul]:list-disc [&_ol]:list-decimal"
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

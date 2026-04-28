"use client";

import { useEffect, useState } from "react";
import { Crown, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tier: string | null | undefined;
  balance: number | null | undefined;
  dailyLimit: number;
  refreshAt: string | null;
  lastSpendAt: string | null;
  usageLast7Days: number[];
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "כעת";
  if (m < 60) return `${m}ד`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ש`;
  return `${Math.floor(h / 24)}י`;
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "מתחדש";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}ש ${m}ד`;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <svg width={56} height={16} viewBox="0 0 56 16" className="shrink-0" aria-hidden>
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / max) * 14));
        return (
          <rect
            key={i}
            x={i * 8}
            y={16 - h}
            width={6}
            height={h}
            className={v > 0 ? "fill-blue-400" : "fill-zinc-700"}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

export function UserCreditsBlock({
  tier,
  balance,
  dailyLimit,
  refreshAt,
  lastSpendAt,
  usageLast7Days,
}: Props) {
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!refreshAt) return;
    const id = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [refreshAt]);

  const t = (tier ?? "free").toLowerCase();
  const b = balance ?? 0;
  const limitLabel = dailyLimit === -1 ? "∞" : String(dailyLimit);

  const tierChip =
    t === "admin" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    ) : t === "pro" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">
        <Crown className="w-2.5 h-2.5" /> Pro
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/60 border border-white/5 text-zinc-300 text-[9px] font-black uppercase tracking-widest">
        Free
      </span>
    );

  const balanceTone =
    t === "admin"
      ? "text-blue-400"
      : t === "pro"
        ? "text-amber-300"
        : b <= 0
          ? "text-red-400"
          : b <= 2
            ? "text-zinc-200"
            : "text-zinc-300";

  const usage = usageLast7Days.length === 7 ? usageLast7Days : Array(7).fill(0);

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]" dir="rtl">
      <div className="flex items-center gap-2">
        {tierChip}
        <span className={cn("text-xs font-mono font-bold", balanceTone)}>
          {t === "admin" ? "∞" : `${b} / ${limitLabel}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Sparkline values={usage} />
        {lastSpendAt ? (
          <span className="text-[9px] text-zinc-600">לפני {timeAgo(lastSpendAt)}</span>
        ) : (
          <span className="text-[9px] text-zinc-700">ללא שימוש</span>
        )}
      </div>
      {t === "free" && refreshAt && b <= 0 ? (
        <div className="flex items-center gap-1 text-[9px] text-amber-400">
          <Clock className="w-2.5 h-2.5" />
          חידוש בעוד {timeLeft(refreshAt)}
        </div>
      ) : null}
    </div>
  );
}

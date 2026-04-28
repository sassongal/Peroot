"use client";

import { cn } from "@/lib/utils";
import { Coins, Crown, Shield } from "lucide-react";

interface Props {
  tier: string | null | undefined;
  balance: number | null | undefined;
}

export function UserCreditsCell({ tier, balance }: Props) {
  const t = (tier ?? "free").toLowerCase();
  const b = balance ?? 0;

  if (t === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
        <Shield className="w-3 h-3" />
        ∞
      </span>
    );
  }

  if (t === "pro") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
        <Crown className="w-3 h-3" />
        {b}
      </span>
    );
  }

  // free
  const tone =
    b <= 0
      ? "bg-red-500/10 border-red-500/20 text-red-400"
      : b <= 2
        ? "bg-zinc-700/30 border-zinc-600/40 text-zinc-300"
        : "bg-zinc-800/40 border-white/5 text-zinc-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
        tone,
      )}
    >
      <Coins className="w-3 h-3" />
      {b}
    </span>
  );
}

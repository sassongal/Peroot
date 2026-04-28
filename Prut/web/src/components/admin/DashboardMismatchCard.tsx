// src/components/admin/DashboardMismatchCard.tsx
"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface Props {
  authCount: number;
  profileCount: number;
  missing: number;
  onSynced: () => void;
}

export function DashboardMismatchCard({ authCount, profileCount, missing, onSynced }: Props) {
  const [busy, setBusy] = useState(false);

  if (missing <= 0) return null;

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch(getApiPath("/api/admin/sync-users"), { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "sync failed");
      toast.success(`סונכרנו ${json.synced ?? missing} משתמשים`);
      onSynced();
    } catch (err) {
      logger.error("[DashboardMismatchCard] sync failed:", err);
      toast.error("סנכרון נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-center gap-4"
    >
      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-bold text-amber-300">
          נמצאו {missing} משתמשים ללא פרופיל
        </p>
        <p className="text-xs text-amber-400/80">
          {authCount} ב-auth · {profileCount} ב-profiles
        </p>
      </div>
      <button
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50"
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
        סנכרן עכשיו
      </button>
    </div>
  );
}

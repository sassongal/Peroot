"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  /** ISO string or Date of the moment the quota refreshes */
  refreshAt: string | Date | null;
  /** Optional label to show before the counter */
  label?: string;
  /** Called when the timer reaches zero */
  onComplete?: () => void;
  className?: string;
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function CountdownTimer({ refreshAt, label, onComplete, className }: CountdownTimerProps) {
  const target = refreshAt ? new Date(refreshAt).getTime() : 0;
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const r = Math.max(0, target - Date.now());
      setRemaining(r);
      if (r <= 0) onComplete?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onComplete]);

  if (!refreshAt) return null;

  return (
    <div className={className} aria-live="polite">
      {label && <span className="text-xs text-(--text-muted) me-2">{label}</span>}
      <span className="font-mono tabular-nums text-lg font-semibold text-(--text-primary)">
        {format(remaining)}
      </span>
    </div>
  );
}

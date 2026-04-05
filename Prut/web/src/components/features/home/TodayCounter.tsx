"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const POLL_INTERVAL = 20_000; // 20 seconds

/**
 * Animated flip-digit counter showing prompts enhanced today.
 * Polls /api/stats/today every 20s. Digits animate individually on change.
 */
export function TodayCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [displayDigits, setDisplayDigits] = useState<string[]>([]);
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const prevDigitsRef = useRef<string[]>([]);
  const mountedRef = useRef(true);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/today");
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current && typeof data?.count === "number") {
        setCount(data.count);
      }
    } catch {}
  }, []);

  // Fetch on mount + poll every 20s
  useEffect(() => {
    mountedRef.current = true;
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchCount]);

  // Animate digits when count changes
  useEffect(() => {
    if (count === null) return;

    const newDigits = count.toLocaleString("he-IL").split("");
    const prevDigits = prevDigitsRef.current;

    // Find which digit positions changed
    const changed = new Set<number>();
    const maxLen = Math.max(newDigits.length, prevDigits.length);
    for (let i = 0; i < maxLen; i++) {
      if (newDigits[i] !== prevDigits[i]) changed.add(i);
    }

    if (changed.size > 0 && prevDigits.length > 0) {
      setAnimatingIndices(changed);
      // Clear animation class after it completes
      const timer = setTimeout(() => setAnimatingIndices(new Set()), 400);
      setDisplayDigits(newDigits);
      prevDigitsRef.current = newDigits;
      return () => clearTimeout(timer);
    } else {
      setDisplayDigits(newDigits);
      prevDigitsRef.current = newDigits;
    }
  }, [count]);

  if (count === null) {
    return (
      <div className="flex justify-center" dir="rtl">
        <div className="h-5 w-44 rounded-full bg-[var(--glass-border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5 animate-in fade-in duration-700" dir="rtl">
      <p className="text-xs text-[var(--text-muted)] tracking-wide flex items-center gap-1">
        <span className="inline-flex">
          {displayDigits.map((digit, i) => (
            <span
              key={`${i}-${digit}`}
              className={`inline-block tabular-nums font-semibold ${
                animatingIndices.has(i)
                  ? "animate-in slide-in-from-bottom-2 fade-in duration-300"
                  : ""
              }`}
            >
              {digit}
            </span>
          ))}
        </span>
        {" פרומפטים שודרגו היום "}
        <span className="text-amber-500">✦</span>
      </p>
      <span className="text-[10px] text-[var(--text-muted)]/50">מתאפס ב-06:00</span>
    </div>
  );
}

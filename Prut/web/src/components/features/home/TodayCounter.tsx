"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Animated counter showing how many prompts were enhanced today.
 * Fetches from /api/stats/today and animates the number counting up.
 */
export function TodayCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Fetch count on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/today")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.count) {
          setCount(data.count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Animate counting up when count arrives
  useEffect(() => {
    if (count === null) return;

    const duration = 1200; // ms
    const startTime = performance.now();
    const startVal = 0;
    const endVal = count;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(startVal + (endVal - startVal) * eased));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    }

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [count]);

  // Loading skeleton
  if (count === null) {
    return (
      <div className="flex justify-center" dir="rtl">
        <div className="h-5 w-48 rounded-full bg-[var(--glass-border)] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="flex justify-center animate-in fade-in duration-700"
      dir="rtl"
    >
      <p className="text-xs text-[var(--text-muted)] tracking-wide">
        <span className="font-semibold tabular-nums">
          {displayCount.toLocaleString("he-IL")}
        </span>
        {" "}
        {"\u05E4\u05E8\u05D5\u05DE\u05E4\u05D8\u05D9\u05DD \u05E9\u05D5\u05D3\u05E8\u05D2\u05D5 \u05D4\u05D9\u05D5\u05DD"} ✨
      </p>
    </div>
  );
}

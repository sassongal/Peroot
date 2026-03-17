"use client";

import Link from "next/link";

export function TopLogo({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] pointer-events-none px-2 md:px-6 hidden md:block">
      <Link
        href="/"
        className="pointer-events-auto block brand-mark-glow"
        aria-label="חזרה לדף הבית"
      >
        <span
          className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-amber-500/30 font-serif text-lg font-bold heading-highlight"
          aria-hidden="true"
        >
          פ
        </span>
      </Link>
    </div>
  );
}

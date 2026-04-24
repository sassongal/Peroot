"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  actions: ReactNode;
}

export function PromptCardBodyGate({ children, actions }: Props) {
  const { user, isLoading } = useAuth();
  // Render blurred during hydration; reveal only once we've confirmed auth.
  const isGuest = isLoading || !user;

  if (!isGuest) {
    return (
      <>
        {children}
        <div className="flex items-center gap-2 mt-auto pt-1">{actions}</div>
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none" aria-hidden>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 rounded-xl">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
          >
            <Lock className="w-3 h-3" />
            התחבר לצפייה
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1 opacity-60 pointer-events-none select-none">
        {actions}
      </div>
    </>
  );
}

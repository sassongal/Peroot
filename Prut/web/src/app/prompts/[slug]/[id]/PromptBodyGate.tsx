"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  actions: ReactNode;
}

export function PromptBodyGate({ children, actions }: Props) {
  const { user, isLoading } = useAuth();
  // Treat "still loading" as guest so the unauthenticated-hydration flash
  // stays blurred; flips to unblurred only after we confirm an auth'd user.
  const isGuest = isLoading || !user;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
        <span className="text-xs font-medium text-muted-foreground">הפרומפט</span>
        <div className="flex items-center gap-2">
          {isGuest ? (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors font-medium"
            >
              התחבר לצפייה
            </Link>
          ) : (
            actions
          )}
        </div>
      </div>

      <div className="relative">
        <div
          className={
            isGuest ? "blur-md pointer-events-none select-none transition-all" : "transition-all"
          }
          aria-hidden={isGuest}
        >
          {children}
        </div>

        {isGuest && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
            <div className="text-center px-6 py-5 rounded-xl border border-amber-500/30 bg-background/90 shadow-xl max-w-sm">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 mb-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-base font-serif text-foreground mb-2">
                התחבר לצפייה בפרומפט המלא
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                ההרשמה חינמית — 2 פרומפטים ביום, גישה לכל המנועים וספרייה אישית.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-lg text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                >
                  הירשם חינם
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg border border-border text-sm text-secondary-foreground hover:bg-secondary transition-colors"
                >
                  התחבר
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

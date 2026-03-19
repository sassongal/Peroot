"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

type Locale = "he" | "en";

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "he";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(\w+)/);
  return (match?.[1] as Locale) || "he";
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentLocale = getLocaleFromCookie();

  const toggleLocale = useCallback(() => {
    const next: Locale = currentLocale === "he" ? "en" : "he";
    setLocaleCookie(next);
    startTransition(() => {
      router.refresh();
    });
  }, [currentLocale, router]);

  const label = currentLocale === "he" ? "EN" : "עב";
  const ariaLabel =
    currentLocale === "he" ? "Switch to English" : "החלף לעברית";

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="min-w-[44px] min-h-[44px] px-2 py-1 rounded-md text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/5 transition-colors cursor-pointer select-none disabled:opacity-50 flex items-center justify-center"
    >
      {isPending ? "..." : label}
    </button>
  );
}

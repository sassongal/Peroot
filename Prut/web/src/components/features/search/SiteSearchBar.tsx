"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition, Fragment } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Loader2, Search, Sparkles, X } from "lucide-react";
import { useLibraryContext } from "@/context/LibraryContext";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { escapeRegExp } from "@/lib/text-utils";
import type { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import type { SiteSearchHit, SiteSearchResponse } from "@/lib/site-search/types";
import { analytics } from "@/lib/analytics";

function HighlightMatch({ text, needle }: { text: string; needle: string }) {
  const q = needle.trim();
  if (q.length < 2) return <>{text}</>;
  let re: RegExp;
  try {
    re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  } catch {
    return <>{text}</>;
  }
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-amber-500/35 text-inherit rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

const SOURCE_LABEL: Record<SiteSearchHit["source"], string> = {
  blog: "בלוג",
  guide: "מדריך",
  public_prompt: "פרומפט",
  template: "תבנית",
  personal: "הספרייה שלי",
  locked: "נעול",
};

interface SiteSearchBarProps {
  user: User | null;
  onUsePrompt: (prompt: LibraryPrompt | PersonalPrompt) => void;
}

export function SiteSearchBar({ user, onUsePrompt }: SiteSearchBarProps) {
  const {
    setViewMode,
    setLibraryQuery,
    setPersonalQuery,
    libraryPrompts,
    personalLibrary,
  } = useLibraryContext();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SiteSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebounced("");
    setData(null);
    setError(null);
  }, []);

  /** Restore ?q= from URL after login (or shared link). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("q")?.trim();
    if (!fromUrl || fromUrl.length < 2) return;
    queueMicrotask(() => {
      setQuery(fromUrl);
      setOpen(true);
    });
    params.delete("q");
    const rest = params.toString();
    const path = `${window.location.pathname}${rest ? `?${rest}` : ""}`;
    window.history.replaceState({}, "", path);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  /** ⌘K / Ctrl+K — focus site search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('[contenteditable="true"]')) return;
        e.preventDefault();
        inputRef.current?.focus();
        if (query.trim().length >= 2) setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (debounced.length < 2) {
      abortRef.current?.abort();
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });

    const url = `${getApiPath("/api/site-search")}?q=${encodeURIComponent(debounced)}`;
    fetch(url, { signal: ac.signal })
      .then(async (res) => {
        if (res.status === 429) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "יותר מדי בקשות");
        }
        if (!res.ok) throw new Error("שגיאת רשת");
        return res.json() as Promise<SiteSearchResponse>;
      })
      .then((json) => {
        setData(json);
        analytics.capture("site_search", {
          guest: json.guestRestricted,
          result_count: json.results.length,
          q_len: debounced.length,
        });
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof Error ? e.message : "שגיאה");
        setData(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [debounced]);

  const displayData = debounced.length < 2 ? null : data;
  const displayError = debounced.length < 2 ? null : error;
  const showLoading = debounced.length >= 2 && loading;

  const resolveLibraryPrompt = useCallback(
    (id: string) => libraryPrompts.find((p) => p.id === id),
    [libraryPrompts]
  );

  const resolvePersonalPrompt = useCallback(
    (id: string) => personalLibrary.find((p) => p.id === id),
    [personalLibrary]
  );

  const handleUseHit = useCallback(
    (hit: SiteSearchHit) => {
      if (hit.source === "public_prompt" || hit.source === "template") {
        const p = resolveLibraryPrompt(hit.id);
        if (p) {
          onUsePrompt(p);
          close();
          return;
        }
        setViewMode("library");
        setLibraryQuery(hit.title);
        close();
        return;
      }
      if (hit.source === "personal") {
        const p = resolvePersonalPrompt(hit.id);
        if (p) {
          onUsePrompt(p);
          close();
          return;
        }
        setViewMode("personal");
        setPersonalQuery(hit.title);
        close();
      }
    },
    [close, onUsePrompt, resolveLibraryPrompt, resolvePersonalPrompt, setLibraryQuery, setPersonalQuery, setViewMode]
  );

  const loginHref = useMemo(() => {
    const q = query.trim();
    const nextPath = q.length >= 2 ? `/?q=${encodeURIComponent(q)}` : "/";
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }, [query]);

  return (
    <>
      <div
        className="sticky top-14 z-40 w-full border-b backdrop-blur-xl"
        style={{
          background: "var(--surface-nav)",
          borderColor: "var(--border-nav)",
        }}
        dir="rtl"
      >
        <div className="flex justify-end px-4 sm:px-6 max-w-[1920px] mx-auto pb-2 pt-1.5">
          <div className="relative w-full max-w-[min(100%,20rem)]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={open}
              aria-controls="site-search-results"
              aria-label="חיפוש באתר"
              placeholder="חיפוש — בלוג, פרומפטים, מדריך… (⌘K)"
              title="חיפוש גלובלי. קיצור: ⌘K או Ctrl+K"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setOpen(true);
              }}
              className={cn(
                "w-full rounded-lg border border-white/10 bg-white/5 dark:bg-black/30",
                "py-2 ps-3 pe-9 text-sm text-slate-800 dark:text-slate-200",
                "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[40px]"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-200 cursor-pointer"
                aria-label="נקה חיפוש"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-60 flex flex-col bg-(--surface-body)/98 backdrop-blur-md md:pt-14"
          role="dialog"
          aria-modal="true"
          aria-label="תוצאות חיפוש"
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <h2 id="site-search-title" className="text-sm font-semibold text-(--text-primary)">
              תוצאות חיפוש
            </h2>
            <button
              type="button"
              onClick={close}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div id="site-search-results" className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {showLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                מחפש…
              </div>
            )}
            {displayError && !showLoading && (
              <p className="text-sm text-red-400 py-6 text-center">{displayError}</p>
            )}
            {!showLoading && !displayError && displayData?.guestRestricted && displayData.loginCta && (
              <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-100">
                <p className="mb-3">{displayData.loginCta}</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={loginHref}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black hover:bg-amber-400 cursor-pointer min-h-[44px]"
                  >
                    התחברות
                  </Link>
                  <Link
                    href={loginHref}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 cursor-pointer min-h-[44px]"
                  >
                    הרשמה
                  </Link>
                </div>
              </div>
            )}
            {!showLoading && !displayError && displayData && displayData.results.length === 0 && debounced.length >= 2 && (
              <p className="text-sm text-slate-500 py-8 text-center">לא נמצאו תוצאות</p>
            )}
            <ul className="space-y-2">
              {displayData?.results.map((hit) => (
                <li
                  key={`${hit.source}-${hit.id}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-amber-500/90 shrink-0">
                      {SOURCE_LABEL[hit.source]}
                      {hit.isFavorite ? " · מועדף" : ""}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-(--text-primary) leading-snug wrap-break-word">
                    <HighlightMatch text={hit.title} needle={debounced} />
                  </p>
                  {hit.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-2 wrap-break-word">
                      <HighlightMatch text={hit.subtitle} needle={debounced} />
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {hit.source === "blog" && (
                      <Link
                        href={hit.href}
                        onClick={close}
                        className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 cursor-pointer min-h-[40px] inline-flex items-center"
                      >
                        פתיחת מאמר
                      </Link>
                    )}
                    {hit.source === "guide" && (
                      <Link
                        href={hit.href}
                        onClick={close}
                        className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 cursor-pointer min-h-[40px] inline-flex items-center"
                      >
                        פתיחת מקטע
                      </Link>
                    )}
                    {(hit.source === "public_prompt" || hit.source === "template") && user && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUseHit(hit)}
                          className="text-xs px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer min-h-[40px] inline-flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          שימוש בשדרוג
                        </button>
                        <Link
                          href={hit.source === "template" ? "/templates" : "/prompts"}
                          onClick={close}
                          className="text-xs px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 cursor-pointer min-h-[40px] inline-flex items-center"
                        >
                          לעמוד
                        </Link>
                      </>
                    )}
                    {hit.source === "personal" && user && (
                      <button
                        type="button"
                        onClick={() => handleUseHit(hit)}
                        className="text-xs px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer min-h-[40px] inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        שימוש בשדרוג
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

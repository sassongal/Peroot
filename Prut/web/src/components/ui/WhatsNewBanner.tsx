"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import type { PublicAnnouncement } from "@/app/api/announcements/route";

const DISMISSED_KEY = "peroot_whats_new_dismissed";

/**
 * "מה חדש": one line, under "הידעת?", in the same shell and width (owner
 * decision, 2026-09-02). Not a ticker at the top of the page: nothing moves,
 * nothing scrolls, one note at a time, and a dismissed note stays dismissed
 * in this browser. Notes come from the announcements table through a cached
 * public endpoint, so a launch is an admin edit.
 */
function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    /* ignore */
  }
}

interface WhatsNewBannerProps {
  /** Who is looking, so a "users only" note is not shown to a guest. */
  viewer?: "guest" | "user" | "pro";
}

export function WhatsNewBanner({ viewer = "guest" }: WhatsNewBannerProps) {
  const [note, setNote] = useState<PublicAnnouncement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dismissed = readDismissed();
    fetch(getApiPath("/api/announcements"))
      .then((res) => (res.ok ? (res.json() as Promise<PublicAnnouncement[]>) : []))
      .then((notes) => {
        if (cancelled) return;
        const first = notes.find((n) => {
          if (dismissed.has(n.id)) return false;
          if (n.audience === "guests" && viewer !== "guest") return false;
          if (n.audience === "users" && viewer === "guest") return false;
          if (n.audience === "pro" && viewer !== "pro") return false;
          return true;
        });
        if (!first) return;
        setNote(first);
        // Next frame, so the entrance transition has a starting state.
        requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      })
      .catch(() => {
        /* the line is optional; a failed fetch shows nothing */
      });
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  if (!note) return null;

  const dismiss = () => {
    setVisible(false);
    const ids = readDismissed();
    ids.add(note.id);
    writeDismissed(ids);
    setTimeout(() => setNote(null), 300);
  };

  const dir = note.lang === "en" || note.lang === "ru" ? "ltr" : "rtl";

  return (
    <div
      className={cn(
        "w-full transition-all duration-500 ease-out motion-reduce:transition-none",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      )}
      dir={dir}
      lang={note.lang}
      role="status"
      aria-label="מה חדש"
    >
      <div className="relative flex items-start gap-3 px-4 py-3 rounded-xl bg-(--glass-bg) border border-(--glass-border)">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 mt-0.5">
          <Megaphone className="w-4 h-4 text-amber-500" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-amber-500 tracking-wide">מה חדש</span>
          <p className="text-sm text-(--text-secondary) leading-relaxed mt-0.5">
            <span className="font-semibold text-(--text-primary)">{note.title}</span>
            {note.body ? <span>. {note.body}</span> : null}
            {note.href ? (
              <>
                {" "}
                <Link
                  href={note.href}
                  className="text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
                >
                  {note.href_label || "לפרטים"}
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-2 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-(--text-muted) hover:text-(--text-secondary) hover:bg-(--glass-bg) transition-colors"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

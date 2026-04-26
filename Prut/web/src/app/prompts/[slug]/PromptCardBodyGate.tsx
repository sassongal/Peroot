"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { CopyButton } from "./CopyButton";
import { UsePromptButton } from "./UsePromptButton";

interface Props {
  promptId: string;
  title: string;
  previewText: string;
  variables: string[] | null;
  slug: string;
  capabilityMode: string | null;
  detailHref: string;
}

// Module-level in-memory cache keyed by id. Avoids re-fetching on navigation
// back to the grid. Shared across all cards on the page.
const fullTextCache = new Map<string, string>();
// Coalesced single batch request per mount — each card subscribes to the
// same promise so 60 cards fire one network round-trip.
let pendingBatch: Promise<Record<string, string>> | null = null;
const pendingIds = new Set<string>();

function schedulePrompt(id: string): Promise<string | null> {
  if (fullTextCache.has(id)) return Promise.resolve(fullTextCache.get(id)!);
  pendingIds.add(id);

  if (!pendingBatch) {
    pendingBatch = new Promise((resolve) => {
      // Defer one microtask tick so all cards on the page register first.
      queueMicrotask(async () => {
        const ids = Array.from(pendingIds).join(",");
        pendingIds.clear();
        pendingBatch = null;
        try {
          const res = await fetch(`/api/p/batch?ids=${encodeURIComponent(ids)}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (!res.ok) return resolve({});
          const data = (await res.json()) as { prompts?: Record<string, string> };
          const map = data.prompts ?? {};
          for (const [k, v] of Object.entries(map)) fullTextCache.set(k, v);
          resolve(map);
        } catch {
          resolve({});
        }
      });
    });
  }

  return pendingBatch.then((map) => map[id] ?? null);
}

export function PromptCardBodyGate({
  promptId,
  title,
  previewText,
  variables,
  slug,
  capabilityMode,
  detailHref,
}: Props) {
  const { user, isLoaded } = useAuth();
  const isGuest = !isLoaded || !user;
  const [fullText, setFullText] = useState<string | null>(
    () => fullTextCache.get(promptId) ?? null,
  );

  useEffect(() => {
    if (isGuest || fullText) return;
    let cancelled = false;
    schedulePrompt(promptId).then((text) => {
      if (!cancelled && text) setFullText(text);
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest, promptId, fullText]);

  const displayText = !isGuest && fullText ? fullText : previewText;
  const isImage = capabilityMode === "IMAGE_GENERATION";

  if (!isGuest) {
    return (
      <>
        <div
          className={`text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4 bg-secondary rounded-xl p-3 border border-border ${
            isImage ? "font-mono text-left dir-ltr" : ""
          }`}
          dir={isImage ? "ltr" : undefined}
        >
          {displayText}
        </div>

        {variables && variables.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {variables.slice(0, 4).map((v) => (
              <span
                key={v}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
              >
                {v}
              </span>
            ))}
            {variables.length > 4 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                +{variables.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto pt-1">
          {fullText ? (
            <>
              <CopyButton text={fullText} />
              <UsePromptButton id={promptId} title={title} prompt={fullText} category={slug} />
            </>
          ) : (
            <span className="text-xs text-muted-foreground">טוען...</span>
          )}
          <Link
            href={detailHref}
            className="mr-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            פרטים ←
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none" aria-hidden>
          <div
            className={`text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4 bg-secondary rounded-xl p-3 border border-border ${
              isImage ? "font-mono text-left dir-ltr" : ""
            }`}
            dir={isImage ? "ltr" : undefined}
          >
            {previewText}
          </div>
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
        <Link
          href={detailHref}
          className="mr-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          פרטים ←
        </Link>
      </div>
    </>
  );
}

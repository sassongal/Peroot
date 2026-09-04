"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Variable, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CapabilityMode, ENGINE_HUE, getCapabilityLabelHe } from "@/lib/capability-mode";
import { setPendingPrompt } from "@/lib/pending-prompt";
import { trackLibraryUse } from "@/lib/analytics";
import { trackCatalogEvent } from "@/lib/usage/catalog-events";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { CatalogItem, CatalogSource } from "./types";

interface CatalogCardProps {
  item: CatalogItem;
  /** Which page the card sits on, for the usage event and the return path. */
  source: CatalogSource;
  /** Show the category chip (off inside a single category's page). */
  showCategory?: boolean;
  /** Shared "one card is loading" lock so two taps cannot race. */
  busyId?: string | null;
  onBusy?: (id: string | null) => void;
}

const SOURCE_REF: Record<CatalogSource, string> = {
  catalog_category: "prompts-library",
  catalog_index: "prompts-library",
  catalog_detail: "library-prompt",
  templates: "templates",
};

/**
 * The one catalogue card. Category pages, the templates facet and search
 * results all render this, so a prompt looks and behaves the same wherever
 * it is met: title to its page, the body clamped, the fillable fields as
 * chips, copy when the whole text is here, and one gold "use" action that
 * lands it in the home input (reading the body first when only a preview
 * was shipped).
 */
export function CatalogCard({
  item,
  source,
  showCategory = false,
  busyId = null,
  onBusy,
}: CatalogCardProps) {
  const router = useRouter();
  const [localBusy, setLocalBusy] = useState(false);
  const busy = busyId === item.id || localBusy;
  const locked = busyId !== null && busyId !== item.id;

  const detailHref = item.categorySlug ? `/prompts/${item.categorySlug}/${item.id}` : null;
  const isImage = item.capabilityMode === CapabilityMode.IMAGE_GENERATION;
  const isAdvanced =
    item.capabilityMode !== null && item.capabilityMode !== CapabilityMode.STANDARD;
  const hue = item.capabilityMode ? ENGINE_HUE[item.capabilityMode] : null;
  const isTemplate = item.variables.length > 0;

  const handleUse = async () => {
    if (busy || locked) return;
    setLocalBusy(true);
    onBusy?.(item.id);
    try {
      let text = item.text;
      if (item.textIsPreview) {
        // Same anon RLS policy that serves the catalogue; no session needed.
        const { data, error } = await createClient()
          .from("public_library_prompts")
          .select("prompt")
          .eq("id", item.id)
          .eq("is_active", true)
          .maybeSingle();
        if (error || !data?.prompt) throw error ?? new Error("catalog_prompt_not_found");
        text = data.prompt as string;
      }
      trackLibraryUse(item.id, item.title);
      trackCatalogEvent(item.id, "enhance", source, text.length);
      setPendingPrompt({
        id: item.id,
        title: item.title,
        prompt: text,
        category: item.category,
        is_template: isTemplate,
        capability_mode: item.capabilityMode ?? undefined,
        source: SOURCE_REF[source],
      });
      router.push(`/?utm_source=${SOURCE_REF[source]}`);
    } catch (e) {
      logger.warn("[catalog] failed to load prompt body", e);
      toast.error("לא הצלחנו לטעון את הפרומפט, נסו שוב");
      setLocalBusy(false);
      onBusy?.(null);
    }
  };

  const title = detailHref ? (
    <Link href={detailHref} className="group/title">
      <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 group-hover/title:text-amber-700 dark:group-hover/title:text-amber-400 transition-colors">
        {item.title}
      </h3>
    </Link>
  ) : (
    <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2">{item.title}</h3>
  );

  return (
    <article
      className="group relative flex flex-col rounded-2xl border border-border bg-card hover:border-amber-500/30 hover:shadow-[0_0_24px_rgba(245,158,11,0.06)] transition-all duration-200 overflow-hidden"
      aria-busy={busy}
    >
      <div className="flex-1 p-5 flex flex-col gap-3">
        {/* Title + mode badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title}
            {item.useCase && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                {item.useCase}
              </p>
            )}
          </div>
          {isAdvanced && hue && (
            <span
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{
                color: hue,
                borderColor: `${hue}66`,
                backgroundColor: `${hue}1f`,
              }}
              title={`מצב ${getCapabilityLabelHe(item.capabilityMode!)}, פתוח למנויי Pro`}
            >
              {getCapabilityLabelHe(item.capabilityMode!)}
            </span>
          )}
        </div>

        {/* Category (list pages only) */}
        {showCategory && (
          <div>
            {item.categorySlug ? (
              <Link
                href={`/prompts/${item.categorySlug}`}
                className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                {CATEGORY_LABELS[item.category] ?? item.category}
              </Link>
            ) : (
              <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-secondary text-muted-foreground">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
            )}
          </div>
        )}

        {/* Image prompts show their picture */}
        {item.previewImageUrl && (
          <div className="rounded-xl overflow-hidden border border-border">
            <Image
              src={item.previewImageUrl}
              alt={item.title}
              width={400}
              height={400}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Body, clamped. A preview reads the same; the page carries it all. */}
        <div
          className={cn(
            "text-sm text-muted-foreground leading-relaxed line-clamp-4 bg-secondary rounded-xl p-3 border border-border",
            isImage && "font-mono text-left",
          )}
          dir={isImage ? "ltr" : undefined}
        >
          {item.text}
        </div>

        {/* Fillable fields */}
        {isTemplate && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Variable className="w-3.5 h-3.5" aria-hidden="true" />
              {item.variables.length === 1
                ? "שדה אחד למילוי"
                : `${item.variables.length} שדות למילוי`}
            </span>
            {item.variables.slice(0, 3).map((v) => (
              <span
                key={v}
                className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200"
              >
                {v}
              </span>
            ))}
            {item.variables.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{item.variables.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions: one gold action, copy beside it, the page under it */}
      <div className="px-5 pb-4 pt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleUse()}
          disabled={busy || locked}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none cursor-pointer disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Wand2 className="w-4 h-4" aria-hidden="true" />
          )}
          {busy ? "טוען..." : isTemplate ? "מלאו ושדרגו" : "שדרגו בפירוט"}
        </button>
        {!item.textIsPreview && (
          <CopyButton
            text={item.text}
            label="העתק"
            variant="button"
            onCopied={() => trackCatalogEvent(item.id, "copy", source, item.text.length)}
          />
        )}
        {detailHref && (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 px-2 min-h-[44px] text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            aria-label={`לדף הפרומפט ${item.title}`}
          >
            לדף
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

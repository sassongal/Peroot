import Link from "next/link";

/**
 * ONE link tile for prompt lists on public pages (U3.2): the /prompts index
 * strip, the detail page's related prompts, and the catalogue search results
 * each drew their own near-identical tile. Server-safe (no client hooks).
 */
export function PromptLinkTile({
  href,
  title,
  useCase,
  categoryLabel,
}: {
  href: string;
  title: string;
  useCase?: string | null;
  /** Optional small category pill above the title (search results show it). */
  categoryLabel?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-secondary hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all group"
    >
      {categoryLabel && (
        <span className="self-start text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
          {categoryLabel}
        </span>
      )}
      <span className="text-sm font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
        {title}
      </span>
      {useCase && (
        <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">{useCase}</span>
      )}
    </Link>
  );
}

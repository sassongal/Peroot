import Link from "next/link";

interface CrossLinkCardProps {
  href: string;
  title: string;
  description: string;
}

export function CrossLinkCard({ href, title, description }: CrossLinkCardProps) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-5 hover:border-amber-500/30 transition-colors group"
    >
      <p className="text-sm font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}

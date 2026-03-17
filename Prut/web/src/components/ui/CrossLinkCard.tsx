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
      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-amber-500/30 transition-colors group"
    >
      <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </Link>
  );
}

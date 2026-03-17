import { cn } from "@/lib/utils";

interface PageHeadingProps {
  title: string;
  highlight?: string;
  subtitle?: string;
  badge?: string;
  badgeIcon?: React.ReactNode;
  size?: "default" | "large";
  align?: "center" | "start";
}

export function PageHeading({
  title,
  highlight,
  subtitle,
  badge,
  badgeIcon,
  size = "default",
  align = "center",
}: PageHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4 heading-enter",
        align === "center" ? "text-center" : "text-start"
      )}
    >
      {badge && (
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium heading-enter",
            align === "center" && "mx-auto"
          )}
        >
          {badgeIcon}
          {badge}
        </div>
      )}

      <h1
        className={cn(
          "font-serif text-white leading-tight page-heading-glow heading-enter-delay-1",
          size === "large"
            ? "text-4xl md:text-6xl"
            : "text-4xl md:text-5xl"
        )}
      >
        {title}
        {highlight && (
          <>
            <br />
            <span className="heading-highlight">{highlight}</span>
          </>
        )}
      </h1>

      {subtitle && (
        <p
          className={cn(
            "text-lg text-slate-400 leading-relaxed heading-enter-delay-2",
            align === "center" && "mx-auto",
            size === "large" ? "md:text-xl max-w-2xl" : "max-w-2xl"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

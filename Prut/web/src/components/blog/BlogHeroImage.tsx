import { memo } from "react";
import Image from "next/image";

interface BlogHeroImageProps {
  title: string;
  category: string;
  excerpt?: string;
}

interface CategoryConfig {
  file: string;
  accent: string;
  emoji: string;
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  "פרילנסרים": { file: "freelancers", accent: "#8b5cf6", emoji: "💼" },
  "עסקים": { file: "business", accent: "#06b6d4", emoji: "🏢" },
  "פרומפט אנג׳ינירינג": { file: "prompt-engineering", accent: "#f59e0b", emoji: "⚡" },
  "קוד ופיתוח": { file: "code", accent: "#22c55e", emoji: "💻" },
  "חינוך": { file: "education", accent: "#ec4899", emoji: "📚" },
  "טעויות נפוצות": { file: "mistakes", accent: "#ef4444", emoji: "⚠️" },
  "מדריכים": { file: "guides", accent: "#f59e0b", emoji: "📝" },
  "שיווק": { file: "marketing", accent: "#3b82f6", emoji: "📣" },
  "תוכן": { file: "content", accent: "#14b8a6", emoji: "✍️" },
  "תמונות": { file: "images", accent: "#a855f7", emoji: "🎨" },
  "השוואות": { file: "comparisons", accent: "#6366f1", emoji: "⚖️" },
  "סקירות": { file: "reviews", accent: "#6366f1", emoji: "🔍" },
};

const DEFAULT_CONFIG: CategoryConfig = { file: "guides", accent: "#f59e0b", emoji: "✨" };

function resolveConfig(category: string): CategoryConfig {
  return CATEGORY_MAP[category] ?? DEFAULT_CONFIG;
}

// Truncate excerpt to a reasonable display length
function truncateExcerpt(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength).trimEnd();
  // Avoid cutting mid-word
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

export const BlogHeroImage = memo(function BlogHeroImage({ title, category, excerpt }: BlogHeroImageProps) {
  const config = resolveConfig(category);
  const displayedCategory = category || "מדריכים";
  const truncatedExcerpt = excerpt ? truncateExcerpt(excerpt) : undefined;

  // Derive a lighter/transparent variant of the accent for badge background and border
  // Using inline styles where Tailwind can't use dynamic values
  const badgeStyle: React.CSSProperties = {
    borderColor: `${config.accent}55`,
    backgroundColor: `${config.accent}20`,
    color: config.accent,
  };

  const brandingAccentStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${config.accent}, ${config.accent}99)`,
  };

  const dividerStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${config.accent}, ${config.accent}66)`,
  };

  const glowStyle: React.CSSProperties = {
    background: `radial-gradient(circle, ${config.accent}26 0%, transparent 70%)`,
  };

  return (
    <div
      className="relative w-full aspect-[1200/630] overflow-hidden rounded-xl select-none"
      role="img"
      aria-label={`תמונת כותרת למאמר: ${title}`}
    >
      {/* Background SVG */}
      <Image
        src={`/images/blog/${config.file}.svg`}
        alt=""
        aria-hidden="true"
        fill
        className="object-cover"
        priority
      />

      {/* Radial glow overlay centered on canvas */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={glowStyle}
      />

      {/* Content overlay — RTL layout */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-8 sm:px-16"
        dir="rtl"
      >
        {/* Category badge — top center */}
        <div
          className="flex items-center gap-2 px-5 py-2 rounded-full border text-sm sm:text-base font-bold mb-5 sm:mb-7"
          style={badgeStyle}
        >
          <span aria-hidden="true">{config.emoji}</span>
          <span>{displayedCategory}</span>
        </div>

        {/* Title */}
        <div
          className="font-serif text-white text-center leading-snug max-w-3xl"
          style={{ fontSize: title.length > 40 ? "clamp(1.375rem, 3.5vw, 2.25rem)" : "clamp(1.625rem, 4vw, 2.75rem)" }}
        >
          {title}
        </div>

        {/* Excerpt / subtitle */}
        {truncatedExcerpt && (
          <p
            className="text-slate-400 text-center mt-4 max-w-xl leading-relaxed"
            style={{ fontSize: "clamp(0.75rem, 1.5vw, 1rem)" }}
          >
            {truncatedExcerpt}
          </p>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 sm:px-14 pb-5 sm:pb-7"
        dir="ltr"
        aria-hidden="true"
      >
        {/* Branding — left */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
            style={brandingAccentStyle}
          >
            P
          </div>
          <span className="text-slate-200 font-bold text-sm tracking-wide">PEROOT</span>
        </div>

        {/* Domain — right */}
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-[3px] rounded-full"
            style={dividerStyle}
          />
          <span className="text-slate-500 text-xs sm:text-sm">www.peroot.space</span>
        </div>
      </div>
    </div>
  );
});

BlogHeroImage.displayName = "BlogHeroImage";

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "מדריכי פרומפטים לפלטפורמות AI | Peroot",
  description:
    "מדריכים מקצועיים ליצירת פרומפטים מושלמים לכל פלטפורמת AI — מידג׳רני, FLUX, GPT Image, Stable Diffusion, Runway, Kling, Sora ועוד. טיפים מעשיים, דוגמאות ומבנה אופטימלי.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "מדריכי פרומפטים לפלטפורמות AI | Peroot",
    description:
      "מדריכים מקצועיים ליצירת פרומפטים מושלמים לכל פלטפורמת AI — תמונות וסרטונים",
    url: "/guides",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "מדריכי פרומפטים לפלטפורמות AI",
    description: "המדריך המלא לכתיבת פרומפטים — מידג׳רני, FLUX, Runway, Kling ועוד",
  },
};

interface PlatformCard {
  slug: string;
  title: string;
  platform: string;
  description: string;
  icon: string;
  color: string;
}

const IMAGE_CARDS: PlatformCard[] = [
  { slug: "image-prompts", title: "מדריך כללי — תמונות", platform: "כל הפלטפורמות", description: "עקרונות אוניברסליים ליצירת תמונות מדהימות עם AI", icon: "📸", color: "#64748b" },
  { slug: "midjourney", title: "Midjourney v7", platform: "Midjourney", description: "שפה טבעית, פרמטרים מתקדמים, ו-Omni Reference לעקביות דמויות", icon: "✨", color: "#f59e0b" },
  { slug: "gpt-image", title: "GPT Image", platform: "OpenAI", description: "יצירת תמונות מקורית של GPT-4o — טקסט מדויק ותיאורים עשירים", icon: "🎨", color: "#10b981" },
  { slug: "flux", title: "FLUX.2", platform: "Black Forest Labs", description: "צבעי hex מדויקים, מפרט מצלמה, ופרומפטים מובנים ב-JSON", icon: "⚡", color: "#ec4899" },
  { slug: "stable-diffusion", title: "Stable Diffusion", platform: "Stability AI", description: "מילות מפתח עם משקלות, LoRA, ופרומפטים שליליים — SDXL ו-SD3.5", icon: "🔮", color: "#8b5cf6" },
  { slug: "imagen", title: "Google Imagen 4", platform: "Google", description: "רזולוציית 2K, תיאורים נרטיביים עשירים, טקסט מדויק בתמונות", icon: "🌟", color: "#f97316" },
  { slug: "gemini-image", title: "Gemini Image", platform: "Google DeepMind", description: "עקביות של עד 5 דמויות, 14 תמונות ייחוס, תמיכה בטקסט ממוקד", icon: "💎", color: "#3b82f6" },
];

const VIDEO_CARDS: PlatformCard[] = [
  { slug: "video-prompts", title: "מדריך כללי — סרטונים", platform: "כל הפלטפורמות", description: "ארכיטקטורת 7 שכבות ליצירת סרטוני AI קולנועיים", icon: "🎥", color: "#64748b" },
  { slug: "runway", title: "Runway Gen-4", platform: "Runway", description: "Director Mode, 4 רכיבים מרכזיים, תנועת מצלמה מקצועית", icon: "🎬", color: "#06b6d4" },
  { slug: "kling", title: "Kling 3.0", platform: "Kuaishou", description: "פיזיקה מתקדמת, 4K, אודיו מקורי, Motion Brush, 3-15 שניות", icon: "🎯", color: "#f43f5e" },
  { slug: "sora", title: "Sora 2", platform: "OpenAI", description: "מבנה סטוריבורד, דיאלוג מסונכרן, character refs, עד 20 שניות", icon: "🌀", color: "#a855f7" },
  { slug: "veo", title: "Google Veo 3.1", platform: "Google DeepMind", description: "הפלטפורמה היחידה עם אודיו מקורי — דיאלוג, SFX, מוזיקה", icon: "🎵", color: "#22c55e" },
  { slug: "minimax", title: "Minimax Hailuo 2.3", platform: "MiniMax", description: "תנועות גוף והבעות פנים ברמת כוריאוגרפיה, סינטקס [מצלמה]", icon: "💃", color: "#f59e0b" },
];

function PlatformCardComponent({ card }: { card: PlatformCard }) {
  return (
    <Link
      href={`/guides/${card.slug}`}
      className="group relative flex flex-col gap-3 p-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-opacity-60 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg"
      style={{
        "--card-color": card.color,
        borderColor: `${card.color}15`,
      } as React.CSSProperties}
    >
      {/* Color accent top line */}
      <div
        className="absolute top-0 right-5 left-5 h-[2px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}40, transparent)` }}
      />

      <div className="flex items-center gap-3">
        <span className="text-2xl">{card.icon}</span>
        <div>
          <h3 className="font-bold text-foreground group-hover:text-[var(--card-color)] transition-colors" style={{ "--card-color": card.color } as React.CSSProperties}>
            {card.title}
          </h3>
          <span className="text-xs text-muted-foreground">{card.platform}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>

      <span className="text-xs font-medium mt-auto pt-2 flex items-center gap-1 transition-colors" style={{ color: card.color }}>
        קרא את המדריך
        <ArrowRight className="w-3 h-3 rotate-180" />
      </span>
    </Link>
  );
}

export default function GuidesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "מדריכי פרומפטים", url: "/guides" },
            ])
          ),
        }}
      />

      <div className="p-6 md:p-12 lg:p-20">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-500 transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הבית
          </Link>

          <PageHeading
            title="מדריכי פרומפטים"
            highlight="לפלטפורמות AI"
            subtitle="טיפים מעשיים, מבנה אופטימלי ודוגמאות לכל פלטפורמה — כדי שהתוצאה הראשונה תהיה מושלמת"
            badge="מדריכים מקצועיים"
          />

          {/* Image Platforms */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">🖼️</span>
              <h2 className="text-2xl font-serif font-bold text-foreground">יצירת תמונות</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {IMAGE_CARDS.map((card) => (
                <PlatformCardComponent key={card.slug} card={card} />
              ))}
            </div>
          </section>

          {/* Video Platforms */}
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎬</span>
              <h2 className="text-2xl font-serif font-bold text-foreground">יצירת סרטונים</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VIDEO_CARDS.map((card) => (
                <PlatformCardComponent key={card.slug} card={card} />
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              רוצה לחסוך זמן? Peroot מייצר פרומפטים מושלמים אוטומטית — לכל פלטפורמה.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-amber-500/90 to-orange-500/90 text-white font-bold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20"
            >
              נסה עכשיו בחינם
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

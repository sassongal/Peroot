import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const CATEGORY_THEMES: Record<string, { accent: string; glow: string; emoji: string }> = {
  "פרילנסרים": { accent: "#8b5cf6", glow: "rgba(139,92,246,0.15)", emoji: "💼" },
  "עסקים": { accent: "#06b6d4", glow: "rgba(6,182,212,0.15)", emoji: "🏢" },
  "פרומפט אנג׳ינירינג": { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "⚡" },
  "קוד ופיתוח": { accent: "#22c55e", glow: "rgba(34,197,94,0.15)", emoji: "💻" },
  "חינוך": { accent: "#ec4899", glow: "rgba(236,72,153,0.15)", emoji: "📚" },
  "טעויות נפוצות": { accent: "#ef4444", glow: "rgba(239,68,68,0.15)", emoji: "⚠️" },
  "מדריכים": { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "📝" },
  "שיווק": { accent: "#3b82f6", glow: "rgba(59,130,246,0.15)", emoji: "📣" },
  "תוכן": { accent: "#14b8a6", glow: "rgba(20,184,166,0.15)", emoji: "✍️" },
  "תמונות": { accent: "#a855f7", glow: "rgba(168,85,247,0.15)", emoji: "🎨" },
  "השוואות": { accent: "#6366f1", glow: "rgba(99,102,241,0.15)", emoji: "⚖️" },
  "סקירות": { accent: "#6366f1", glow: "rgba(99,102,241,0.15)", emoji: "🔍" },
};

const DEFAULT_THEME = { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "✨" };

// Fetch and cache the Hebrew font at module level
const hebrewFont = fetch(
  "https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sq0G1.woff2"
).then((res) => res.arrayBuffer()).catch(() => null);

export async function GET(req: NextRequest) {
  const fontData = await hebrewFont;

  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "Peroot";
  const subtitle = searchParams.get("subtitle") || "";
  const category = searchParams.get("category") || "";

  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
          fontFamily: '"Noto Sans Hebrew", sans-serif',
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Category badge */}
        {category && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "999px",
              border: `1px solid ${theme.accent}33`,
              background: `${theme.accent}15`,
              marginBottom: "24px",
              fontSize: "18px",
              color: theme.accent,
              fontWeight: 700,
            }}
          >
            <span>{category}</span>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? "42px" : "48px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: "900px",
            direction: "rtl",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: "20px",
              color: "#94a3b8",
              marginTop: "20px",
              textAlign: "center",
              direction: "rtl",
              maxWidth: "700px",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "calc(100% - 120px)",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 900,
                color: "white",
              }}
            >
              P
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#e2e8f0" }}>PEROOT</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "50px",
                height: "3px",
                background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}66)`,
                borderRadius: "2px",
              }}
            />
            <div style={{ fontSize: "14px", color: "#64748b" }}>peroot.space</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [
            {
              name: "Noto Sans Hebrew",
              data: fontData,
              style: "normal",
              weight: 700,
            },
          ]
        : undefined,
    }
  );
}

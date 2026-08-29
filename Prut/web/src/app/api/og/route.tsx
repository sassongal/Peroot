import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const CATEGORY_THEMES: Record<string, { accent: string; glow: string; emoji: string }> = {
  פרילנסרים: { accent: "#8b5cf6", glow: "rgba(139,92,246,0.15)", emoji: "💼" },
  עסקים: { accent: "#06b6d4", glow: "rgba(6,182,212,0.15)", emoji: "🏢" },
  "פרומפט אנג׳ינירינג": { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "⚡" },
  "קוד ופיתוח": { accent: "#22c55e", glow: "rgba(34,197,94,0.15)", emoji: "💻" },
  חינוך: { accent: "#ec4899", glow: "rgba(236,72,153,0.15)", emoji: "📚" },
  "טעויות נפוצות": { accent: "#ef4444", glow: "rgba(239,68,68,0.15)", emoji: "⚠️" },
  מדריכים: { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "📝" },
  שיווק: { accent: "#3b82f6", glow: "rgba(59,130,246,0.15)", emoji: "📣" },
  תוכן: { accent: "#14b8a6", glow: "rgba(20,184,166,0.15)", emoji: "✍️" },
  תמונות: { accent: "#a855f7", glow: "rgba(168,85,247,0.15)", emoji: "🎨" },
  השוואות: { accent: "#6366f1", glow: "rgba(99,102,241,0.15)", emoji: "⚖️" },
  סקירות: { accent: "#6366f1", glow: "rgba(99,102,241,0.15)", emoji: "🔍" },
};

const DEFAULT_THEME = { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", emoji: "✨" };

// A modern UA so the Google Fonts CSS API serves woff2 `src` URLs.
const FONT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Load the Hebrew font for the OG image. Resolves the CURRENT woff2 URL from the
// Google Fonts CSS API rather than a hardcoded versioned gstatic URL — those
// rotate (v46 → v50 → …), and a rotted URL 404s to an HTML page. The previous
// code fed that HTML into the font parser ("Unsupported OpenType signature <!DO"
// in Sentry). Every step is guarded and the woff2 magic bytes are verified, so
// any failure returns null and the image renders with a fallback font instead of
// throwing.
async function loadHebrewFont(): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@700",
      { headers: { "User-Agent": FONT_UA } },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();

    // Prefer the @font-face subset whose unicode-range covers the Hebrew block
    // (U+0590–05FF); fall back to the first woff2 URL in the sheet.
    let chosen: string | null = null;
    let firstUrl: string | null = null;
    const re = /src:\s*url\((https:[^)]+\.woff2)\)[^;]*;\s*unicode-range:\s*([^;]+);/g;
    for (let m = re.exec(css); m; m = re.exec(css)) {
      if (!firstUrl) firstUrl = m[1];
      if (/0590/i.test(m[2])) {
        chosen = m[1];
        break;
      }
    }
    const url = chosen ?? firstUrl;
    if (!url) return null;

    const fontRes = await fetch(url);
    if (!fontRes.ok) return null;
    const buf = await fontRes.arrayBuffer();

    // Validate the woff2 signature ('wOF2') so an HTML error body never reaches
    // the font parser.
    const sig = new Uint8Array(buf.slice(0, 4));
    if (sig[0] !== 0x77 || sig[1] !== 0x4f || sig[2] !== 0x46 || sig[3] !== 0x32) {
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

// Cache the load once per edge isolate.
const hebrewFont = loadHebrewFont();

export async function GET(req: NextRequest) {
  const fontData = await hebrewFont;

  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "Peroot";
  const subtitle = searchParams.get("subtitle") || "";
  const category = searchParams.get("category") || "";

  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME;

  return new ImageResponse(
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
          <div style={{ fontSize: "14px", color: "#64748b" }}>www.peroot.space</div>
        </div>
      </div>
    </div>,
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
    },
  );
}

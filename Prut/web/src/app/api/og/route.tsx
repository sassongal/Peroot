import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import bidiFactory from "bidi-js";

export const runtime = "edge";

// ---------------------------------------------------------------------------
// RTL shaping. Satori draws characters in LOGICAL order and implements no
// BiDi algorithm, so raw Hebrew renders mirrored ("בדיקת" → "תקידב"). We
// reorder each WORD to visual order (UAX#9 via bidi-js, including bracket
// mirroring) and let a row-reverse flex container handle word order and
// line wrapping — reordering a whole multi-line string would put the
// sentence's end on the first line when Satori wraps it.
// ---------------------------------------------------------------------------

const bidi = bidiFactory();

function toVisualOrder(text: string): string {
  const embedding = bidi.getEmbeddingLevels(text, "rtl");
  const chars = text.split("");
  bidi.getMirroredCharactersMap(text, embedding).forEach((ch: string, idx: number) => {
    chars[idx] = ch;
  });
  bidi.getReorderSegments(text, embedding).forEach(([start, end]: [number, number]) => {
    const slice = chars.slice(start, end + 1).reverse();
    chars.splice(start, slice.length, ...slice);
  });
  return chars.join("");
}

/** Render RTL text as word spans in a wrapping row-reverse flex line. */
function RtlText({
  text,
  style,
  gap = 10,
}: {
  text: string;
  style: Record<string, string | number>;
  gap?: number;
}) {
  const words = text.trim().split(/\s+/).map(toVisualOrder);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: `${gap}px`,
        ...style,
      }}
    >
      {words.map((w, i) => (
        <span key={i}>{w}</span>
      ))}
    </div>
  );
}

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

// Load the Hebrew font for the OG image. Resolves the CURRENT font URL from the
// Google Fonts CSS API rather than a hardcoded versioned gstatic URL — those
// rotate (v46 → v50 → …), and a rotted URL 404s to an HTML page.
//
// CRITICAL FORMAT NOTE: Satori (the renderer behind next/og) parses TTF/OTF/
// WOFF only — NOT woff2. A previous version deliberately fetched woff2 (even
// validating its 'wOF2' magic bytes) and every render with a loaded font threw
// "Unsupported OpenType signature wOF2" mid-stream (Sentry, 2026-08-31). The
// CSS API returns TTF sources when the client looks like an ancient browser,
// so we request it with a bare UA and validate a TTF/OTF signature.
async function loadHebrewFont(): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@700",
      // Ancient UA → Google serves format('truetype') sources
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();

    const m = css.match(/url\((https:[^)]+\.ttf)\)/);
    if (!m) return null;

    const fontRes = await fetch(m[1]);
    if (!fontRes.ok) return null;
    const buf = await fontRes.arrayBuffer();

    // Accept TrueType (0x00010000), OpenType/CFF ('OTTO') or legacy 'true' —
    // anything else (HTML error page, woff2) must never reach the parser.
    const sig = new DataView(buf).getUint32(0);
    if (sig !== 0x00010000 && sig !== 0x4f54544f && sig !== 0x74727565) {
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

// Cache a SUCCESSFUL load per edge isolate; a transient failure clears the
// cache so the next request retries instead of serving fallback-font images
// for the isolate's whole lifetime.
let hebrewFontPromise: Promise<ArrayBuffer | null> | null = null;
function getHebrewFont(): Promise<ArrayBuffer | null> {
  if (!hebrewFontPromise) {
    hebrewFontPromise = loadHebrewFont().then((font) => {
      if (!font) hebrewFontPromise = null;
      return font;
    });
  }
  return hebrewFontPromise;
}

export async function GET(req: NextRequest) {
  const fontData = await getHebrewFont();

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
          <span>{toVisualOrder(category)}</span>
        </div>
      )}

      {/* Title */}
      <RtlText
        text={title}
        gap={12}
        style={{
          fontSize: title.length > 40 ? "42px" : "48px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          maxWidth: "900px",
        }}
      />

      {/* Subtitle */}
      {subtitle && (
        <RtlText
          text={subtitle}
          gap={7}
          style={{
            fontSize: "20px",
            color: "#94a3b8",
            marginTop: "20px",
            maxWidth: "700px",
            lineHeight: 1.5,
          }}
        />
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

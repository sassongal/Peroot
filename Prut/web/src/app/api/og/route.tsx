import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "Peroot";
  const subtitle =
    searchParams.get("subtitle") || "מחולל פרומפטים מקצועי בעברית";

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
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Brand */}
        <div
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#F59E0B",
            letterSpacing: "0.1em",
            marginBottom: "24px",
          }}
        >
          PEROOT
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "48px",
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
        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            marginTop: "20px",
            textAlign: "center",
            direction: "rtl",
          }}
        >
          {subtitle}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "3px",
              background: "linear-gradient(90deg, #F59E0B, #EAB308)",
              borderRadius: "2px",
            }}
          />
          <div style={{ fontSize: "14px", color: "#64748b" }}>peroot.space</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

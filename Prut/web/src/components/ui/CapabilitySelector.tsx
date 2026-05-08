"use client";

import { CapabilityMode, CAPABILITY_CONFIGS } from "@/lib/capability-mode";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./CapabilitySelector.module.css";

// ── Per-mode CSS custom property values ──────────────────────────────────────
interface ModeStyle {
  pillBg: string;
  pillShadow: string;
  pillBorder: string;
  deskGradFrom: string;
  deskGradTo: string;
  deskBorderColor: string;
  deskGlow: string;
  topbarColor: string;
  blobColor: string;
}

const MODE_STYLES: Record<CapabilityMode, ModeStyle> = {
  [CapabilityMode.STANDARD]: {
    pillBg: "rgba(83,118,164,0.32)",
    pillShadow: "0 0 20px rgba(83,118,164,0.3), inset 0 1px 0 rgba(147,197,217,0.25)",
    pillBorder: "rgba(83,118,164,0.5)",
    deskGradFrom: "rgba(83,118,164,0.22)",
    deskGradTo: "rgba(83,118,164,0.06)",
    deskBorderColor: "rgba(83,118,164,0.55)",
    deskGlow: "0 8px 30px rgba(83,118,164,0.25)",
    topbarColor: "#5376A4",
    blobColor: "#5376A4",
  },
  [CapabilityMode.DEEP_RESEARCH]: {
    pillBg: "rgba(69,111,82,0.35)",
    pillShadow: "0 0 22px rgba(69,111,82,0.32), inset 0 1px 0 rgba(134,239,172,0.25)",
    pillBorder: "rgba(69,111,82,0.5)",
    deskGradFrom: "rgba(69,111,82,0.25)",
    deskGradTo: "rgba(69,111,82,0.07)",
    deskBorderColor: "rgba(69,111,82,0.6)",
    deskGlow: "0 8px 32px rgba(69,111,82,0.28)",
    topbarColor: "#456F52",
    blobColor: "#456F52",
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    pillBg: "rgba(172,80,80,0.32)",
    pillShadow: "0 0 20px rgba(172,80,80,0.3), inset 0 1px 0 rgba(252,165,165,0.25)",
    pillBorder: "rgba(172,80,80,0.5)",
    deskGradFrom: "rgba(172,80,80,0.22)",
    deskGradTo: "rgba(172,80,80,0.06)",
    deskBorderColor: "rgba(172,80,80,0.55)",
    deskGlow: "0 8px 30px rgba(172,80,80,0.25)",
    topbarColor: "#AC5050",
    blobColor: "#AC5050",
  },
  [CapabilityMode.AGENT_BUILDER]: {
    pillBg: "rgba(253,190,0,0.24)",
    pillShadow: "0 0 22px rgba(253,190,0,0.28), inset 0 1px 0 rgba(253,230,80,0.3)",
    pillBorder: "rgba(253,190,0,0.45)",
    deskGradFrom: "rgba(253,190,0,0.18)",
    deskGradTo: "rgba(253,190,0,0.04)",
    deskBorderColor: "rgba(253,190,0,0.5)",
    deskGlow: "0 8px 34px rgba(253,190,0,0.3)",
    topbarColor: "#FDBE00",
    blobColor: "#FDBE00",
  },
  [CapabilityMode.VIDEO_GENERATION]: {
    pillBg: "rgba(100,104,212,0.3)",
    pillShadow: "0 0 20px rgba(100,104,212,0.28), inset 0 1px 0 rgba(165,180,252,0.25)",
    pillBorder: "rgba(100,104,212,0.5)",
    deskGradFrom: "rgba(100,104,212,0.22)",
    deskGradTo: "rgba(100,104,212,0.06)",
    deskBorderColor: "rgba(100,104,212,0.55)",
    deskGlow: "0 8px 30px rgba(100,104,212,0.25)",
    topbarColor: "#6468d4",
    blobColor: "#6468d4",
  },
};

// ── Inline SVG icons — no external CDN ───────────────────────────────────────
function IconStandard({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke="#5376A4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="13 8 10 12 14 12 11 17"
        stroke="#7aaed4"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconResearch({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="2.2" fill="#456F52" opacity="0.8" />
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#456F52" strokeWidth="1.5" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="#456F52"
        strokeWidth="1.5"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="#456F52"
        strokeWidth="1.5"
        transform="rotate(120 12 12)"
      />
    </svg>
  );
}

function IconImage({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="#AC5050" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="#AC5050" strokeWidth="1.5" />
      <line
        x1="12"
        y1="2.5"
        x2="12"
        y2="8"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="16"
        x2="12"
        y2="21.5"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="5.2"
        y1="5.2"
        x2="9"
        y2="9"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="15"
        x2="18.8"
        y2="18.8"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="2.5"
        y1="12"
        x2="8"
        y2="12"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="12"
        x2="21.5"
        y2="12"
        stroke="#AC5050"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAgent({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="2"
        stroke="#FDBE00"
        strokeWidth="1.6"
        fill="#FDBE00"
        fillOpacity="0.12"
      />
      <line x1="9" y1="7" x2="9" y2="4" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line
        x1="12"
        y1="7"
        x2="12"
        y2="4"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="7"
        x2="15"
        y2="4"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="17"
        x2="9"
        y2="20"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="12"
        y2="20"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="17"
        x2="15"
        y2="20"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="7" y1="9" x2="4" y2="9" stroke="#FDBE00" strokeWidth="1.5" strokeLinecap="round" />
      <line
        x1="7"
        y1="12"
        x2="4"
        y2="12"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="15"
        x2="4"
        y2="15"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="9"
        x2="17"
        y2="9"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="12"
        x2="17"
        y2="12"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="15"
        x2="17"
        y2="15"
        stroke="#FDBE00"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2" fill="#FDBE00" opacity="0.5" />
    </svg>
  );
}

function IconVideo({ size }: { size: 24 | 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="8" width="20" height="13" rx="2" stroke="#6468d4" strokeWidth="1.6" />
      <path d="M2 12h20" stroke="#6468d4" strokeWidth="1.5" />
      <path d="M7 8V4M12 8V4M17 8V4" stroke="#6468d4" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M2 12l5-4M7 12l5-4M12 12l5-4M17 12l5-4"
        stroke="#6468d4"
        strokeWidth="1.3"
        opacity="0.6"
        strokeLinecap="round"
      />
      <polygon points="10,16 10,19 14,17.5" fill="#6468d4" opacity="0.8" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<CapabilityMode, React.ComponentType<{ size: 24 | 36 }>> = {
  [CapabilityMode.STANDARD]: IconStandard,
  [CapabilityMode.DEEP_RESEARCH]: IconResearch,
  [CapabilityMode.IMAGE_GENERATION]: IconImage,
  [CapabilityMode.AGENT_BUILDER]: IconAgent,
  [CapabilityMode.VIDEO_GENERATION]: IconVideo,
};

const COMING_SOON_MODES = new Set<CapabilityMode>([]);

// ── Smoke particle helpers ────────────────────────────────────────────────────
function PillSmoke() {
  return (
    <>
      <span
        aria-hidden
        className={cn(styles.smoke, styles.smokeL, styles.smokeSmL, styles.smokeD1)}
      />
      <span
        aria-hidden
        className={cn(styles.smoke, styles.smokeR, styles.smokeSmR, styles.smokeD2)}
      />
      <span aria-hidden className={cn(styles.smoke, styles.smokeC, styles.smokeSmC)} />
    </>
  );
}

function DeskSmoke() {
  return (
    <>
      <span
        aria-hidden
        className={cn(styles.smoke, styles.smokeL, styles.smokeLgL, styles.smokeD1)}
      />
      <span
        aria-hidden
        className={cn(styles.smoke, styles.smokeR, styles.smokeLgR, styles.smokeD2)}
      />
      <span aria-hidden className={cn(styles.smoke, styles.smokeC, styles.smokeLgC)} />
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CapabilitySelectorProps {
  value: CapabilityMode;
  onChange: (mode: CapabilityMode) => void;
  disabled?: boolean;
  compact?: boolean;
  /** @deprecated kept for back-compat */
  isPro?: boolean;
  /** Guest (unauthenticated) users are locked to STANDARD */
  isGuest?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CapabilitySelector({
  value,
  onChange,
  disabled = false,
  isGuest = false,
}: CapabilitySelectorProps) {
  const router = useRouter();
  const modes = Object.values(CapabilityMode);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (isGuest && value !== CapabilityMode.STANDARD) {
      onChangeRef.current(CapabilityMode.STANDARD);
    }
  }, [isGuest, value]);

  function handleClick(mode: CapabilityMode) {
    if (COMING_SOON_MODES.has(mode)) {
      toast("מנוע הסרטונים בדרך! נעדכן אותך כשיהיה מוכן", { icon: "🎬" });
      return;
    }
    if (isGuest && mode !== CapabilityMode.STANDARD) {
      toast("התחבר כדי להשתמש במצב זה", { icon: "🔒" });
      router.push("/login");
      return;
    }
    onChange(mode);
  }

  return (
    <>
      {/* ── Mobile: Rising Pill Track (hidden on md+) ── */}
      <div className={cn("md:hidden", styles.pillTrack)}>
        {modes.map((mode) => {
          const config = CAPABILITY_CONFIGS[mode];
          const modeStyle = MODE_STYLES[mode];
          const isSelected = value === mode;
          const isComingSoon = COMING_SOON_MODES.has(mode);
          const isLocked = isGuest && mode !== CapabilityMode.STANDARD;
          const isDisabled = disabled || isComingSoon;
          const Icon = ICON_COMPONENTS[mode];

          return (
            <button
              key={mode}
              type="button"
              data-testid={`pill-${mode}`}
              disabled={isDisabled}
              onClick={() => handleClick(mode)}
              aria-pressed={isSelected}
              aria-label={config.labelHe}
              title={
                isComingSoon
                  ? "בקרוב"
                  : isLocked
                    ? "התחבר כדי להשתמש במצב זה"
                    : config.descriptionHe
              }
              style={
                {
                  "--pill-bg": modeStyle.pillBg,
                  "--pill-shadow": modeStyle.pillShadow,
                  "--pill-border": modeStyle.pillBorder,
                } as React.CSSProperties
              }
              className={cn(
                styles.pillBtn,
                isSelected && styles.pillBtnActive,
                (isDisabled || isLocked) && styles.pillBtnDisabled,
              )}
            >
              <span aria-hidden className={styles.pillHighlight} />
              <PillSmoke />
              <span className={styles.iconWrap}>
                <Icon size={24} />
              </span>
              <span className={styles.pillLabel}>
                {isLocked ? <Lock className="w-3 h-3 inline" /> : config.labelHe}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Desktop: Luxury Gem Cards (hidden below md) ── */}
      <div className={cn("hidden md:flex", styles.deskRow)}>
        {modes.map((mode) => {
          const config = CAPABILITY_CONFIGS[mode];
          const modeStyle = MODE_STYLES[mode];
          const isSelected = value === mode;
          const isComingSoon = COMING_SOON_MODES.has(mode);
          const isLocked = isGuest && mode !== CapabilityMode.STANDARD;
          const isDisabled = disabled || isComingSoon;
          const Icon = ICON_COMPONENTS[mode];

          return (
            <button
              key={mode}
              type="button"
              data-testid={`card-${mode}`}
              disabled={isDisabled}
              onClick={() => handleClick(mode)}
              aria-pressed={isSelected}
              aria-label={config.labelHe}
              title={
                isComingSoon
                  ? "בקרוב"
                  : isLocked
                    ? "התחבר כדי להשתמש במצב זה"
                    : config.descriptionHe
              }
              style={
                {
                  "--desk-grad-from": modeStyle.deskGradFrom,
                  "--desk-grad-to": modeStyle.deskGradTo,
                  "--desk-border-color": modeStyle.deskBorderColor,
                  "--desk-glow": modeStyle.deskGlow,
                  "--topbar-color": modeStyle.topbarColor,
                  "--blob-color": modeStyle.blobColor,
                } as React.CSSProperties
              }
              className={cn(
                styles.deskBtn,
                isSelected && styles.deskBtnActive,
                (isDisabled || isLocked) && styles.deskBtnDisabled,
              )}
            >
              <div className={styles.deskCard}>
                <span aria-hidden className={styles.blobGlow} />
                <span aria-hidden className={styles.deskTopbar} />
                <DeskSmoke />
                <span className={styles.iconWrapLg}>
                  <Icon size={36} />
                </span>
                <span className={styles.deskName}>
                  {isLocked ? (
                    <>
                      <Lock className="w-3 h-3 inline mr-1" />
                      {config.labelHe}
                    </>
                  ) : (
                    config.labelHe
                  )}
                </span>
                <span className={styles.deskDesc}>{config.descriptionHe}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

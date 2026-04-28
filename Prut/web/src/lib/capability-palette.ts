// Single source of truth for capability mode colors.
// All capability UI (selector, badge, filter) reads from here so the palette
// stays consistent across the app.

export interface CapabilityAccent {
  /** Base hex used as the accent color. All surface/border/text variants are derived via color-mix. */
  accent: string;
  /** Comma-separated RGB triplet for use inside rgba() shadows. */
  shadowRgb: string;
}

// Nordic Pastel — icy, desaturated, sophisticated. Each mode keeps a distinct hue
// while staying calm enough to coexist with the rest of the UI in both light and dark.
export const CAPABILITY_PALETTE: Record<string, CapabilityAccent> = {
  sky: { accent: "#C5D5E0", shadowRgb: "197,213,224" }, // icy blue — Standard
  emerald: { accent: "#C0D4C8", shadowRgb: "192,212,200" }, // dusty sage — Deep Research
  rose: { accent: "#E5C8CC", shadowRgb: "229,200,204" }, // dusty rose — Image
  purple: { accent: "#CDC4D8", shadowRgb: "205,196,216" }, // pale lilac — Agent
  amber: { accent: "#E8DAB8", shadowRgb: "232,218,184" }, // butter — Video
};

export function getAccent(colorKey: string): CapabilityAccent {
  return CAPABILITY_PALETTE[colorKey] ?? CAPABILITY_PALETTE.sky;
}

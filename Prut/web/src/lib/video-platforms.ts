export type VideoPlatform =
  | "general"
  | "runway"
  | "kling"
  | "veo"
  | "higgsfield"
  | "minimax"
  | "wan";

interface VideoPlatformConfig {
  id: VideoPlatform;
  name: string;
  nameHe: string;
  description: string;
  icon: string;
  deprecated?: boolean;
}

export const VIDEO_PLATFORMS: VideoPlatformConfig[] = [
  {
    id: "general",
    name: "General",
    nameHe: "כללי",
    description: "פרומפט אופטימלי לכל פלטפורמת וידאו",
    icon: "🎬",
  },
  {
    id: "runway",
    name: "Runway Gen-4.5",
    nameHe: "Runway",
    description: "אודיו מקורי, מולטי-שוט, עד 60 שניות, טקסט זורם, בלוק Audio",
    icon: "runway",
  },
  {
    id: "kling",
    name: "Kling 3.0",
    nameHe: "Kling",
    description: "פיזיקה מתקדמת, 4K, אודיו מקורי, Motion Brush, 3-15 שניות",
    icon: "kling",
  },
  {
    id: "veo",
    name: "Veo 3.1",
    nameHe: "Veo",
    description: "Google Veo - אודיו מקורי, דיאלוג, SFX, עקביות דמויות",
    icon: "veo",
  },
  {
    id: "wan",
    name: "Wan 2.6",
    nameHe: "Wan",
    description: "Alibaba open-source, שליטה קולנועית, נגטיב ייעודי, ארכיטקטורת MoE",
    icon: "wan",
  },
  {
    id: "higgsfield",
    name: "Higgsfield Cinema",
    nameHe: "Higgsfield",
    description: "מערכת 3 שכבות, מולטי-מודל, תזמון מדויק",
    icon: "higgsfield",
  },
  {
    id: "minimax",
    name: "Minimax Hailuo 2.3",
    nameHe: "Minimax",
    description: "תנועות גוף, הבעות פנים, סינטקס [מצלמה], אנימה",
    icon: "minimax",
  },
];

export function getVideoPlatform(id: VideoPlatform): VideoPlatformConfig | undefined {
  return VIDEO_PLATFORMS.find((p) => p.id === id);
}

export type VideoPlatform = 'general' | 'runway' | 'kling' | 'sora' | 'veo' | 'higgsfield' | 'minimax';

export interface VideoPlatformConfig {
  id: VideoPlatform;
  name: string;
  nameHe: string;
  description: string;
  icon: string;
}

export const VIDEO_PLATFORMS: VideoPlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמת וידאו', icon: '🎬' },
  { id: 'runway', name: 'Runway Gen-4', nameHe: 'Runway', description: 'Director Mode, מצלמה מובילה, סצנה אחת, שפה טבעית', icon: 'runway' },
  { id: 'kling', name: 'Kling 3.0', nameHe: 'Kling', description: 'פיזיקה מתקדמת, 4K, אודיו מקורי, Motion Brush, 3-15 שניות', icon: 'kling' },
  { id: 'sora', name: 'Sora 2', nameHe: 'Sora', description: 'סטוריבורד מובנה, דיאלוג, עד 20 שניות, character refs', icon: 'sora' },
  { id: 'veo', name: 'Veo 3', nameHe: 'Veo', description: 'Google Veo - אודיו מקורי, דיאלוג, SFX, עקביות דמויות', icon: 'veo' },
  { id: 'higgsfield', name: 'Higgsfield Cinema', nameHe: 'Higgsfield', description: 'מערכת 3 שכבות, מולטי-מודל, תזמון מדויק', icon: 'higgsfield' },
  { id: 'minimax', name: 'Minimax Hailuo 2.3', nameHe: 'Minimax', description: 'תנועות גוף, הבעות פנים, סינטקס [מצלמה], אנימה', icon: 'minimax' },
];

export function getVideoPlatform(id: VideoPlatform): VideoPlatformConfig | undefined {
  return VIDEO_PLATFORMS.find((p) => p.id === id);
}

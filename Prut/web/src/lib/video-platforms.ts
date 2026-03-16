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
  { id: 'runway', name: 'Runway Gen-4', nameHe: 'Runway', description: 'מצלמה מובילה, סצנה אחת, שפה טבעית', icon: 'runway' },
  { id: 'kling', name: 'Kling 2.0', nameHe: 'Kling', description: 'תנועה פיזיקלית, מבנה 4 חלקים', icon: 'kling' },
  { id: 'sora', name: 'Sora', nameHe: 'Sora', description: 'סטוריבורד קולנועי, עדשות וירטואליות', icon: 'sora' },
  { id: 'veo', name: 'Veo 3', nameHe: 'Veo', description: 'Google Veo — אודיו מקורי, עקביות דמויות', icon: 'veo' },
  { id: 'higgsfield', name: 'Higgsfield', nameHe: 'Higgsfield', description: 'סינטקס פקודות, תזמון מדויק', icon: 'higgsfield' },
  { id: 'minimax', name: 'Minimax Hailuo', nameHe: 'Minimax', description: 'תנועות גוף, הבעות פנים, כוריאוגרפיה', icon: 'minimax' },
];

export function getVideoPlatform(id: VideoPlatform): VideoPlatformConfig | undefined {
  return VIDEO_PLATFORMS.find(p => p.id === id);
}

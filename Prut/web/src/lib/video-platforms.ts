export type VideoPlatform = 'general' | 'runway' | 'kling' | 'pika' | 'sora' | 'luma' | 'minimax';

export interface VideoPlatformConfig {
  id: VideoPlatform;
  name: string;
  nameHe: string;
  description: string;
  icon: string;
}

export const VIDEO_PLATFORMS: VideoPlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמת וידאו', icon: '🎬' },
  { id: 'runway', name: 'Runway Gen-4', nameHe: 'Runway', description: 'תנועת מצלמה + נושא + סצנה', icon: 'RW' },
  { id: 'kling', name: 'Kling AI', nameHe: 'Kling', description: 'הבנת תנועה פיזית מתקדמת', icon: 'KL' },
  { id: 'pika', name: 'Pika', nameHe: 'Pika', description: 'נושא בודד, תנועה פשוטה', icon: 'PK' },
  { id: 'sora', name: 'Sora', nameHe: 'Sora', description: 'סטוריבורד קולנועי מפורט', icon: 'SR' },
  { id: 'luma', name: 'Luma Dream Machine', nameHe: 'Luma', description: 'שפה שיחתית, @character refs', icon: 'LM' },
  { id: 'minimax', name: 'Minimax/Hailuo', nameHe: 'Minimax', description: 'תנועות גוף מורכבות', icon: 'MM' },
];

export function getVideoPlatform(id: VideoPlatform): VideoPlatformConfig | undefined {
  return VIDEO_PLATFORMS.find(p => p.id === id);
}

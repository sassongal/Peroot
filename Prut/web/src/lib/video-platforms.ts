export type VideoPlatform = 'general' | 'runway' | 'kling' | 'pika' | 'sora' | 'luma' | 'minimax' | 'higgsfield' | 'nanobanana' | 'vidu';

export interface VideoPlatformConfig {
  id: VideoPlatform;
  name: string;
  nameHe: string;
  description: string;
  icon: string;
}

export const VIDEO_PLATFORMS: VideoPlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמת וידאו', icon: '🎬' },
  { id: 'runway', name: 'Runway Gen-4.5', nameHe: 'Runway', description: 'תנועת מצלמה + נושא + סצנה', icon: 'RW' },
  { id: 'kling', name: 'Kling 3.0', nameHe: 'Kling', description: 'הבנת תנועה פיזית מתקדמת', icon: 'KL' },
  { id: 'pika', name: 'Pika 2.5', nameHe: 'Pika', description: 'נושא בודד, תנועה פשוטה', icon: 'PK' },
  { id: 'sora', name: 'Sora 2', nameHe: 'Sora', description: 'סטוריבורד קולנועי מפורט', icon: 'SR' },
  { id: 'luma', name: 'Luma Ray3', nameHe: 'Luma', description: 'שפה שיחתית, @character refs', icon: 'LM' },
  { id: 'minimax', name: 'Minimax Hailuo 2.3', nameHe: 'Minimax', description: 'תנועות גוף מורכבות', icon: 'MM' },
  { id: 'higgsfield', name: 'Higgsfield', nameHe: 'Higgsfield', description: 'תיזמור מרובה מודלים, סטוריבורד שכבתי', icon: 'HF' },
  { id: 'nanobanana', name: 'Nano Banana', nameHe: 'Nano Banana', description: 'עקביות דמויות, שילוב מדויק, Gemini', icon: 'NB' },
  { id: 'vidu', name: 'Vidu', nameHe: 'Vidu', description: 'וידאו + אודיו מקורי, דיאלוג, אפקטים', icon: 'VD' },
];

export function getVideoPlatform(id: VideoPlatform): VideoPlatformConfig | undefined {
  return VIDEO_PLATFORMS.find(p => p.id === id);
}

export type ImagePlatform = 'general' | 'midjourney' | 'dalle' | 'flux' | 'stable-diffusion' | 'imagen' | 'nanobanana';
export type ImageOutputFormat = 'text' | 'json';

export interface ImagePlatformConfig {
  id: ImagePlatform;
  name: string;
  nameHe: string;
  description: string;
  supportsNegativePrompt: boolean;
  supportsJson: boolean;
  promptStyle: 'natural' | 'keywords' | 'narrative';
  icon: string; // emoji or short label
}

export const IMAGE_PLATFORMS: ImagePlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמה', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: '🎨' },
  { id: 'midjourney', name: 'Midjourney', nameHe: 'Midjourney', description: 'כולל פרמטרים --ar, --s, ::weight', supportsNegativePrompt: true, supportsJson: false, promptStyle: 'natural', icon: 'MJ' },
  { id: 'dalle', name: 'DALL-E 3', nameHe: 'DALL-E 3', description: 'שפה טבעית, תיאורים עשירים', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: 'DE' },
  { id: 'flux', name: 'Flux', nameHe: 'Flux', description: 'שפה טבעית, תמיכה בצבעי hex', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: 'FX' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', nameHe: 'Stable Diffusion', description: 'מילות מפתח, משקלות (word:1.5), negative prompt', supportsNegativePrompt: true, supportsJson: true, promptStyle: 'keywords', icon: 'SD' },
  { id: 'imagen', name: 'Imagen', nameHe: 'Imagen', description: 'תיאור נרטיבי, עד 480 טוקנים', supportsNegativePrompt: true, supportsJson: false, promptStyle: 'narrative', icon: 'IG' },
  { id: 'nanobanana', name: 'Nano Banana', nameHe: 'Nano Banana', description: 'שפה טבעית מובנית, תמיכה ב-JSON מובנה, עקביות דמויות', supportsNegativePrompt: false, supportsJson: true, promptStyle: 'natural', icon: 'NB' },
];

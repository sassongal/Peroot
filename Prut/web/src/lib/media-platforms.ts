export type ImagePlatform = 'general' | 'midjourney' | 'dalle' | 'flux' | 'stable-diffusion' | 'imagen' | 'nanobanana';
export type ImageOutputFormat = 'text' | 'json';

interface ImagePlatformConfig {
  id: ImagePlatform;
  name: string;
  nameHe: string;
  description: string;
  supportsNegativePrompt: boolean;
  supportsJson: boolean;
  promptStyle: 'natural' | 'keywords' | 'narrative';
  icon: string; // platform id for SVG icon, or emoji
}

export const IMAGE_PLATFORMS: ImagePlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמה', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: '🎨' },
  { id: 'midjourney', name: 'Midjourney', nameHe: 'Midjourney', description: 'כולל פרמטרים --ar, --s, ::weight', supportsNegativePrompt: true, supportsJson: false, promptStyle: 'natural', icon: 'midjourney' },
  { id: 'dalle', name: 'GPT Image / DALL-E', nameHe: 'GPT Image', description: 'שפה טבעית עשירה, טקסט מדויק בתמונות, איכות פוטוריאליסטית', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: 'dalle' },
  { id: 'flux', name: 'FLUX.2', nameHe: 'FLUX.2', description: 'JSON מובנה, צבעי hex, טקסט מדויק, מפרט מצלמה', supportsNegativePrompt: false, supportsJson: false, promptStyle: 'natural', icon: 'flux' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', nameHe: 'Stable Diffusion', description: 'מילות מפתח, משקלות (word:1.5), negative prompt', supportsNegativePrompt: true, supportsJson: true, promptStyle: 'keywords', icon: 'stable-diffusion' },
  { id: 'imagen', name: 'Imagen 4', nameHe: 'Imagen', description: 'תיאור נרטיבי, רזולוציה 2K, טקסט מדויק', supportsNegativePrompt: true, supportsJson: false, promptStyle: 'narrative', icon: 'imagen' },
  { id: 'nanobanana', name: 'Gemini Image', nameHe: 'Gemini Image', description: 'שפה טבעית מובנית, תמיכה ב-JSON מובנה, עקביות דמויות', supportsNegativePrompt: false, supportsJson: true, promptStyle: 'natural', icon: 'nanobanana' },
];

/**
 * Visual Preference Extractor
 *
 * Extracts recurring visual patterns from a user's prompt history to personalize
 * image/video prompt generation. Looks for aspect ratios, styles, camera specs,
 * color palettes, and platform parameters that appear frequently.
 */

interface VisualPreferences {
  preferredStyles?: string[];
  preferredAspectRatios?: string[];
  preferredColorTones?: string[];
  preferredCameraSpecs?: string[];
  preferredMjParams?: Record<string, string>;
}

// Style keywords to detect
const STYLE_KEYWORDS = [
  'cinematic', 'editorial', 'documentary', 'photorealistic', 'anime', 'watercolor',
  'oil painting', 'film grain', 'bokeh', 'shallow depth of field', 'wide angle',
  'macro', 'portrait', 'landscape', 'minimalist', 'maximalist', 'vintage',
  'retro', 'modern', 'abstract', 'surreal', 'noir', 'neon', 'pastel',
  'moody', 'dreamy', 'ethereal', 'gritty', 'stylized', 'hyperrealistic',
  'golden hour', 'blue hour', 'dramatic lighting', 'soft lighting', 'rim lighting',
];

// Color tone keywords
const COLOR_TONE_KEYWORDS = [
  'warm', 'cool', 'amber', 'teal', 'golden', 'silver', 'copper', 'crimson',
  'azure', 'emerald', 'monochrome', 'sepia', 'pastel', 'vibrant', 'muted',
  'earth tones', 'jewel tones', 'neon', 'desaturated', 'high contrast',
];

// Camera brands/specs
const CAMERA_BRANDS = [
  'Sony A7', 'Canon EOS', 'Nikon Z', 'Hasselblad', 'Leica', 'Fujifilm',
  'Blackmagic', 'DJI', 'GoPro',
];

/**
 * Extract visual preferences from a user's prompt history.
 * Returns preferences that appear in ≥2 prompts.
 */
export function extractVisualPreferences(
  history: { title: string; prompt: string }[]
): VisualPreferences {
  if (!history || history.length < 2) return {};

  const allText = history.map(h => h.prompt).join('\n').toLowerCase();
  const preferences: VisualPreferences = {};

  // Extract aspect ratios (--ar X:Y or [aspectRatio: X:Y])
  const arMatches = allText.match(/--ar\s+(\d+:\d+)|aspectratio:\s*(\d+:\d+)/g) || [];
  const arCounts = new Map<string, number>();
  arMatches.forEach(m => {
    const ratio = m.match(/\d+:\d+/)?.[0];
    if (ratio) arCounts.set(ratio, (arCounts.get(ratio) || 0) + 1);
  });
  const topAr = Array.from(arCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ar]) => ar);
  if (topAr.length > 0) preferences.preferredAspectRatios = topAr;

  // Extract style keywords
  const styleCounts = new Map<string, number>();
  for (const kw of STYLE_KEYWORDS) {
    const matches = (allText.match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
    if (matches >= 2) styleCounts.set(kw, matches);
  }
  const topStyles = Array.from(styleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);
  if (topStyles.length > 0) preferences.preferredStyles = topStyles;

  // Extract color tones
  const colorCounts = new Map<string, number>();
  for (const kw of COLOR_TONE_KEYWORDS) {
    const matches = (allText.match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
    if (matches >= 2) colorCounts.set(kw, matches);
  }
  const topColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);
  if (topColors.length > 0) preferences.preferredColorTones = topColors;

  // Extract camera brands
  const cameraCounts = new Map<string, number>();
  for (const brand of CAMERA_BRANDS) {
    const matches = (allText.match(new RegExp(brand.toLowerCase(), 'g')) || []).length;
    if (matches >= 2) cameraCounts.set(brand, matches);
  }
  const topCameras = Array.from(cameraCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => c);
  if (topCameras.length > 0) preferences.preferredCameraSpecs = topCameras;

  // Extract Midjourney parameters (--s, --chaos values)
  const sMatches = allText.match(/--s\s+(\d+)/g) || [];
  if (sMatches.length >= 2) {
    const sValues = sMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')).filter(v => v > 0);
    const avgS = Math.round(sValues.reduce((a, b) => a + b, 0) / sValues.length);
    preferences.preferredMjParams = { ...preferences.preferredMjParams, '--s': String(avgS) };
  }

  return preferences;
}

/**
 * Build a text block to inject into the system prompt summarizing the user's
 * visual preferences. Returns empty string if no preferences.
 */
export function buildVisualPreferencesBlock(prefs: VisualPreferences): string {
  const lines: string[] = [];

  if (prefs.preferredStyles?.length) {
    lines.push(`- Style: ${prefs.preferredStyles.join(', ')}`);
  }
  if (prefs.preferredAspectRatios?.length) {
    lines.push(`- Aspect ratios: ${prefs.preferredAspectRatios.join(', ')}`);
  }
  if (prefs.preferredColorTones?.length) {
    lines.push(`- Color palettes: ${prefs.preferredColorTones.join(', ')}`);
  }
  if (prefs.preferredCameraSpecs?.length) {
    lines.push(`- Camera preferences: ${prefs.preferredCameraSpecs.join(', ')}`);
  }
  if (prefs.preferredMjParams) {
    const params = Object.entries(prefs.preferredMjParams).map(([k, v]) => `${k} ${v}`).join(' ');
    lines.push(`- Preferred params: ${params}`);
  }

  if (lines.length === 0) return '';

  return `\n[USER VISUAL STYLE PREFERENCES]\nBased on this user's previous prompts, they tend to prefer:\n${lines.join('\n')}\nIncorporate these preferences subtly unless the current concept clearly calls for a different approach.\n`;
}

/**
 * Supported AI platforms / engines that Peroot optimizes prompts for.
 * Used by the SupportedPlatforms marquee on the homepage.
 *
 * Logos live locally under `public/logos/platforms/` so there's zero external
 * runtime dependency. Platforms without a `logo` fall back to a styled wordmark.
 */

export type PlatformCategory = "text" | "image" | "video" | "code";

export type Platform = {
  id: string;
  name: string;
  category: PlatformCategory;
  /** Path to local SVG under /public. If missing, renders a text wordmark. */
  logo?: string;
};

const L = (file: string) => `/logos/platforms/${file}`;

/** Row 1: Text + Code — the engines people prompt with daily */
export const PLATFORMS_TEXT_CODE: Platform[] = [
  { id: "chatgpt", name: "ChatGPT", category: "text", logo: L("openai.svg") },
  { id: "claude", name: "Claude", category: "text", logo: L("anthropic.svg") },
  { id: "gemini", name: "Gemini", category: "text", logo: L("googlegemini.svg") },
  { id: "mistral", name: "Mistral", category: "text", logo: L("mistralai.svg") },
  { id: "deepseek", name: "DeepSeek", category: "text", logo: L("deepseek.svg") },
  { id: "grok", name: "Grok", category: "text", logo: L("x.svg") },
  { id: "perplexity", name: "Perplexity", category: "text", logo: L("perplexity.svg") },
  { id: "llama", name: "Llama", category: "text", logo: L("meta.svg") },
  { id: "qwen", name: "Qwen", category: "text", logo: L("alibabacloud.svg") },
  { id: "copilot", name: "Copilot", category: "code", logo: L("githubcopilot.svg") },
  { id: "cursor", name: "Cursor", category: "code", logo: L("cursor.svg") },
];

/** Row 2: Image + Video — generative media engines */
export const PLATFORMS_IMAGE_VIDEO: Platform[] = [
  { id: "midjourney", name: "Midjourney", category: "image", logo: L("midjourney.svg") },
  { id: "dalle", name: "DALL·E", category: "image", logo: L("openai.svg") },
  { id: "flux", name: "Flux", category: "image", logo: L("flux.svg") },
  { id: "stable-diffusion", name: "Stable Diffusion", category: "image", logo: L("stable-diffusion.svg") },
  { id: "ideogram", name: "Ideogram", category: "image", logo: L("ideogram.png") },
  { id: "sora", name: "Sora", category: "video", logo: L("openai.svg") },
  { id: "veo", name: "Veo", category: "video", logo: L("google.svg") },
  { id: "runway", name: "Runway", category: "video", logo: L("runway.svg") },
  { id: "pika", name: "Pika", category: "video", logo: L("pika.png") },
  { id: "kling", name: "Kling", category: "video", logo: L("kling.png") },
  { id: "minimax", name: "MiniMax", category: "video", logo: L("minimax.png") },
  { id: "luma", name: "Luma", category: "video", logo: L("luma.svg") },
];

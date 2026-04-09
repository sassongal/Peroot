/**
 * Supported AI platforms / engines that Peroot optimizes prompts for.
 * Used by the SupportedPlatforms marquee on the homepage.
 *
 * Logos are fetched from https://cdn.simpleicons.org when a `slug` is provided.
 * Platforms without a simpleicons entry fall back to a styled text wordmark.
 */

export type PlatformCategory = "text" | "image" | "video" | "code";

export type Platform = {
  id: string;
  name: string;
  category: PlatformCategory;
  /** simpleicons.org slug — if missing, the component renders a text wordmark */
  slug?: string;
  /** Brand hex color (no #). Used as the logo color on hover. */
  color?: string;
};

/** Row 1: Text + Code — the engines people prompt with daily */
export const PLATFORMS_TEXT_CODE: Platform[] = [
  { id: "chatgpt", name: "ChatGPT", category: "text", slug: "openai", color: "10A37F" },
  { id: "claude", name: "Claude", category: "text", slug: "anthropic", color: "D97757" },
  { id: "gemini", name: "Gemini", category: "text", slug: "googlegemini", color: "8E75B2" },
  { id: "mistral", name: "Mistral", category: "text", slug: "mistralai", color: "FA520F" },
  { id: "deepseek", name: "DeepSeek", category: "text", slug: "deepseek", color: "4D6BFE" },
  { id: "grok", name: "Grok", category: "text", slug: "x", color: "000000" },
  { id: "perplexity", name: "Perplexity", category: "text", slug: "perplexity", color: "1FB8CD" },
  { id: "llama", name: "Llama", category: "text", slug: "meta", color: "0866FF" },
  { id: "qwen", name: "Qwen", category: "text", slug: "alibabacloud", color: "FF6A00" },
  { id: "copilot", name: "Copilot", category: "code", slug: "githubcopilot", color: "000000" },
  { id: "cursor", name: "Cursor", category: "code" },
];

/** Row 2: Image + Video — generative media engines */
export const PLATFORMS_IMAGE_VIDEO: Platform[] = [
  { id: "midjourney", name: "Midjourney", category: "image", slug: "midjourney", color: "000000" },
  { id: "dalle", name: "DALL·E", category: "image", slug: "openai", color: "412991" },
  { id: "flux", name: "Flux", category: "image" },
  { id: "stable-diffusion", name: "Stable Diffusion", category: "image", slug: "stablediffusion", color: "000000" },
  { id: "ideogram", name: "Ideogram", category: "image" },
  { id: "sora", name: "Sora", category: "video", slug: "openai", color: "000000" },
  { id: "veo", name: "Veo", category: "video", slug: "google", color: "4285F4" },
  { id: "runway", name: "Runway", category: "video" },
  { id: "pika", name: "Pika", category: "video" },
  { id: "kling", name: "Kling", category: "video" },
  { id: "minimax", name: "MiniMax", category: "video" },
  { id: "luma", name: "Luma", category: "video" },
];

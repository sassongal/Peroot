/**
 * Generates onboarding section images using Gemini 2.0 Flash image generation.
 * Run: node scripts/gen-onboarding-images.mjs
 */
import { writeFileSync, mkdirSync } from "fs";

const API_KEY = "AIzaSyA-QPPF1i5SbdSPgXY4yQC4AP30XRyZaj4";
const MODEL = "gemini-2.5-flash-image";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const IMAGES = [
  {
    name: "modes",
    prompt:
      "Multiple holographic AI chat interface panels floating in deep dark space, glowing amber purple blue neon outlines, glassmorphism dark UI, futuristic, cinematic, ultra detailed 4K digital art, no text, pure dark background #060608",
  },
  {
    name: "library",
    prompt:
      "Force-directed network graph visualization in dark void, glowing amber and indigo nodes connected by luminous thin lines, bioluminescent glow effect, data visualization art, no text, pure black background, ultra detailed",
  },
  {
    name: "public",
    prompt:
      "Grid of floating glass card panels in dark space, emerald and sky blue glowing borders, library of knowledge cards floating in 3D, futuristic dark UI, no text, abstract digital art, cinematic",
  },
  {
    name: "tools",
    prompt:
      "Collection of holographic tool icons floating in dark space — microphone, camera lens, puzzle piece, bookmark, all glowing amber rose colors, futuristic dark background, no text, ultra detailed digital art",
  },
  {
    name: "credits",
    prompt:
      "Glowing amber gold diamond gem crystal floating in deep dark space, dramatic cinematic light rays, luxury glow, bokeh dark background, photorealistic, 4K, no text",
  },
  {
    name: "agents",
    prompt:
      "Multiple AI agent robots as abstract glowing entities in dark space, interconnected by luminous threads, amber and purple neon glow, futuristic digital art, no text, dark background, ultra detailed",
  },
];

async function generateImage(prompt) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);

  const data = JSON.parse(text);
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("No image part in response: " + JSON.stringify(data).slice(0, 300));

  return part.inlineData.data; // base64
}

async function main() {
  mkdirSync("public/onboarding", { recursive: true });

  for (const { name, prompt } of IMAGES) {
    process.stdout.write(`Generating ${name}... `);
    try {
      const b64 = await generateImage(prompt);
      const buf = Buffer.from(b64, "base64");
      writeFileSync(`public/onboarding/${name}.png`, buf);
      console.log(`saved (${Math.round(buf.length / 1024)}KB)`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
}

main();

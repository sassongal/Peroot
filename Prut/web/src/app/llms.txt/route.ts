import { CATEGORY_SLUG_MAP } from "@/lib/category-slugs";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

export const revalidate = 86400; // daily is plenty — structure changes rarely

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/**
 * GET /llms.txt — a structured map of the site for AI crawlers and agents
 * (https://llmstxt.org). Peroot's audience IS the AI-agent crowd, and the
 * platform already ships an MCP server, so this file doubles as discovery
 * for both answer engines and connecting agents. Derived from the same
 * sources of truth the pages render from — nothing here can drift.
 */
export async function GET() {
  const categories = Object.entries(CATEGORY_SLUG_MAP)
    .map(([slug, d]) => `- [${d.labelHe}](${SITE_URL}/prompts/${slug}): ${d.descriptionHe}`)
    .join("\n");

  const body = `# Peroot (פירוט)

> Peroot is a Hebrew-first prompt engineering platform (peroot.space). It turns raw ideas into professional, structured prompts for ChatGPT, Claude, Gemini, Midjourney, Sora and more, with a quality score, ${PROMPT_LIBRARY_COUNT} ready-made Hebrew prompts, smart-variable templates, and five creation modes (text, deep research, image, video, AI agents). Native Hebrew and full RTL, not a translation.

Peroot גם מחולל וגם משדרג פרומפטים בעברית: מנתח את המטרה, מוסיף הקשר חסר, שואל שאלות מיקוד, ומחזיר פרומפט מובנה עם ציון איכות, חינם.

## Start here

- [Home, the prompt enhancer](${SITE_URL}/): paste a rough idea in Hebrew, get a professional prompt
- [Prompt library](${SITE_URL}/prompts): ${PROMPT_LIBRARY_COUNT} free Hebrew prompts across 30+ categories
- [Templates with variables](${SITE_URL}/templates): fill-in-the-blank Hebrew prompt templates
- [Prompt-writing guide](${SITE_URL}/guide): the Hebrew prompt-engineering methodology
- [Platform guides](${SITE_URL}/guides): per-platform image/video prompting (Midjourney, Sora, Veo, Flux…)
- [Blog](${SITE_URL}/blog): Hebrew prompt-engineering articles ([RSS](${SITE_URL}/feed.xml))
- [Examples, before/after](${SITE_URL}/examples)
- [For teachers](${SITE_URL}/teachers)
- [Pricing](${SITE_URL}/pricing): free tier + PRO

## For AI agents (Peroot Connect)

- [Peroot Connect](${SITE_URL}/connect): connect Claude, Cursor, or any agent to Peroot
- MCP endpoint: ${SITE_URL}/api/mcp (Streamable HTTP; Bearer prk_ API key or OAuth 2.1)
- [REST API docs](${SITE_URL}/connect/docs) · [OpenAPI](${SITE_URL}/api/v1/openapi)
- OAuth discovery: ${SITE_URL}/.well-known/oauth-authorization-server

## Prompt categories

${categories}

## Full documentation

- [llms-full.txt](${SITE_URL}/llms-full.txt): expanded English documentation of all five modes and the platform

## Organization

- Peroot is built by JoyaTech (Gal Sasson), Haifa, Israel. Contact: ${SITE_URL}/contact
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

import { NextResponse } from "next/server";
import { escapePostgrestValue } from "@/lib/sanitize";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
import { withUser } from "@/lib/api-middleware";
import { searchGuideSections } from "@/lib/site-search/guide-index";
import type { SiteSearchHit, SiteSearchResponse } from "@/lib/site-search/types";

const PER_BUCKET = 6;
const MAX_PER_BUCKET = 8;
const MIN_QUERY_LEN = 2;

function clientIp(req: { headers: Headers }): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function isTemplatePrompt(promptText: string | null | undefined): boolean {
  if (!promptText) return false;
  return /\{[^}]+\}/.test(promptText);
}

/**
 * GET /api/site-search?q=...&limit=6
 *
 * Guests: blog posts only (+ metadata for UI CTA).
 * Authenticated: blog, guide sections, public library (+ templates), personal library.
 *
 * withUser owns auth only (allowGuest). Rate-limiting stays in the handler
 * because it must run *after* the short-query / empty-sanitize early returns —
 * trivial queries must not consume a user's search quota. Guest bucket is keyed
 * by IP, user bucket by user id.
 */
export const GET = withUser(
  async (request, ctx) => {
    try {
      const { searchParams } = request.nextUrl;
      const rawQ = searchParams.get("q")?.trim() ?? "";
      const limitParam = parseInt(searchParams.get("limit") ?? "", 10);
      const perBucket = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 1), MAX_PER_BUCKET)
        : PER_BUCKET;

      const user = ctx.user;
      const supabase = ctx.db;

      if (rawQ.length < MIN_QUERY_LEN) {
        return NextResponse.json({
          results: [],
          guestRestricted: false,
        } satisfies SiteSearchResponse);
      }

      const sanitized = escapePostgrestValue(rawQ);
      if (!sanitized) {
        return NextResponse.json({
          results: [],
          guestRestricted: !user,
        } satisfies SiteSearchResponse);
      }

      // Rate limit only real queries (after the early returns above).
      const rate = user
        ? await checkRateLimit(user.id, "siteSearchUser")
        : await checkRateLimit(clientIp(request), "siteSearchGuest");
      if (!rate.success) {
        return NextResponse.json(
          { error: "יותר מדי בקשות חיפוש. נסו שוב בעוד רגע." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) },
          },
        );
      }

      const pattern = `%${sanitized}%`;
      const results: SiteSearchHit[] = [];

      // ─── Blog (everyone) ─────────────────────────────────────────────────────
      const { data: blogRows, error: blogErr } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, category")
        .eq("status", "published")
        .or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
        .order("published_at", { ascending: false })
        .limit(perBucket);

      if (blogErr) {
        logger.error("[site-search] blog error:", blogErr);
      } else {
        for (const row of blogRows ?? []) {
          results.push({
            id: `blog:${row.slug}`,
            source: "blog",
            title: row.title,
            subtitle: row.excerpt?.slice(0, 120) || row.category || undefined,
            href: `/blog/${row.slug}`,
          });
        }
      }

      if (!user) {
        const response: SiteSearchResponse = {
          results,
          guestRestricted: true,
          loginCta: "התחברו או הירשמו כדי לחפש בפרומפטים, במדריך, בתבניות ובספרייה האישית.",
        };
        return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
      }

      // ─── Authenticated: favorites sets for badges ─────────────────────────────
      const { data: favRows } = await supabase
        .from("prompt_favorites")
        .select("item_type, item_id")
        .eq("user_id", user.id);

      const favLibrary = new Set(
        (favRows ?? []).filter((f) => f.item_type === "library").map((f) => f.item_id),
      );
      const favPersonal = new Set(
        (favRows ?? []).filter((f) => f.item_type === "personal").map((f) => f.item_id),
      );

      // ─── Guide (static) ───────────────────────────────────────────────────────
      for (const section of searchGuideSections(rawQ).slice(0, perBucket)) {
        results.push({
          id: `guide:${section.id}`,
          source: "guide",
          title: section.label,
          subtitle: "מדריך כתיבת פרומפטים",
          href: `/guide#${section.id}`,
        });
      }

      // ─── Public library ───────────────────────────────────────────────────────
      const { data: pubRows, error: pubErr } = await supabase
        .from("public_library_prompts")
        .select("id, title, use_case, prompt, category_id")
        .eq("is_active", true)
        .or(`title.ilike.${pattern},use_case.ilike.${pattern},prompt.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(perBucket);

      if (pubErr) {
        logger.error("[site-search] public library error:", pubErr);
      } else {
        for (const row of pubRows ?? []) {
          const template = isTemplatePrompt(row.prompt);
          results.push({
            id: row.id,
            source: template ? "template" : "public_prompt",
            title: row.title,
            subtitle: row.use_case || row.category_id || undefined,
            href: template ? "/templates" : "/prompts",
            isFavorite: favLibrary.has(row.id),
          });
        }
      }

      // ─── Personal library ─────────────────────────────────────────────────────
      const { data: personalRows, error: personalErr } = await supabase
        .from("personal_library")
        .select("id, title, use_case")
        .eq("user_id", user.id)
        .or(`title.ilike.${pattern},use_case.ilike.${pattern},prompt.ilike.${pattern}`)
        .order("updated_at", { ascending: false })
        .limit(perBucket);

      if (personalErr) {
        logger.error("[site-search] personal library error:", personalErr);
      } else {
        for (const row of personalRows ?? []) {
          results.push({
            id: row.id,
            source: "personal",
            title: row.title,
            subtitle: row.use_case || "ספרייה אישית",
            href: "/",
            isFavorite: favPersonal.has(row.id),
          });
        }
      }

      // De-dupe by id+source
      const seen = new Set<string>();
      const deduped = results.filter((r) => {
        const k = `${r.source}:${r.id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      return NextResponse.json(
        { results: deduped, guestRestricted: false } satisfies SiteSearchResponse,
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch (err) {
      logger.error("[site-search] critical:", err);
      return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    }
  },
  { rateLimit: "none", allowGuest: true },
);

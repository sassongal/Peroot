import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";
import { PROMPT_TEMPLATE_COUNT } from "@/lib/constants";
import { LANGUAGE_ALTERNATES } from "@/lib/landing/language-landings";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט): מחולל פרומפטים בעברית חינם ל-ChatGPT ו-Claude",
  description: `מחולל הפרומפטים שהופך כל רעיון גולמי לפרומפט מדויק, עם ציון איכות, ${PROMPT_TEMPLATE_COUNT} תבניות מוכנות ו-5 מצבי יצירה. תוצאות חדות יותר ב-ChatGPT, Claude ו-Gemini, בעברית ובחינם.`,
  // The Hebrew home is the he-IL and x-default member of the hreflang
  // cluster. Page metadata replaces the layout's alternates wholesale, so
  // the map has to be repeated here or the landings point at a page that
  // never points back, and Google drops the whole cluster.
  alternates: { canonical: "/", languages: LANGUAGE_ALTERNATES },
};

export default function HomePage() {
  return (
    <div>
      {/* The interactive app renders first — the tool IS the hero. The SEO/marketing
          content flows below it, VISIBLE to everyone (crawlers included): hiding it
          with display:none/opacity:0 made the homepage empty under mobile-first
          indexing and tripped the hidden-text pattern. */}
      <HomeClient />
      {/* softwareAppSchema is rendered inside HomeSEOContent - no duplicate needed here */}
      <HomeSEOContent />
      <RecentBlogPosts />
    </div>
  );
}

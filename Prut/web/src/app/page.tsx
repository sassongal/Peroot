import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";
import { JsonLd } from "@/components/seo/JsonLd";
import { softwareAppSchema } from "@/lib/schema";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט) — מחולל פרומפטים בעברית | חינם ל-ChatGPT ו-Claude",
  description:
    "הנדסת פרומפטים בעברית בחינם. Peroot משדרג כל פרומפט למבנה מקצועי עם דירוג איכות — תוצאות טובות יותר ב-ChatGPT, Claude, Gemini ו-Midjourney. נסו עכשיו.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home-page-root">
      <JsonLd data={softwareAppSchema()} />
      <HomeSEOContent />
      <HomeClient />
      <RecentBlogPosts />
    </div>
  );
}

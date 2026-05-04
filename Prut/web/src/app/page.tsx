import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט) — מחולל פרומפטים בעברית | חינם ל-ChatGPT ו-Claude",
  description:
    "לכתוב פרומפטים טובים יותר בשניות. Peroot משדרג כל פרומפט למבנה מקצועי עם דירוג איכות — תוצאות טובות יותר ב-ChatGPT, Claude, Gemini ו-Midjourney. חינם.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home-page-root">
      {/* softwareAppSchema is rendered inside HomeSEOContent — no duplicate needed here */}
      <HomeSEOContent />
      <HomeClient />
      <RecentBlogPosts />
    </div>
  );
}

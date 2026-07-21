import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט): מחולל פרומפטים בעברית חינם ל-ChatGPT ו-Claude",
  description:
    "מחולל הפרומפטים שהופך כל רעיון גולמי לפרומפט מדויק, עם ציון איכות, 540+ תבניות מוכנות ו-5 מצבי יצירה. תוצאות חדות יותר ב-ChatGPT, Claude ו-Gemini, בעברית ובחינם.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="home-page-root">
      {/* softwareAppSchema is rendered inside HomeSEOContent - no duplicate needed here */}
      <HomeSEOContent />
      <HomeClient />
      <RecentBlogPosts />
    </div>
  );
}

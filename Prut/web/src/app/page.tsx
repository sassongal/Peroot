import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";
import { HeroSection } from "@/components/home/HeroSection";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט) - מחולל פרומפטים מקצועי בעברית",
  description:
    "שדרגו את הפרומפטים שלכם עם AI. Peroot מנתח, משפר ומייעל פרומפטים לכל מודל שפה - ChatGPT, Claude, Gemini ועוד. חינם ובעברית.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <HomeSEOContent />
      <HeroSection />
      <HomeClient />
      <RecentBlogPosts />
    </>
  );
}

import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";
import { RecentBlogPosts } from "@/components/home/RecentBlogPosts";
import { JsonLd } from "@/components/seo/JsonLd";
import { softwareAppSchema } from "@/lib/schema";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Peroot (פירוט) - מחולל פרומפטים מקצועי בעברית",
  description:
    "שדרגו את הפרומפטים שלכם עם AI. Peroot מנתח, משפר ומייעל פרומפטים לכל מודל שפה - ChatGPT, Claude, Gemini ועוד. חינם ובעברית.",
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

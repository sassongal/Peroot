import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";

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
      <HomeClient />
    </>
  );
}

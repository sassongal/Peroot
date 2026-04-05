import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const metadata: Metadata = {
  title: "תבניות פרומפטים | Peroot - תבניות AI מוכנות בעברית",
  description:
    "תבניות פרומפטים מוכנות לשימוש בעברית, חינם. בחרו תבנית, מלאו את המשתנים, וקבלו פרומפט מושלם בשניות עבור ChatGPT, Claude ו-Gemini.",
  alternates: {
    canonical: "/templates",
    languages: { "he-IL": "/templates" },
  },
  openGraph: {
    title: "תבניות פרומפטים מוכנות | Peroot",
    description:
      "עשרות תבניות פרומפטים מוכנות בעברית עם משתנים להתאמה אישית. בחרו, מלאו והעתיקו - חינם.",
    url: `${SITE_URL}/templates`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/assets/branding/logo.png`,
        width: 1200,
        height: 630,
        alt: "תבניות פרומפטים - Peroot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "תבניות פרומפטים מוכנות | Peroot",
    description:
      "תבניות פרומפטים בעברית עם משתנים - בחרו, מלאו, העתיקו. חינם.",
    images: [`${SITE_URL}/assets/branding/logo.png`],
  },
  robots: { index: true, follow: true },
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

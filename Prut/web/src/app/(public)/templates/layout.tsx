import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const metadata: Metadata = {
  title: "תבניות פרומפטים בעברית מוכנות למילוי, חינם",
  description:
    "תבניות פרומפטים מוכנות בעברית עם שדות למילוי, בחינם. בחרו תבנית, מלאו את המשתנים, וקבלו פרומפט מושלם בשניות עבור ChatGPT, Claude ו-Gemini.",
  alternates: {
    canonical: "/templates",
    languages: { "he-IL": "/templates" },
  },
  openGraph: {
    title: "תבניות פרומפטים בעברית מוכנות למילוי | Peroot",
    description:
      "עשרות תבניות פרומפטים בעברית עם משתנים להתאמה אישית. בחרו, מלאו את השדות והעתיקו פרומפט מוכן, בחינם.",
    url: `${SITE_URL}/templates`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/assets/branding/logo.png`,
        width: 1200,
        height: 630,
        alt: "תבניות פרומפטים בעברית | Peroot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "תבניות פרומפטים בעברית מוכנות למילוי | Peroot",
    description: "תבניות פרומפטים בעברית עם משתנים: בחרו, מלאו את השדות והעתיקו. חינם.",
    images: [`${SITE_URL}/assets/branding/logo.png`],
  },
  robots: { index: true, follow: true },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

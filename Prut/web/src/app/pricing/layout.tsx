import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תוכניות ומחירים - Peroot",
  description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro. השוואת תוכניות: חינם, Pro חודשי ו-Pro שנתי.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "תוכניות ומחירים - Peroot",
    description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro. השוואת תוכניות: חינם, Pro חודשי ו-Pro שנתי.",
    url: "/pricing",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "תוכניות ומחירים - Peroot",
    description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { LanguageLanding } from "@/components/landing/LanguageLanding";
import { LANDINGS, LANGUAGE_ALTERNATES } from "@/lib/landing/language-landings";

const c = LANDINGS.ru;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: c.title,
  description: c.description,
  alternates: { canonical: "/ru", languages: LANGUAGE_ALTERNATES },
  openGraph: {
    title: c.title,
    description: c.description,
    url: "/ru",
    siteName: "Peroot",
    locale: c.ogLocale,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: c.title, description: c.description },
  other: { "content-language": "ru" },
};

export default function Page() {
  return <LanguageLanding locale="ru" />;
}

import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { FAQSchema } from "@/components/features/faq/FAQSchema";
import { GlobalContextWrapper } from "@/components/layout/GlobalContextWrapper";

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  variable: "--font-frank",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-jb-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://peroot.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Peroot (פירוט) - מחולל פרומפטים מקצועי בעברית",
    template: "%s | Peroot"
  },
  description:
    "הפכו רעיונות לפרומפטים מדויקים עבור ChatGPT, Claude, ו-Gemini. המערכת של Peroot משדרגת כל פרומפט עם מבנה מקצועי, שאלות מיקוד ודירוג איכות בזמן אמת.",
  applicationName: "Peroot",
  authors: [{ name: "JoyaTech", url: "https://joya-tech.net" }],
  generator: "Next.js",
  keywords: [
    "פרומפטים",
    "פרומפט בעברית",
    "מחולל פרומפטים",
    "שיפור פרומפט",
    "Prompt Engineering",
    "AI בעברית",
    "כתיבת פרומפטים",
    "ChatGPT בעברית",
    "Claude בעברית",
    "מידג'רני בעברית",
    "אופטימיזציה לפרומפט",
    "פרומפט ל-LLM",
    "Peroot",
    "פירוט"
  ],
  referrer: "origin-when-cross-origin",
  creator: "Gal Sasson",
  publisher: "JoyaTech",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Peroot (פירוט) - מחולל פרומפטים מקצועי בעברית",
    description:
      "הכלי המתקדם בישראל ליצירה ושיפור של פרומפטים. שדרגו את התוצאות שלכם ב-AI עם מבנה חכם, הקשר מדויק ושאלות הכוונה.",
    url: siteUrl,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/assets/branding/logo.png",
        width: 1200,
        height: 630,
        alt: "Peroot AI Prompt Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peroot (פירוט) - שדרוג פרומפטים ב-AI",
    description:
      "כתבו פרומפטים טובים יותר בשניות. המערכת היחידה שמותאמת במיוחד לשפה העברית ולמודלים המובילים.",
    images: ["/assets/branding/logo.png"],
    creator: "@joyatech",
  },
  appleWebApp: {
    capable: true,
    title: "Peroot",
    statusBarStyle: "black-translucent",
  },
};

import { getDictionary } from "@/lib/i18n/get-dictionary";
import { I18nProvider } from "@/context/I18nContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default to Hebrew for now. 
  // Future: Detect from URL or cookie
  const locale = 'he';
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} className="dark">
      <body
        className={`${frankRuhl.variable} ${heebo.variable} ${ibmPlexMono.variable} antialiased min-h-screen relative`}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <a href="#main-content" className="skip-link" suppressHydrationWarning>
            דלג לתוכן הראשי
          </a>
          <div className="noise-overlay" />
          <FAQSchema />
          <I18nProvider dictionary={dictionary}>
            <GlobalContextWrapper>
              {children}
            </GlobalContextWrapper>
          </I18nProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

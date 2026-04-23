import type { Metadata } from "next";
import { Suspense } from "react";

import { Frank_Ruhl_Libre, Alef, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { GlobalContextWrapper } from "@/components/layout/GlobalContextWrapper";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { createClient } from "@/lib/supabase/server";

const frankRuhl = Frank_Ruhl_Libre({
  weight: ["400", "700"],
  subsets: ["hebrew", "latin"],
  variable: "--font-frank",
  display: "swap",
});

const alef = Alef({
  weight: ["400", "700"],
  subsets: ["hebrew", "latin"],
  variable: "--font-alef",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-jb-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peroot.space";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Peroot (פירוט) - מחולל פרומפטים מקצועי בעברית",
    template: "%s | Peroot",
  },
  description:
    "הפכו רעיונות לפרומפטים מדויקים עבור ChatGPT, Claude, ו-Gemini. המערכת של Peroot משדרגת כל פרומפט עם מבנה מקצועי, שאלות מיקוד ודירוג איכות בזמן אמת.",
  applicationName: "Peroot",
  authors: [{ name: "JoyaTech", url: "https://joya-tech.net" }],
  generator: "Next.js",
  keywords: [
    "מחולל פרומפטים",
    "פרומפטים בעברית",
    "Peroot",
    "פירוט",
    "prompt engineering",
    "AI בעברית",
    "שיפור פרומפטים",
    "ChatGPT בעברית",
    "Claude בעברית",
    "Gemini בעברית",
    "פרומפט לתמונות",
    "Midjourney פרומפט",
    "prompt generator",
    "AI prompt builder Israel",
    "בינה מלאכותית בעברית",
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
    types: {
      "application/rss+xml": "/feed.xml",
    },
    languages: {
      "he-IL": "/",
      "x-default": "/",
    },
  },
  other: {
    "geo.region": "IL",
    "geo.placename": "Israel",
    "geo.position": "32.0853;34.7818",
    ICBM: "32.0853, 34.7818",
    "content-language": "he",
    "llms.txt": "/llms.txt",
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
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Peroot - מחולל פרומפטים מקצועי בעברית",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peroot (פירוט) - שדרוג פרומפטים ב-AI",
    description:
      "כתבו פרומפטים טובים יותר בשניות. המערכת היחידה שמותאמת במיוחד לשפה העברית ולמודלים המובילים.",
    images: [`${siteUrl}/og-image.jpg`],
    creator: "@joyatech",
  },
  appleWebApp: {
    capable: true,
    title: "Peroot",
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  verification: {
    // ⚠️ IMPORTANT: Replace with your Google Search Console verification token before production!
    // Get it from: https://search.google.com/search-console → Settings → Ownership verification
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
  },
};

import { getDictionary } from "@/lib/i18n/get-dictionary";
import { I18nProvider } from "@/context/I18nContext";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { VercelAnalytics } from "@/components/providers/VercelAnalytics";
import { ServiceWorkerRegistration } from "@/components/providers/ServiceWorkerRegistration";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

import { Footer } from "@/components/layout/Footer";
import { DeferredWidgets, DeferredCookieConsent } from "@/components/layout/DeferredWidgets";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "he";
  const [dictionary, initialUser] = await Promise.all([
    getDictionary(locale),
    createClient()
      .then((sb) => sb.auth.getUser())
      .then(({ data }) => data.user)
      .catch(() => null),
  ]);

  return (
    <html
      lang={locale}
      dir={locale === "he" ? "rtl" : "ltr"}
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          href="/_next/image?url=%2FPeroot-hero.png&w=384&q=75"
          as="image"
          fetchPriority="high"
          type="image/avif"
        />
        {/* Inline blocking script — intentionally NOT using next/script.
            Must execute synchronously before first paint to read the saved
            theme class from localStorage and apply it, preventing a flash of
            wrong-theme content (FOUC). Content is a static string, not
            user-controlled, so dangerouslySetInnerHTML is safe here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('peroot-theme');if(t)document.documentElement.classList.add(t)}catch(e){}`,
          }}
        />
        {/* PWA Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-iphone.webp"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-iphone-pro.webp"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-ipad.webp"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body
        className={`${frankRuhl.variable} ${alef.variable} ${ibmPlexMono.variable} antialiased min-h-screen relative flex flex-col overflow-x-hidden`}
        suppressHydrationWarning
      >
        <DeferredWidgets />
        <VercelAnalytics />
        <ServiceWorkerRegistration />
        <PostHogProvider>
          <a href="#main-content" className="skip-link" suppressHydrationWarning>
            {locale === "he" ? "דלג לתוכן הראשי" : "Skip to main content"}
          </a>
          <JsonLd data={organizationSchema()} />
          <JsonLd data={webSiteSchema()} />
          <ThemeProvider>
            <QueryProvider>
              <I18nProvider dictionary={dictionary} lang={locale}>
                <Suspense
                  fallback={
                    <div className="grow flex items-center justify-center min-h-screen">
                      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                  }
                >
                  <GlobalContextWrapper initialUser={initialUser}>
                    <ErrorBoundary name="AppRoot">
                      <main id="main-content" className="grow">
                        {children}
                      </main>
                    </ErrorBoundary>
                    <Footer />
                  </GlobalContextWrapper>
                </Suspense>
              </I18nProvider>
            </QueryProvider>
          </ThemeProvider>
          <DeferredCookieConsent />
        </PostHogProvider>
      </body>
    </html>
  );
}

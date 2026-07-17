import type { Metadata } from "next";

import { Varela_Round, Alef, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { GlobalContextWrapper } from "@/components/layout/GlobalContextWrapper";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const varelaRound = Varela_Round({
  weight: "400",
  subsets: ["hebrew", "latin"],
  variable: "--font-varela",
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
    default: "Peroot (פירוט) — מחולל פרומפטים בעברית | חינם ל-ChatGPT ו-Claude",
    template: "%s | Peroot",
  },
  description:
    "הנדסת פרומפטים בעברית בחינם. Peroot משדרג כל פרומפט למבנה מקצועי עם דירוג איכות — תוצאות טובות יותר ב-ChatGPT, Claude, Gemini ו-Midjourney.",
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
    "לכתוב פרומפטים",
    "איך לכתוב פרומפט",
    "תבניות פרומפטים",
    "ChatGPT בעברית",
    "Claude בעברית",
    "Gemini בעברית",
    "פרומפט לתמונות",
    "פרומפטים לשיווק",
    "פרומפטים לפיתוח",
    "בניית סוכן AI",
    "Midjourney פרומפט",
    "prompt generator",
    "AI prompt builder Israel",
    "בינה מלאכותית בעברית",
    "הנדסת פרומפטים",
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
    title: "Peroot (פירוט) — הנדסת פרומפטים בעברית בחינם",
    description:
      "מחולל פרומפטים מקצועיים לכל מודל AI. שדרוג אוטומטי עם דירוג איכות, 480+ תבניות מוכנות, תמיכה מלאה בעברית. חינם.",
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
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SentryUserProvider } from "@/components/providers/SentryUserProvider";

import { Footer } from "@/components/layout/Footer";
import { DeferredWidgets, DeferredCookieConsent } from "@/components/layout/DeferredWidgets";
import { A11yWidget } from "@/components/ui/A11yWidget";
import { A11Y_BOOTSTRAP_SCRIPT } from "@/lib/a11y-prefs";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "he";
  // Mirror the proxy.ts cookie predicate: only refresh the session for
  // authenticated visitors. Guests have no token to refresh, so skipping the
  // Supabase round-trip saves ~500–1000ms of TTFB on cold homepage loads.
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  const [dictionary, initialUser] = await Promise.all([
    getDictionary(locale),
    hasAuthCookie
      ? createClient()
          .then((sb) => sb.auth.getUser())
          .then(({ data }) => data.user)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <html
      lang={locale}
      dir={locale === "he" ? "rtl" : "ltr"}
      className="dark"
      suppressHydrationWarning
    >
      <head>
        {/* hreflang — explicitly rendered here because Next.js App Router's
            metadata.alternates.languages is silently dropped when the page
            segment re-declares alternates.canonical without languages. */}
        <link rel="alternate" hrefLang="he-IL" href={`${siteUrl}/`} />
        <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/`} />
        {/* Hero image preload is generated automatically by next/image
            with priority={true} on HomeViewChrome.tsx. A manual <link
            rel="preload"> here previously hardcoded the wrong width
            (w=270 vs the actual w=640 fetched at standard viewports),
            so the browser couldn't reuse it and double-fetched the
            hero. Removing it lets next/image emit a preload that
            matches the actual responsive variant. */}
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
        {/* Accessibility preferences FOUC prevention — applies saved a11y CSS
            classes synchronously before first paint so users on high-contrast
            or large-text settings never see a flash of unstyled content. */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOTSTRAP_SCRIPT }} />
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
        className={`${varelaRound.variable} ${alef.variable} ${ibmPlexMono.variable} antialiased min-h-screen relative flex flex-col overflow-x-hidden`}
        suppressHydrationWarning
      >
        <DeferredWidgets />
        <VercelAnalytics />
        <ServiceWorkerRegistration />
        <SentryUserProvider />
        <A11yWidget />
        <PostHogProvider>
          <a href="#main-content" className="skip-link" suppressHydrationWarning>
            {locale === "he" ? "דלג לתוכן הראשי" : "Skip to main content"}
          </a>
          <JsonLd data={organizationSchema()} />
          <JsonLd data={webSiteSchema()} />
          <ThemeProvider>
            <QueryProvider>
              <I18nProvider dictionary={dictionary} lang={locale}>
                <GlobalContextWrapper initialUser={initialUser}>
                  <ConfirmProvider>
                    <ErrorBoundary name="AppRoot">
                      <main id="main-content" className="grow min-h-[100dvh]">
                        {children}
                      </main>
                    </ErrorBoundary>
                    <Footer />
                  </ConfirmProvider>
                </GlobalContextWrapper>
              </I18nProvider>
            </QueryProvider>
          </ThemeProvider>
          <DeferredCookieConsent />
        </PostHogProvider>
      </body>
    </html>
  );
}

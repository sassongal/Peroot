import type { Metadata } from "next";

import { Varela_Round, Alef, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { GlobalContextWrapper } from "@/components/layout/GlobalContextWrapper";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PROMPT_TEMPLATE_COUNT } from "@/lib/constants";

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
    default: "Peroot (פירוט): מחולל פרומפטים בעברית חינם ל-ChatGPT ו-Claude",
    template: "%s | Peroot",
  },
  description: `מחולל הפרומפטים שהופך כל רעיון גולמי לפרומפט מדויק, עם ציון איכות, ${PROMPT_TEMPLATE_COUNT} תבניות מוכנות ו-5 מצבי יצירה. תוצאות חדות יותר ב-ChatGPT, Claude ו-Gemini, בעברית ובחינם.`,
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
    title: "Peroot (פירוט): מחולל הפרומפטים שמדבר עברית",
    description: `כל רעיון הופך לפרומפט מקצועי בעברית: ציון איכות, ${PROMPT_TEMPLATE_COUNT} תבניות ו-5 מצבי יצירה ל-ChatGPT, Claude, Gemini ו-Midjourney. בלי ניחושים, בחינם.`,
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
    title: "Peroot (פירוט): פרומפטים שעובדים, בעברית",
    description: `פרומפט אחד טוב במקום עשרה ניסיונות. מחולל פרומפטים בעברית עם ציון איכות ו-${PROMPT_TEMPLATE_COUNT} תבניות, מותאם ל-ChatGPT, Claude ו-Gemini.`,
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
import { getQuotaPolicy } from "@/lib/quota-server";
import { QuotaPolicyProvider } from "@/context/QuotaPolicyContext";
import { A11Y_BOOTSTRAP_SCRIPT } from "@/lib/a11y-prefs";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = "he";
  // NOTHING request-scoped may be read here.
  //
  // This layout wraps every route, so a single `cookies()` call in it opted the
  // WHOLE APP out of static rendering: 197 of 204 routes rendered on demand,
  // every `revalidate` was dead, and every content page served
  // `x-vercel-cache: MISS`. Removing the read moves 50 routes to static
  // (measured, build route table before/after), which is the difference between
  // a CDN hit and a cold render on the pages search engines actually crawl.
  //
  // The user is resolved client-side instead, by AuthProvider. That costs
  // signed-in visitors one `getUser()` round-trip; guests already paid it,
  // since `initialUser` was null for them anyway. UserMenu renders nothing
  // until mounted, so the visible chrome does not flip.
  //
  // To restore SSR auth without losing static rendering, the app needs PPR.
  // In Next 16 that is `cacheComponents`, which requires migrating every
  // `export const revalidate` / `runtime` route to `"use cache"` first
  // (16 files) — a separate piece of work.
  // Public, near-static data with no request scope, so it does not opt the
  // layout out of static rendering. Resolving it here means the quota numbers
  // in marketing copy cost the client nothing.
  const [dictionary, quotaPolicy] = await Promise.all([getDictionary(locale), getQuotaPolicy()]);
  const initialUser = null;

  return (
    <html
      lang={locale}
      dir={locale === "he" ? "rtl" : "ltr"}
      className="dark"
      suppressHydrationWarning
    >
      <head>
        {/* hreflang: rendered ONLY by per-route metadata.alternates. A previous
            sitewide <link rel="alternate"> pair here pointed every page's he-IL
            and x-default at the HOMEPAGE, conflicting with the per-page values
            and invalidating the whole hreflang cluster. The site is single-
            language (he); per-page self-referencing alternates are sufficient. */}
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
            wrong-theme content (FOUC).

            It has to REMOVE the other class, not just add its own. The server
            renders <html className="dark">, so an add-only script left a light
            mode user on `class="dark light"`: `.dark` carries the dark palette
            and `.light` matches nothing (the light palette lives on bare
            :root), so the page painted dark until the React effect caught up.
            Observed in production as a dark blog page under a light setting.

            Content is a static string, not user-controlled, so
            dangerouslySetInnerHTML is safe here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('peroot-theme');var r=document.documentElement;if(t==='light'){r.classList.remove('dark');r.classList.add('light')}else if(t==='dark'){r.classList.remove('light');r.classList.add('dark')}}catch(e){}`,
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
                <QuotaPolicyProvider value={quotaPolicy}>
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
                </QuotaPolicyProvider>
              </I18nProvider>
            </QueryProvider>
          </ThemeProvider>
          <DeferredCookieConsent />
        </PostHogProvider>
      </body>
    </html>
  );
}

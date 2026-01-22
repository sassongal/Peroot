import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopLogo } from "@/components/layout/top-logo";
import { FAQSchema } from "@/components/features/faq/FAQSchema";

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
  title: "Peroot (פירוט) - מחולל פרומפטים בעברית",
  description:
    "Peroot הופך רעיונות גולמיים לפרומפטים מדויקים: מבנה ברור, שאלות מיקוד, ודירוג חוזק בזמן אמת.",
  keywords: [
    "פרומפטים",
    "פרומפט בעברית",
    "מחולל פרומפטים",
    "שיפור פרומפט",
    "Prompt Engineering",
    "AI בעברית",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Peroot (פירוט) - מחולל פרומפטים בעברית",
    description:
      "שדרגו רעיונות לפרומפטים מקצועיים בעזרת מבנה חכם ושאלות מיקוד מותאמות.",
    url: siteUrl,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/assets/branding/logo.png",
        width: 1200,
        height: 630,
        alt: "Peroot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peroot (פירוט) - מחולל פרומפטים בעברית",
    description:
      "פרומפטים מדויקים בעברית, דירוג חוזק, ודלתות מהירות לשיפור.",
    images: ["/assets/branding/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body
        className={`${frankRuhl.variable} ${heebo.variable} ${ibmPlexMono.variable} antialiased min-h-screen relative`}
        suppressHydrationWarning
      >
        <a href="#main-content" className="skip-link">
          דלג לתוכן הראשי
        </a>
        <div className="noise-overlay" />
        <TopLogo />
        <FAQSchema />
        {children}
      </body>
    </html>
  );
}

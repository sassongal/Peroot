import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopLogo } from "@/components/layout/top-logo";

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

export const metadata: Metadata = {
  title: "Peroot (פירוט) - Professional Prompt Engineering",
  description: "Turn raw ideas into professional AI prompts in seconds.",
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
        <div className="noise-overlay" />
        <TopLogo />
        {children}
      </body>
    </html>
  );
}

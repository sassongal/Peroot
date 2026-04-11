import type { Metadata } from "next";
import { SpeedTestClient } from "./SpeedTestClient";

export const metadata: Metadata = {
  title: "בדיקת מהירות אתר",
  description: "בדוק את מהירות האתר שלך עם Google PageSpeed Insights - ציוני ביצועים, נגישות, SEO ושיטות עבודה מומלצות.",
  alternates: { canonical: "/speed-test" },
  robots: { index: false },
};

export default function SpeedTestPage() {
  return (
    <main className="min-h-screen bg-(--surface-body) text-(--text-primary) font-sans p-6 md:p-12" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          בדיקת מהירות אתר
        </h1>
        <p className="text-(--text-muted) mb-8">
          Google PageSpeed Insights — ציוני ביצועים, Core Web Vitals והמלצות לשיפור
        </p>
        <SpeedTestClient />
      </div>
    </main>
  );
}

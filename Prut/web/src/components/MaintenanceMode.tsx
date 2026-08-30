"use client";

import Image from "next/image";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function MaintenancePage() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl text-center space-y-6">
        {/* Brand — the gold wordmark (this page IS the site while it's down) */}
        <div className="flex justify-center mb-8">
          <Image
            src="/Peroot-hero.webp"
            alt="פירוט"
            width={720}
            height={316}
            className="w-full max-w-[280px] h-auto"
            priority
          />
        </div>

        {/* Content */}
        <h1 className="text-5xl font-bold text-white mb-4">{settings.site_name} במצב תחזוקה</h1>

        <p className="text-xl text-slate-300 mb-8">אנחנו משדרגים את המערכת כרגע. נחזור בקרוב!</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-slate-400">לעדכונים או שאלות, צרו קשר:</p>
          <a
            href={`mailto:${settings.contact_email}`}
            className="text-blue-400 hover:text-blue-300 text-lg font-medium mt-2 inline-block"
          >
            {settings.contact_email}
          </a>
        </div>

        {/* Animation */}
        <div className="flex justify-center gap-2 pt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

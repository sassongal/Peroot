"use client";

import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MaintenanceMode() {
  const { settings, loading } = useSiteSettings();
  const router = useRouter();

  useEffect(() => {
    if (!loading && settings.maintenance_mode) {
      // Redirect to maintenance page
      router.push('/maintenance');
    }
  }, [settings.maintenance_mode, loading, router]);

  return null;
}

export function MaintenancePage() {
  const { settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8" dir="rtl">
      <div className="max-w-2xl text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 blur-2xl absolute inset-0" />
            <div className="relative w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center">
              <svg className="w-16 h-16 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-5xl font-bold text-white mb-4">
          {settings.site_name} במצב תחזוקה
        </h1>
        
        <p className="text-xl text-slate-300 mb-8">
          אנחנו משדרגים את המערכת כרגע. נחזור בקרוב!
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-sm text-slate-400">
            לעדכונים או שאלות, צרו קשר:
          </p>
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

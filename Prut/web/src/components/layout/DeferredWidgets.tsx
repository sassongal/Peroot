"use client";

import dynamic from "next/dynamic";

const GoogleAnalytics = dynamic(() => import("@/components/providers/GoogleAnalytics").then(m => m.GoogleAnalytics), { ssr: false, loading: () => null });
const MicrosoftClarity = dynamic(() => import("@/components/providers/MicrosoftClarity").then(m => m.MicrosoftClarity), { ssr: false, loading: () => null });
const SplashScreen = dynamic(() => import("@/components/ui/SplashScreen").then(m => m.SplashScreen), { ssr: false, loading: () => null });
const PwaInstallBanner = dynamic(() => import("@/components/ui/PwaInstallBanner").then(m => m.PwaInstallBanner), { ssr: false, loading: () => null });
const CookieConsent = dynamic(() => import("@/components/ui/CookieConsent").then(m => m.CookieConsent), { ssr: false, loading: () => null });

export function DeferredWidgets() {
  return (
    <>
      <GoogleAnalytics />
      <MicrosoftClarity />
      <SplashScreen />
      <PwaInstallBanner />
    </>
  );
}

export function DeferredCookieConsent() {
  return <CookieConsent />;
}

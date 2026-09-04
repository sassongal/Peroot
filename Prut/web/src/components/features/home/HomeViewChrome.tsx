"use client";

import React, { memo } from "react";
import NextImage from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { DiscoveryTip } from "@/hooks/useFeatureDiscovery";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then((mod) => mod.FAQBubble),
  {
    ssr: false,
    loading: () => <div className="animate-pulse rounded-full bg-(--glass-bg) w-12 h-12" />,
  },
);
const FeatureDiscoveryTooltip = dynamic(
  () =>
    import("@/components/ui/FeatureDiscoveryTooltip").then((mod) => mod.FeatureDiscoveryTooltip),
  { ssr: false, loading: () => null },
);
const LoginRequiredModal = dynamic(
  () => import("@/components/ui/LoginRequiredModal").then((mod) => mod.LoginRequiredModal),
  { ssr: false, loading: () => null },
);
const OnboardingOverlay = dynamic(
  () => import("@/components/ui/OnboardingOverlay").then((mod) => mod.OnboardingOverlay),
  { ssr: false, loading: () => null },
);
const DidYouKnowBanner = dynamic(
  () => import("@/components/ui/DidYouKnowBanner").then((mod) => mod.DidYouKnowBanner),
  { ssr: false, loading: () => <div className="h-[48px]" /> },
);
// "מה חדש" and "הידעת?" share one row under the task area, each in its own
// box (owner decision, 2026-09-04); stacked on phones. Never above the task
// area, never a ticker.
const WhatsNewBanner = dynamic(
  () => import("@/components/ui/WhatsNewBanner").then((mod) => mod.WhatsNewBanner),
  { ssr: false, loading: () => null },
);

/** Subset of useFeatureDiscovery() return value needed for rendering */
interface FeatureDiscoveryRenderProps {
  visible: boolean;
  currentTip: DiscoveryTip | null;
  currentIndex: number;
  totalTips: number;
  nextTip: () => void;
  dismiss: () => void;
}

interface HomeViewChromeProps {
  // View / navigation
  viewMode: string;
  onTabChange: (tab: string) => void;

  // Feature discovery
  discovery: FeatureDiscoveryRenderProps;
  onDiscoveryCtaClick: (action: string) => void;

  // Loading state
  isLoading: boolean;
  hasCompletion: boolean;

  // Login Required modal
  isLoginRequiredModalOpen: boolean;
  onCloseLoginRequired: () => void;
  loginRequiredConfig: { title?: string; message?: string; feature?: string };

  // Onboarding
  showOnboarding: boolean;
  user: unknown;
  /** Pro subscriber, so a note aimed at Pro users reaches them. */
  isPro?: boolean;
  onOnboardingComplete: (data: { role: string; goal: string }) => void;

  // Fixed overlays (sidebar drawer, mobile FAQ panel) — rendered as siblings of the main content div
  overlays?: React.ReactNode;

  // Content slot — rendered inside the main content area
  children: React.ReactNode;
}

function HomeViewChromeInner({
  viewMode,
  onTabChange,
  discovery,
  onDiscoveryCtaClick,
  isLoading,
  hasCompletion,
  isLoginRequiredModalOpen,
  onCloseLoginRequired,
  loginRequiredConfig,
  showOnboarding,
  user,
  isPro = false,
  onOnboardingComplete,
  overlays,
  children,
}: HomeViewChromeProps) {
  return (
    <main className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1920px] 2xl:max-w-7xl mx-auto w-full pb-20 md:pb-0">
      {/* Background Gradient */}
      <div
        className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-500/12 dark:from-amber-500/8 via-red-500/4 dark:via-yellow-500/4 to-transparent blur-3xl -z-10"
        style={{ contain: "layout style" }}
      />

      {/* FAQ: floating bubble on desktop only */}
      <div className="hidden md:block fixed bottom-20 right-6 z-50">
        <ErrorBoundary name="FAQBubble">
          <FAQBubble />
        </ErrorBoundary>
      </div>

      {/* Feature Discovery Tooltips */}
      <FeatureDiscoveryTooltip
        visible={discovery.visible}
        tip={discovery.currentTip}
        currentIndex={discovery.currentIndex}
        totalTips={discovery.totalTips}
        onNext={discovery.nextTip}
        onDismiss={discovery.dismiss}
        onCtaClick={onDiscoveryCtaClick}
      />

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar activeTab={viewMode} onTabChange={onTabChange} />

      {/* Fixed overlays (sidebar, mobile FAQ) */}
      {overlays}

      {/* Main Content (Full Width) */}
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-8 pt-4">
        <div className="flex justify-center">
          <div className="hero-logo-container">
            <div className="hero-logo-ring hero-logo-ring-1" />
            <div className="hero-logo-ring hero-logo-ring-2" />
            <NextImage
              src="/Peroot-hero.png"
              alt="פירוט"
              className="hero-logo-image"
              width={720}
              height={316}
              sizes="(max-width: 768px) 80vw, 270px"
              priority
            />
          </div>
        </div>

        {/* The page's single H1 — always visible (SEO: the homepage must carry a
            real heading in the mobile-first render, never a hidden one). */}
        <h1 className="text-center text-sm md:text-base font-medium text-(--text-secondary) -mt-2 md:-mt-1 px-4 leading-snug">
          מחולל ומשדרג פרומפטים בעברית, בהתאמה מדויקת לכל מנוע AI: שיחה, תמונה, וידאו, מחקר וסוכנים
        </h1>

        {/* One in-app product explainer only (U2.2): the modal is gone,
            the full story lives at /features. */}
        {/* One concrete hint instead of a generic "how it works": the three
            things usage data said nobody found (languages, attachments,
            handoff), with the full story one tap away. */}
        <Link
          href="/features"
          className="text-xs md:text-sm text-(--text-muted) hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer -mt-3 md:-mt-2 min-h-[32px] md:min-h-[44px] flex items-center justify-center text-center px-3 md:px-4 leading-snug"
        >
          <span className="md:hidden">קובץ, ארבע שפות, שיגור ל-ChatGPT. איך זה עובד</span>
          <span className="hidden md:inline">
            כותבים בעברית, מקבלים גם באנגלית, בערבית או ברוסית. מצרפים קובץ או קישור. משגרים ישר
            ל-ChatGPT. איך זה עובד
          </span>
        </Link>

        {children}

        {/* Did You Know — BELOW the task area (U2.2: never above the mode
            selector), reserved height to prevent CLS. */}
        {!hasCompletion && !isLoading && (
          <div className="min-h-[48px] grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch [&>*:only-child]:md:col-span-2">
            <DidYouKnowBanner />
            <WhatsNewBanner viewer={isPro ? "pro" : user ? "user" : "guest"} />
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={onCloseLoginRequired}
        title={loginRequiredConfig.title}
        message={loginRequiredConfig.message}
        feature={loginRequiredConfig.feature}
      />

      {/* Onboarding Overlay */}
      {showOnboarding && !!user && <OnboardingOverlay onComplete={onOnboardingComplete} />}
    </main>
  );
}

export const HomeViewChrome = memo(HomeViewChromeInner);
HomeViewChrome.displayName = "HomeViewChrome";

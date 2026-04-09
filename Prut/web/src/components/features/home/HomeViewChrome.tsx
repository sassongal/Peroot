"use client";

import React, { memo } from "react";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";
import type { DiscoveryTip } from "@/hooks/useFeatureDiscovery";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then(mod => mod.FAQBubble),
  { ssr: false, loading: () => <div className="animate-pulse rounded-full bg-[var(--glass-bg)] w-12 h-12" /> }
);
const FeatureDiscoveryTooltip = dynamic(
  () => import("@/components/ui/FeatureDiscoveryTooltip").then(mod => mod.FeatureDiscoveryTooltip),
  { ssr: false, loading: () => null }
);
const LoginRequiredModal = dynamic(
  () => import("@/components/ui/LoginRequiredModal").then(mod => mod.LoginRequiredModal),
  { ssr: false, loading: () => null }
);
const WhatIsThisModal = dynamic(
  () => import("@/components/ui/WhatIsThisModal").then(mod => mod.WhatIsThisModal),
  { ssr: false, loading: () => null }
);
const OnboardingOverlay = dynamic(
  () => import("@/components/ui/OnboardingOverlay").then(mod => mod.OnboardingOverlay),
  { ssr: false, loading: () => null }
);
const LoadingOverlay = dynamic(
  () => import("@/components/ui/LoadingOverlay").then(mod => mod.LoadingOverlay),
  { ssr: false, loading: () => null }
);
const StreamingProgress = dynamic(
  () => import("@/components/ui/StreamingProgress"),
  { ssr: false, loading: () => null }
);
const DidYouKnowBanner = dynamic(
  () => import("@/components/ui/DidYouKnowBanner").then(mod => mod.DidYouKnowBanner),
  { ssr: false, loading: () => <div className="h-[48px]" /> }
);
const UpgradeNudge = dynamic(
  () => import("@/components/features/prompt-improver/UpgradeNudge"),
  { ssr: false, loading: () => null }
);

/** Subset of useFeatureDiscovery() return value needed for rendering */
export interface FeatureDiscoveryRenderProps {
  visible: boolean;
  currentTip: DiscoveryTip | null;
  currentIndex: number;
  totalTips: number;
  nextTip: () => void;
  dismiss: () => void;
}

export interface HomeViewChromeProps {
  // View / navigation
  viewMode: string;
  onTabChange: (tab: string) => void;

  // Feature discovery
  discovery: FeatureDiscoveryRenderProps;
  onDiscoveryCtaClick: (action: string) => void;

  // Loading state
  isLoading: boolean;
  streamPhase: StreamPhase;
  hasCompletion: boolean;

  // What Is This modal
  showWhatIsThis: boolean;
  onCloseWhatIsThis: () => void;
  onOpenWhatIsThis: () => void;

  // Login Required modal
  isLoginRequiredModalOpen: boolean;
  onCloseLoginRequired: () => void;
  loginRequiredConfig: { title?: string; message?: string; feature?: string };

  // Upgrade nudge
  showUpgradeNudge: boolean;
  onDismissUpgradeNudge: () => void;

  // Onboarding
  showOnboarding: boolean;
  user: unknown;
  onOnboardingComplete: () => void;

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
  streamPhase,
  hasCompletion,
  showWhatIsThis,
  onCloseWhatIsThis,
  onOpenWhatIsThis,
  isLoginRequiredModalOpen,
  onCloseLoginRequired,
  loginRequiredConfig,
  showUpgradeNudge,
  onDismissUpgradeNudge,
  showOnboarding,
  user,
  onOnboardingComplete,
  overlays,
  children,
}: HomeViewChromeProps) {
  return (
    <main className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1920px] 2xl:max-w-7xl mx-auto w-full pb-20 md:pb-0">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-500/[0.12] dark:from-amber-500/8 via-red-500/[0.04] dark:via-yellow-500/4 to-transparent blur-3xl -z-10" style={{ contain: 'layout style' }} />

      {/* FAQ: floating bubble on desktop only */}
      <div className="hidden md:block fixed bottom-6 right-6 z-50">
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
      <MobileTabBar
        activeTab={viewMode}
        onTabChange={onTabChange}
      />

      {/* Fixed overlays (sidebar, mobile FAQ) */}
      {overlays}

      {/* Main Content (Full Width) */}
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-8 pt-4">
           <div className="flex justify-center">
             <div className="hero-logo-container">
               <div className="hero-logo-ring hero-logo-ring-1" />
               <div className="hero-logo-ring hero-logo-ring-2" />
               <div className="hero-logo-ring hero-logo-ring-3" />
               <NextImage
                 src="/Peroot-hero.png"
                 alt="Peroot"
                 className="hero-logo-image"
                 width={720}
                 height={392}
                 sizes="360px"
                 priority
               />
             </div>
           </div>

           <button
             onClick={onOpenWhatIsThis}
             className="text-xs md:text-sm text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer -mt-3 md:-mt-2 min-h-[32px] md:min-h-[44px] flex items-center justify-center px-3 md:px-4"
           >
             מה עושים פה?
           </button>

           {/* Did You Know banner — reserve min-height to prevent CLS */}
           {!hasCompletion && !isLoading && <div className="min-h-[48px]"><DidYouKnowBanner /></div>}

           <LoadingOverlay isVisible={isLoading} phase={streamPhase} />
           <StreamingProgress phase={streamPhase} />

           {children}

        </div>

      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={onCloseLoginRequired}
        title={loginRequiredConfig.title}
        message={loginRequiredConfig.message}
        feature={loginRequiredConfig.feature}
      />

      {/* Upgrade Nudge Popup */}
      {showUpgradeNudge && (
        <UpgradeNudge
          type="exhausted"
          onUpgrade={() => { window.location.href = '/pricing'; }}
          onDismiss={onDismissUpgradeNudge}
        />
      )}

      {/* What Is This Modal */}
      <WhatIsThisModal isOpen={showWhatIsThis} onClose={onCloseWhatIsThis} />

      {/* Onboarding Overlay */}
      {showOnboarding && !!user && (
          <OnboardingOverlay onComplete={onOnboardingComplete} />
      )}
    </main>
  );
}

export const HomeViewChrome = memo(HomeViewChromeInner);
HomeViewChrome.displayName = "HomeViewChrome";

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { getApiPath } from "@/lib/api-path";
import { toast } from 'sonner';

import { identifyUser } from "@/lib/analytics";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { useHomeMediaState } from "@/hooks/useHomeMediaState";
import { UserMenu } from "@/components/layout/user-nav";
import dynamic from "next/dynamic";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { escapeRegExp } from "@/lib/text-utils";
import { stripGeniusQuestionsForDisplay } from "@/lib/prompt-stream/split-genius-completion";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useLibraryContext } from "@/context/LibraryContext";
import { useFeatureDiscovery, markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { useContextAttachments } from "@/hooks/useContextAttachments";
import { consumePendingPrompt } from "@/lib/pending-prompt";
import { usePromptLimits } from "@/hooks/usePromptLimits";
import { Clock, Link2 } from "lucide-react";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/context/I18nContext";
import { PromptLimitIndicator } from "@/components/PromptLimitIndicator";
import { SiteSearchBar } from "@/components/features/search/SiteSearchBar";
import { useResultActions } from "@/hooks/useResultActions";
import { usePromptEnhance } from "@/hooks/usePromptEnhance";
import { useHomeScoring } from "@/hooks/useHomeScoring";

// Dynamic imports for route-level views
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then(mod => mod.LibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-96" /> }
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then(mod => mod.PersonalLibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-96" /> }
);

// Extracted components — InputSection + HomeViewChrome are above the fold,
// so they stay static. The rest load on demand to keep the initial JS lean.
import { InputSection } from "@/components/features/home/InputSection";
import { HomeViewChrome } from "@/components/features/home/HomeViewChrome";

const SidebarDrawer = dynamic(
  () => import("@/components/features/home/SidebarDrawer").then(m => m.SidebarDrawer),
  { ssr: false, loading: () => null }
);
const MobileFaqPanel = dynamic(
  () => import("@/components/features/home/MobileFaqPanel").then(m => m.MobileFaqPanel),
  { ssr: false, loading: () => null }
);
const HomeResultSection = dynamic(
  () => import("@/components/features/home/HomeResultSection").then(m => m.HomeResultSection),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-64" /> }
);

function PageContent() {
  const t = useI18n();
  const { user, history, addToHistory, clearHistory, updateHistoryTitle, bumpHistoryLastUsed, isLoaded } = useHistory();
  const {
    viewMode,
    setViewMode,
    addPrompt,
    addPrompts,
    personalView,
    setPersonalView,
    completeOnboarding,
    filteredLibrary,
    libraryPrompts,
    personalLibrary,
    incrementUseCount,
    handleToggleFavorite,
  } = useLibraryContext();

  const { state: ps, dispatch } = usePromptWorkflow();
  const { isPro } = useSubscription();
  const { canUsePrompt, requiredAction, incrementUsage } = usePromptLimits();
  const discovery = useFeatureDiscovery();
  const context = useContextAttachments(isPro ? 'pro' : 'free');

  const {
    inputScore,
    liveInputScore,
    completionScore,
    placeholders,
    inputVariables,
    handleInterimChange,
  } = useHomeScoring({
    input: ps.input,
    completion: ps.completion,
    selectedCapability: ps.selectedCapability,
  });

  const variableValuesRef = useRef(ps.variableValues);
  variableValuesRef.current = ps.variableValues;

  // Batched debounced auto-save for variable memory
  const pendingVarsRef = useRef<Record<string, string>>({});
  const saveVarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVariable = useCallback((key: string, value: string) => {
    if (!user || !value.trim()) return;
    pendingVarsRef.current[key] = value.trim();
    if (saveVarTimeoutRef.current) clearTimeout(saveVarTimeoutRef.current);
    saveVarTimeoutRef.current = setTimeout(() => {
      const batch = { ...pendingVarsRef.current };
      pendingVarsRef.current = {};
      fetch(getApiPath("/api/user-variables"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: batch }),
      }).catch(() => {}); // fire-and-forget
    }, 1500);
  }, [user]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveVarTimeoutRef.current) clearTimeout(saveVarTimeoutRef.current);
    };
  }, []);

  const {
    imagePlatform,
    setImagePlatform,
    imageOutputFormat,
    setImageOutputFormat,
    imageAspectRatio,
    setImageAspectRatio,
    videoPlatform,
    setVideoPlatform,
    videoAspectRatio,
    setVideoAspectRatio,
    targetModel,
    handleSetTargetModel,
  } = useHomeMediaState({ selectedCapability: ps.selectedCapability });

  const inputRef = useRef(ps.input);
  inputRef.current = ps.input;

  // Recent personal prompts (sorted by last_used_at, only those that have been used)
  const recentPersonalPrompts = useMemo(() => {
    return personalLibrary
      .filter(p => p.last_used_at)
      .sort((a, b) => {
        const aTime = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bTime = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [personalLibrary]);

  const setInputVal = useCallback((action: SetStateAction<string>) => {
    if (typeof action === 'function') {
      dispatch({ type: 'SET_INPUT', payload: action(inputRef.current) });
    } else {
      dispatch({ type: 'SET_INPUT', payload: action });
    }
  }, [dispatch]);

  // Single raw buffer — we never drop or redirect incoming chunks. The
  // promptText / questionsPart split happens ONLY at stream-end, on the
  // final rawText, so an accidental or early `[GENIUS_QUESTIONS]` in the
  // model output can't cause the "missing middle" bug where the rest of
  // the prompt body is misrouted into the questions buffer and lost.
  const streamAccRef = useRef({ rawText: "" });

  const { startStream } = useStreamingCompletion({
    onChunk: useCallback((chunk: string) => {
      const acc = streamAccRef.current;
      acc.rawText += chunk;

      // Derive a safe display string from the raw buffer. We only HIDE
      // trailing auxiliary blocks; we never truncate the canonical buffer.
      let displayText = stripGeniusQuestionsForDisplay(acc.rawText);

      // Strip <thinking> blocks — both fully-closed and unclosed trailing.
      displayText = displayText
        .replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '')
        .replace(/<thinking>[\s\S]*$/gi, '');

      // Strip [PROMPT_TITLE]…[/PROMPT_TITLE] — both closed and unclosed
      // trailing, so the user never sees the marker flicker mid-stream.
      displayText = displayText
        .replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]\n?/g, '')
        .replace(/\[PROMPT_TITLE\][\s\S]*$/g, '');

      dispatch({ type: 'SET_COMPLETION', payload: displayText });
    }, [dispatch]),
    onDone: useCallback(() => {
      dispatch({ type: 'STREAM_DONE' });
    }, [dispatch]),
    onError: useCallback((error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }, [dispatch]),
    onInterrupted: useCallback(() => {
      dispatch({ type: 'STREAM_INTERRUPTED' });
    }, [dispatch]),
  });

  // Sidebar & mobile FAQ state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileFaqOpen, setMobileFaqOpen] = useState(false);

  // User / Auth State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Modals
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginRequiredConfig, setLoginRequiredConfig] = useState<{title?: string; message?: string; feature?: string}>({});
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);

  // --- Effects ---

  // Auto-show "What is this?" for first-time visitors
  useEffect(() => {
    if (!localStorage.getItem('peroot_seen_explainer')) {
      setShowWhatIsThis(true);
      localStorage.setItem('peroot_seen_explainer', 'true');
    }
  }, []);

  // Shared-chain deep link: when a user opens `?chain=<base64>`, decode
  // the payload, navigate to personal view, and hand off to
  // PersonalLibraryGrid to import via useChains (single source of truth
  // for dedupe/validation). The URL is cleaned up so reloads don't
  // re-import the same chain. Invalid payloads are silently ignored
  // because HomeClient mounts on every route entry.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get('chain');
    if (!encoded) return;
    (async () => {
      const { decodeSharedChain } = await import('@/lib/chains/share-url');
      const payload = decodeSharedChain(encoded);
      // Clean up the URL regardless of validity so a reload doesn't retry.
      url.searchParams.delete('chain');
      window.history.replaceState({}, '', url.toString());
      if (!payload) return;
      // Navigate to personal view and dispatch the import event; the
      // PersonalLibraryGrid listener will call importChain + toast.
      handleNavPersonal();
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('peroot:import-shared-chain', {
            detail: {
              json: JSON.stringify({
                title: payload.title,
                description: payload.description,
                steps: payload.steps,
              }),
            },
          })
        );
      }, 100);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show celebratory toast when a referral bonus was redeemed at signup
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)referral_bonus=(\d+)/);
    if (match) {
      const bonus = match[1];
      toast.success(`קיבלת ${bonus} קרדיטים בונוס! 🎉`);
      document.cookie = 'referral_bonus=; path=/; max-age=0';
    }
  }, []);

  // Identify user in PostHog when logged in
  useEffect(() => {
    if (user) {
      identifyUser(user.id, { email: user.email });
    }
  }, [user]);

  // Fetch credits + onboarding status in a single query
  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('credits_balance, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          logger.error("Error fetching profile:", error);
          return;
        }
        if (data) {
          setCreditsRemaining(data.credits_balance);
          if (!data.onboarding_completed) {
            setShowOnboarding(true);
            setIsNewUser(true);
          }
        }
      });
  }, [user]);

  // Keyboard shortcuts - ref initialized below after handleCopyText is defined
  const handleCopyTextRef = useRef<((text: string, withWatermark?: boolean) => Promise<void>) | null>(null);

  // --- Logic ---

  // Show upgrade popup when user hits rate limit or runs out of credits
  useEffect(() => {
    if (ps.error && user) {
      const err = ps.error.toLowerCase();
      if (err.includes("too many") || err.includes("insufficient") || err.includes("http 429") || err.includes("http 403")) {
        setShowUpgradeNudge(true);
      }
    }
  }, [ps.error, user]);

  const showLoginRequired = useCallback(
    (feature: string, message?: string) => {
      setLoginRequiredConfig({
        feature,
        message: message || t.home.login_required_msg.replace("{feature}", feature),
      });
      setIsLoginRequiredModalOpen(true);
    },
    [t.home.login_required_msg]
  );


  const applyVariablesToPrompt = () => {
    if (inputVariables.length === 0) return;
    markFeatureUsed("peroot_used_variables");
    let next = ps.input;
    inputVariables.forEach((variable) => {
      const value = ps.variableValues[variable]?.trim();
      if (!value) return;
      const pattern = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, "g");
      next = next.replace(pattern, value);
    });
    dispatch({ type: 'SET_INPUT', payload: next });
  };

  const {
    handleCopyText,
    handleShare,
    saveCompletionToPersonal,
    saveCompletionAsFavorite,
    saveAsTemplate,
    addPersonalPromptFromHistory,
    handleImportHistory,
  } = useResultActions({
    ps,
    dispatch,
    user,
    isPro,
    addPrompt,
    addPrompts,
    handleToggleFavorite,
    history,
    showLoginRequired,
  });

  const {
    handleEnhance,
    handleRefine,
    handleSurpriseMe,
  } = usePromptEnhance({
    ps,
    dispatch,
    streamAccRef,
    variableValuesRef,
    startStream,
    user,
    canUsePrompt,
    requiredAction,
    creditsRemaining,
    setCreditsRemaining,
    setShowUpgradeNudge,
    showLoginRequired,
    context,
    inputScore,
    completionScore,
    imagePlatform,
    imageOutputFormat,
    imageAspectRatio,
    videoPlatform,
    videoAspectRatio,
    targetModel,
    addToHistory,
    incrementUsage,
    t,
    discovery,
    filteredLibrary,
  });

  // Keep refs in sync for keyboard shortcut handler
  handleCopyTextRef.current = handleCopyText;
  const handleEnhanceRef = useRef<(() => void) | null>(null);
  handleEnhanceRef.current = handleEnhance;

  // Use ref for completion to avoid re-attaching listener on every streaming chunk
  const completionRef = useRef(ps.completion);
  completionRef.current = ps.completion;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (e.key === 'Escape' && !isTyping) {
        if (completionRef.current) {
          if (confirm("למחוק את התוצאה?")) {
            dispatch({ type: 'SET_COMPLETION', payload: '' });
          }
        }
      }
      // Cmd+Enter or Ctrl+Enter to enhance
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleEnhanceRef.current?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        if (completionRef.current) {
          e.preventDefault();
          handleCopyTextRef.current?.(completionRef.current);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        setViewMode("personal");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        if (!isTyping) {
          e.preventDefault();
          setSidebarOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, setViewMode, setSidebarOpen]);

  // Track where user came from so they can go back
  const [previousView, setPreviousView] = useState<string | null>(null);

  const handleUsePrompt = useCallback((prompt: LibraryPrompt | PersonalPrompt) => {
    setPreviousView(viewMode);
    markFeatureUsed("peroot_used_public_library");

    // Templates: load directly into completion (skip re-enhance, show variable inputs)
    if ('is_template' in prompt && prompt.is_template) {
      dispatch({ type: 'SET_INPUT', payload: prompt.title || '' });
      dispatch({ type: 'SET_COMPLETION', payload: prompt.prompt });
      dispatch({ type: 'SET_QUESTIONS', payload: [] });
      toast.success("תבנית נטענה — מלאו את המשתנים");
    } else {
      dispatch({ type: 'SET_INPUT', payload: prompt.prompt });
      dispatch({ type: 'SET_COMPLETION', payload: '' });
      dispatch({ type: 'SET_QUESTIONS', payload: [] });
    }

    setViewMode("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode, dispatch, setViewMode]);

  // Pickup pending prompt handoff from external routes like /prompts/[slug]
  // and /templates. Those pages can't dispatch into this reducer directly
  // (different route tree), so they stash the prompt in sessionStorage and
  // navigate here; we consume it on mount and route it through the same
  // canonical handleUsePrompt path the in-app library buttons use. Runs
  // once on mount — consumePendingPrompt is self-clearing, so a page
  // refresh won't re-apply the same prompt. Guarded with a ref because
  // handleUsePrompt references viewMode, which changes — without the
  // guard, the effect would fire twice when viewMode updates from the
  // first dispatch and re-trigger the load loop.
  const pendingConsumedRef = useRef(false);
  useEffect(() => {
    if (pendingConsumedRef.current) return;
    const pending = consumePendingPrompt();
    if (!pending) return;
    pendingConsumedRef.current = true;
    handleUsePrompt({
      id: pending.id ?? `pending-${Date.now()}`,
      title: pending.title ?? '',
      prompt: pending.prompt,
      category: pending.category ?? PERSONAL_DEFAULT_CATEGORY,
      is_template: !!pending.is_template,
    } as unknown as LibraryPrompt);
    toast.success('הפרומפט נטען');
  }, [handleUsePrompt]);

  const handleBackToLibrary = useCallback(() => {
    if (previousView === "personal" || previousView === "library") {
      setViewMode(previousView);
    } else {
      setViewMode("personal");
    }
    setPreviousView(null);
  }, [previousView, setViewMode]);

  const handleRestore = useCallback((item: HistoryItem) => {
    dispatch({ type: 'SET_INPUT', payload: item.original });
    dispatch({ type: 'SET_TONE', payload: item.tone });
    dispatch({ type: 'SET_CATEGORY', payload: item.category });
    dispatch({ type: 'SET_COMPLETION', payload: item.enhanced });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    toast.success("הפרומפט שוחזר");
  }, [dispatch]);

  const handleOnboardingComplete = useCallback(async () => {
      try {
          await completeOnboarding();
          setShowOnboarding(false);
          toast.success("ברוכים הבאים לפירוט!");
      } catch (e) {
          logger.error('[Onboarding] Error:', e);
          toast.error("שגיאה בשמירת נתוני Onboarding");
      }
  }, [completeOnboarding]);

  const prefetchPersonalLibrary = useCallback(() => {
    import("@/components/views/PersonalLibraryView");
  }, []);

  const handleNavPersonal = useCallback(() => {
     setViewMode("personal");
     setPersonalView("all");
  }, [setViewMode, setPersonalView]);

  const handleNavFavorites = useCallback(() => {
    setViewMode("personal");
    setPersonalView("favorites");
  }, [setViewMode, setPersonalView]);

  const handleNavLibrary = useCallback(() => {
    setViewMode("library");
  }, [setViewMode]);

  // --- Render callbacks for sub-components ---

  const handleVariableChange = useCallback((key: string, val: string) => {
    dispatch({ type: 'SET_VARIABLE_VALUES', payload: { ...ps.variableValues, [key]: val } });
    saveVariable(key, val);
  }, [dispatch, ps.variableValues, saveVariable]);

  const handleImproveAgain = useCallback(() => {
    dispatch({ type: 'SET_INPUT', payload: ps.completion });
    dispatch({ type: 'INCREMENT_ITERATION' });
    setTimeout(() => handleEnhance(), 0);
  }, [dispatch, ps.completion, handleEnhance]);

  const handleDiscoveryCtaClick = useCallback((action: string) => {
    if (action === "library") saveCompletionToPersonal();
    else if (action === "share") handleShare();
    else if (action === "research") dispatch({ type: 'SET_CAPABILITY', payload: CapabilityMode.DEEP_RESEARCH });
    else if (action === "image") dispatch({ type: 'SET_CAPABILITY', payload: CapabilityMode.IMAGE_GENERATION });
    else if (action === "chains") setViewMode("personal");
    else if (action === "public-library") handleNavLibrary();
  }, [saveCompletionToPersonal, handleShare, dispatch, setViewMode, handleNavLibrary]);

  const handleMobileTabChange = useCallback((tab: string) => {
    if (tab === "home") setViewMode("home");
    else if (tab === "library") handleNavLibrary();
    else if (tab === "personal") handleNavPersonal();
    else if (tab === "history") setSidebarOpen(true);
    else if (tab === "faq") setMobileFaqOpen(true);
  }, [setViewMode, handleNavLibrary, handleNavPersonal]);

  // --- Render ---

  const handleTopNavNavigate = useCallback((view: "home" | "library" | "personal") => {
    if (view === "home") setViewMode("home");
    else if (view === "library") handleNavLibrary();
    else if (view === "personal") handleNavPersonal();
  }, [setViewMode, handleNavLibrary, handleNavPersonal]);

  // Deep-link the top-nav "Chains" tab into the personal library's
  // chains section. We navigate to personal view first, then dispatch a
  // window event that PersonalLibraryView listens for to auto-expand the
  // collapsible chains block and scroll it into view. Keeps the nav
  // stateless — no prop drilling, no new context.
  const handleOpenChainsFromNav = useCallback(() => {
    handleNavPersonal();
    // Let the personal view mount first, then trigger the expand.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('peroot:open-chains'));
    }, 50);
  }, [handleNavPersonal]);

  const topNavBar = (
    <TopNavBar viewMode={viewMode} onNavigate={handleTopNavNavigate}>
      <PromptLimitIndicator creditsBalance={creditsRemaining} />
      {/* Chains + History hidden on mobile — reachable via personal library & MobileTabBar.
          Keeps TopNavBar under the 375px crowding threshold. */}
      <button
        onClick={handleOpenChainsFromNav}
        className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 cursor-pointer"
        aria-label="שרשראות"
        title="שרשראות פרומפטים"
      >
        <Link2 className="w-4 h-4" />
        <span className="hidden md:inline">שרשראות</span>
      </button>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all border backdrop-blur-md cursor-pointer",
          sidebarOpen
            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
            : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
        )}
        aria-expanded={sidebarOpen}
        aria-label="היסטוריה"
      >
        <Clock className="w-4 h-4" />
        <span className="hidden md:inline">היסטוריה</span>
      </button>
      <UserMenu user={user} position="top" />
    </TopNavBar>
  );

  if (viewMode === "library") {
    return (
      <>
        {topNavBar}
        <ErrorBoundary name="LibraryView">
          <LibraryView
              onUsePrompt={handleUsePrompt}
              onCopyText={async (t) => { await handleCopyText(t); }}
          />
        </ErrorBoundary>
      </>
    );
  }

  if (viewMode === "personal") {
    return (
      <>
        {topNavBar}
        <ErrorBoundary name="PersonalLibraryView">
          <PersonalLibraryView
              onUsePrompt={handleUsePrompt}
              onCopyText={async (t) => { await handleCopyText(t); }}
              handleImportHistory={handleImportHistory}
              historyLength={history.length}
          />
        </ErrorBoundary>
      </>
    );
  }

  // Home View
  return (
    <>
    {topNavBar}
    <SiteSearchBar user={user} onUsePrompt={handleUsePrompt} />
    <HomeViewChrome
      viewMode={viewMode}
      onTabChange={handleMobileTabChange}
      discovery={{
        ...discovery,
        visible: discovery.visible && !showOnboarding,
      }}
      onDiscoveryCtaClick={handleDiscoveryCtaClick}
      isLoading={ps.isLoading}
      streamPhase={ps.streamPhase}
      hasCompletion={!!ps.completion}
      showWhatIsThis={showWhatIsThis}
      onCloseWhatIsThis={() => setShowWhatIsThis(false)}
      onOpenWhatIsThis={() => setShowWhatIsThis(true)}
      isLoginRequiredModalOpen={isLoginRequiredModalOpen}
      onCloseLoginRequired={() => setIsLoginRequiredModalOpen(false)}
      loginRequiredConfig={loginRequiredConfig}
      showUpgradeNudge={showUpgradeNudge}
      onDismissUpgradeNudge={() => setShowUpgradeNudge(false)}
      showOnboarding={showOnboarding}
      user={user}
      onOnboardingComplete={handleOnboardingComplete}
      overlays={
        <>
          {/* Sidebar Drawer (extracted component) */}
          <SidebarDrawer
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            history={history}
            isLoaded={isLoaded}
            onRestore={handleRestore}
            onClear={clearHistory}
            onSaveToPersonal={addPersonalPromptFromHistory}
            onCopy={handleCopyText}
            onStartNew={() => setViewMode("home")}
            onNavPersonal={handleNavPersonal}
            onNavFavorites={handleNavFavorites}
            onNavLibrary={handleNavLibrary}
            personalView={personalView}
            prefetchPersonalLibrary={prefetchPersonalLibrary}
            onRenameHistoryTitle={updateHistoryTitle}
            onBumpHistoryLastUsed={bumpHistoryLastUsed}
          />

          {/* Mobile FAQ Panel (extracted component) */}
          <MobileFaqPanel
            isOpen={mobileFaqOpen}
            onClose={() => setMobileFaqOpen(false)}
          />
        </>
      }
    >
      {!ps.completion && !ps.isLoading ? (
        /* INPUT MODE (extracted component) */
        <InputSection
          inputVal={ps.input}
          setInputVal={setInputVal}
          handleEnhance={handleEnhance}
          liveInputScore={liveInputScore}
          selectedCategory={ps.selectedCategory}
          setSelectedCategory={(cat: string) => dispatch({ type: 'SET_CATEGORY', payload: cat })}
          selectedCapability={ps.selectedCapability}
          setSelectedCapability={(cap: CapabilityMode) => dispatch({ type: 'SET_CAPABILITY', payload: cap })}
          isLoading={ps.isLoading}
          inputVariables={inputVariables}
          variableValues={ps.variableValues}
          setVariableValues={(vals: Record<string, string>) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: vals })}
          onApplyVariables={applyVariablesToPrompt}
          imagePlatform={imagePlatform}
          setImagePlatform={setImagePlatform}
          imageOutputFormat={imageOutputFormat}
          setImageOutputFormat={setImageOutputFormat}
          imageAspectRatio={imageAspectRatio}
          setImageAspectRatio={setImageAspectRatio}
          videoPlatform={videoPlatform}
          setVideoPlatform={setVideoPlatform}
          videoAspectRatio={videoAspectRatio}
          setVideoAspectRatio={setVideoAspectRatio}
          history={history}
          onRestore={handleRestore}
          recentPersonalPrompts={recentPersonalPrompts}
          onUsePrompt={handleUsePrompt}
          incrementUseCount={incrementUseCount}
          onNavToPersonalLibrary={() => setViewMode("personal")}
          filteredLibrary={filteredLibrary}
          libraryPrompts={libraryPrompts}
          onSurpriseMe={handleSurpriseMe}
          onNavLibrary={handleNavLibrary}
          dispatch={dispatch}
          contextAttachments={context.attachments}
          onAddFile={context.addFile}
          onAddFiles={context.addFiles}
          onAddUrl={context.addUrl}
          onAddImage={context.addImage}
          onRetryAttachment={context.retryAttachment}
          onRemoveAttachment={context.removeAttachment}
          contextTotalTokens={context.totalTokens}
          contextIsOverLimit={context.isOverLimit}
          contextLimits={context.limits}
          targetModel={targetModel}
          setTargetModel={handleSetTargetModel}
          creditsRemaining={creditsRemaining}
          isNewUser={isNewUser}
          user={user}
          previousView={previousView}
          onBackToLibrary={handleBackToLibrary}
          onInterimChange={handleInterimChange}
        />
      ) : (
        /* RESULT MODE (extracted component) */
        <HomeResultSection
          completion={ps.completion}
          isLoading={ps.isLoading}
          streamPhase={ps.streamPhase}
          copied={ps.copied}
          isPro={isPro}
          onCopy={handleCopyText}
          completionScore={completionScore}
          inputScore={inputScore}
          onSave={saveCompletionToPersonal}
          onSaveAsFavorite={saveCompletionAsFavorite}
          onSaveAsTemplate={saveAsTemplate}
          onBack={() => dispatch({ type: 'SET_COMPLETION', payload: "" })}
          placeholders={placeholders}
          variableValues={ps.variableValues}
          previousScore={ps.previousScore}
          iterationCount={ps.iterationCount}
          preFilledKeys={ps.preFilledKeys}
          onVariableChange={handleVariableChange}
          onImproveAgain={handleImproveAgain}
          onQuickRefine={(instruction) => {
            void handleRefine(instruction);
          }}
          onRetryStream={handleEnhance}
          onResetToOriginal={() => dispatch({ type: 'RESET_TO_ORIGINAL' })}
          originalPrompt={ps.originalInput || ps.input}
          onShare={handleShare}
          onReset={() => dispatch({ type: 'RESET' })}
          isAuthenticated={!!user}
          capabilityMode={ps.generationContext?.mode || ps.selectedCapability}
          selectedPlatform={
            ps.generationContext?.modeParams?.image_platform
            || ps.generationContext?.modeParams?.video_platform
            || (ps.selectedCapability === CapabilityMode.IMAGE_GENERATION ? imagePlatform : undefined)
            || (ps.selectedCapability === CapabilityMode.VIDEO_GENERATION ? videoPlatform : undefined)
          }
          questions={ps.questions}
          questionAnswers={ps.questionAnswers}
          onAnswerChange={(id, val) => dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id, answer: val } })}
          onRefine={(instruction) => handleRefine(instruction || "")}
        />
      )}
    </HomeViewChrome>
    </>
  );
}

export default function HomeClient() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wrapperRef.current?.classList.add('hydrated');
  }, []);

  return (
    <div ref={wrapperRef} className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-(--surface-body) text-(--text-primary) selection:bg-amber-500/30 font-sans pb-10 pt-2 px-4 md:px-6 w-full overflow-x-hidden" dir="rtl">
      <PageContent />
    </div>
  );
}

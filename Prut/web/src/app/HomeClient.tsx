"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import NextImage from "next/image";
import { getAssetPath } from "@/lib/asset-path";
import { getApiPath } from "@/lib/api-path";
import { toast } from 'sonner';
import { User } from "@supabase/supabase-js";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { HistoryPanel } from "@/components/features/history/HistoryPanel";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { UserMenu } from "@/components/layout/user-nav";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import dynamic from "next/dynamic";
import { logger } from "@/lib/logger";

const ResultSection = dynamic(
  () => import("@/components/features/prompt-improver/ResultSection").then(mod => mod.ResultSection),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-white/[0.04] h-64" /> }
);
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { WhatIsThisModal } from "@/components/ui/WhatIsThisModal";
const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then(mod => mod.FAQBubble),
  { ssr: false, loading: () => <div className="animate-pulse rounded-full bg-white/[0.04] w-12 h-12" /> }
);
const SmartRefinement = dynamic(
  () => import("@/components/features/prompt-improver/SmartRefinement").then(mod => mod.SmartRefinement),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-white/[0.04] h-32" /> }
);
import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { createClient } from "@/lib/supabase/client";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { useLibraryContext } from "@/context/LibraryContext";
import { usePromptLimits } from "@/hooks/usePromptLimits";
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then(mod => mod.LibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-white/[0.04] h-96" /> }
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then(mod => mod.PersonalLibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-white/[0.04] h-96" /> }
);
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import StreamingProgress from "@/components/ui/StreamingProgress";
import { BookOpen, Star, Library, PanelRightOpen, X, Maximize2, Minimize2, Shuffle, Lightbulb, Clock } from "lucide-react";
import UpgradeNudge from "@/components/features/prompt-improver/UpgradeNudge";
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/context/I18nContext";
import { PromptLimitIndicator } from "@/components/PromptLimitIndicator";

// Constants

const getPromptKey = (text: string) => {
  const normalized = text.trim().slice(0, 500);
  if (!normalized) return "empty";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}:${normalized.length}`;
};

function PageContent({ user }: { user: User | null }) {
  const t = useI18n();
  const { history, addToHistory, clearHistory, isLoaded } = useHistory();
  const {
    viewMode,
    setViewMode,
    addPrompt,
    personalView,
    setPersonalView,
    completeOnboarding,
    filteredLibrary
  } = useLibraryContext();

  const { state: ps, dispatch } = usePromptWorkflow();
  const { isPro } = useSubscription();
  const { canUsePrompt, requiredAction, incrementUsage } = usePromptLimits();

  const inputRef = useRef(ps.input);
  inputRef.current = ps.input;

  const setInputVal = useCallback((action: SetStateAction<string>) => {
    if (typeof action === 'function') {
      dispatch({ type: 'SET_INPUT', payload: action(inputRef.current) });
    } else {
      dispatch({ type: 'SET_INPUT', payload: action });
    }
  }, [dispatch]);

  // Mutable refs for streaming delimiter parsing
  const streamAccRef = useRef({ promptText: "", questionsPart: "", foundDelimiter: false });

  const { startStream } = useStreamingCompletion({
    onChunk: useCallback((chunk: string) => {
      const acc = streamAccRef.current;
      if (!acc.foundDelimiter) {
        if (chunk.includes("[GENIUS_QUESTIONS]")) {
          acc.foundDelimiter = true;
          const [text, json] = chunk.split("[GENIUS_QUESTIONS]");
          acc.promptText += text;
          acc.questionsPart += json || "";
          dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });
        } else {
          acc.promptText += chunk;
          dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });
        }
      } else {
        acc.questionsPart += chunk;
      }
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

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('peroot_sidebar_expanded') === 'true';
  });

  // User / Auth State
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Fetch credits for logged-in free users
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCreditsRemaining(data.credits_balance);
      });
  }, [user]);

  useEffect(() => {
    localStorage.setItem('peroot_sidebar_expanded', sidebarExpanded.toString());
  }, [sidebarExpanded]);

  useEffect(() => {
    const supabase = createClient();
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          logger.error("Error fetching profile:", error);
        } else if (data) {
          if (!data.onboarding_completed) {
            setShowOnboarding(true);
          }
        }
      } else {
        setShowOnboarding(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ps.completion) {
          dispatch({ type: 'SET_COMPLETION', payload: '' });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        if (ps.completion) {
          navigator.clipboard.writeText(ps.completion);
          dispatch({ type: 'SET_COPIED', payload: true });
          setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ps.completion, dispatch]);

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

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || t.home.login_required_msg.replace('{feature}', feature)
    });
    setIsLoginRequiredModalOpen(true);
  };

  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(ps.input),
    [ps.input]
  );
  const completionScore = useMemo(
    () => BaseEngine.scorePrompt(ps.completion),
    [ps.completion]
  );

  const scoreTone =
    inputScore.level === "high"
      ? { text: "text-amber-400", bar: "bg-gradient-to-r from-amber-500 to-yellow-400" }
      : inputScore.level === "medium"
        ? { text: "text-amber-500/70", bar: "bg-gradient-to-r from-amber-600 to-amber-400" }
        : inputScore.level === "low"
          ? { text: "text-red-400", bar: "bg-red-500" }
          : { text: "text-slate-500", bar: "bg-slate-600" };

  const placeholders = useMemo(() => extractPlaceholders(ps.completion), [ps.completion]);
  const inputVariables = useMemo(() => extractPlaceholders(ps.input), [ps.input]);

  const applyVariablesToPrompt = () => {
    if (inputVariables.length === 0) return;
    let next = ps.input;
    inputVariables.forEach((variable) => {
      const value = ps.variableValues[variable]?.trim();
      if (!value) return;
      const pattern = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, "g");
      next = next.replace(pattern, value);
    });
    dispatch({ type: 'SET_INPUT', payload: next });
  };

  const recordUsageSignal = (type: "copy" | "save" | "refine" | "enhance", text: string) => {
    const target = text.trim();
    if (!target) return;
    const key = getPromptKey(target);
    void fetch(getApiPath("/api/prompt-usage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_key: key,
        event_type: type,
        prompt_length: target.length,
      }),
    }).catch(() => {});
  };

  const processStreamResult = (label: string) => {
    const acc = streamAccRef.current;
    if (acc.foundDelimiter) {
      // Delimiter was found - parse whatever came after it (may be empty array)
      try {
        let jsonStr = acc.questionsPart.trim();
        // Handle common AI formatting issues (markdown code blocks)
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        // Empty string after delimiter means no questions
        const parsed = jsonStr ? JSON.parse(jsonStr) : [];
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        dispatch({ type: 'SET_QUESTIONS', payload: questions });
      } catch (e) {
        logger.warn(`[${label}] Questions parse failed, attempting recovery`, e);
        // Try to extract JSON array from malformed response
        const arrayMatch = acc.questionsPart.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            dispatch({ type: 'SET_QUESTIONS', payload: JSON.parse(arrayMatch[0]) });
          } catch { /* truly unrecoverable - dispatch empty so UI shows completion state */
            dispatch({ type: 'SET_QUESTIONS', payload: [] });
          }
        } else {
          // No array found at all - treat as explicitly empty
          dispatch({ type: 'SET_QUESTIONS', payload: [] });
        }
      }
    }

    // Extract AI-generated title if present
    const titleMatch = acc.promptText.match(/\[PROMPT_TITLE\](.*?)\[\/PROMPT_TITLE\]/);
    const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
    acc.promptText = acc.promptText.replace(/\[PROMPT_TITLE\].*?\[\/PROMPT_TITLE\]\n?/, '').trim();

    // Update displayed completion without the title tag
    dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });

    const extracted = extractPlaceholders(acc.promptText);
    const newVars = { ...ps.variableValues };
    extracted.forEach(ph => { if (!(ph in newVars)) newVars[ph] = ""; });
    dispatch({ type: 'SET_VARIABLE_VALUES', payload: newVars });

    return { text: acc.promptText, title: generatedTitle };
  };

  const enhanceCooldownRef = useRef(false);

  // Prompt of the Day - deterministic daily pick
  const promptOfTheDay = useMemo(() => {
    if (!filteredLibrary || filteredLibrary.length === 0) return null;
    const today = new Date();
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % filteredLibrary.length;
    return filteredLibrary[dayIndex];
  }, [filteredLibrary]);

  // Surprise Me - random prompt
  const handleSurpriseMe = () => {
    if (!filteredLibrary || filteredLibrary.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredLibrary.length);
    const randomPrompt = filteredLibrary[randomIndex];
    dispatch({ type: 'SET_INPUT', payload: randomPrompt.prompt });
    toast.success(`"${randomPrompt.title}" נטען!`);
  };

  const handleEnhance = async () => {
    if (!ps.input.trim() || ps.isLoading || enhanceCooldownRef.current) return;

    enhanceCooldownRef.current = true;
    setTimeout(() => { enhanceCooldownRef.current = false; }, 500);

    // Check prompt limits (guest free trial or credit balance)
    if (!canUsePrompt) {
      if (requiredAction === 'login') {
        showLoginRequired("יצירת פרומפט", "כדי ליצור פרומפטים מקצועיים, יש להתחבר לחשבון. ההרשמה חינמית!");
      } else if (requiredAction === 'upgrade') {
        setShowUpgradeNudge(true);
      }
      return;
    }

    dispatch({ type: 'START_STREAM' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    dispatch({ type: 'CLEAR_ANSWERS' });
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
    });

    const result = processStreamResult("Enhance");
    if (result.text) {
      recordUsageSignal("enhance", result.text);
      dispatch({ type: 'SET_DETECTED_CATEGORY', payload: ps.selectedCategory });

      addToHistory({
        original: ps.input,
        enhanced: result.text,
        tone: ps.selectedTone,
        category: ps.selectedCategory,
        title: result.title || ps.input.slice(0, 40) + (ps.input.length > 40 ? "..." : ""),
      });

      // Track usage: decrement credits display for logged-in users, increment guest counter
      if (user && creditsRemaining !== null) {
        setCreditsRemaining(Math.max(0, creditsRemaining - 1));
      }
      if (!user) {
        incrementUsage();
      }

      toast.success(t.prompt_generator.success_toast);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (ps.isLoading) return;
    const hasAnswers = Object.values(ps.questionAnswers).some(a => a.trim());
    if ((!instruction.trim() && !hasAnswers) || !ps.completion) return;

    // Capture before START_STREAM resets completion to ""
    const currentCompletion = ps.completion;

    dispatch({ type: 'START_STREAM' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    dispatch({ type: 'CLEAR_ANSWERS' });
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    // Build combined instruction from answers + custom instruction
    const answerParts = ps.questions
      .filter(q => ps.questionAnswers[q.id]?.trim())
      .map(q => `שאלה: ${q.question}\nתשובה: ${ps.questionAnswers[q.id]}`);

    const combinedInstruction = [
      ...answerParts,
      instruction.trim() ? `הוראה נוספת: ${instruction}` : "",
    ].filter(Boolean).join("\n\n");

    // Convert numeric keys to string keys for API
    const stringAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(ps.questionAnswers)) {
      if (v.trim()) stringAnswers[String(k)] = v;
    }

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
      previousResult: currentCompletion,
      refinementInstruction: combinedInstruction,
      answers: stringAnswers,
    });

    const refineResult = processStreamResult("Refine");
    if (refineResult.text) {
      recordUsageSignal("refine", refineResult.text);
      dispatch({ type: 'INCREMENT_ITERATION' });
      toast.success("הפרומפט עודכן!");
    }
  };

  const handleCopyText = async (text: string, withWatermark?: boolean) => {
    // Pro users copy clean by default; free/guest always get watermark.
    // Callers can override via the withWatermark argument (e.g. toggle checkbox).
    const shouldWatermark = withWatermark !== undefined ? withWatermark : !isPro;
    const finalText = shouldWatermark ? `${text}\n\n- נוצר עם Peroot | peroot.space` : text;
    await navigator.clipboard.writeText(finalText);
    dispatch({ type: 'SET_COPIED', payload: true });
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
    recordUsageSignal("copy", text);
    toast.success("הועתק ללוח!");
  };

  const handleShare = async () => {
    if (!user) {
      showLoginRequired("שיתוף פרומפטים");
      return;
    }
    if (!ps.completion.trim()) return;

    try {
      const res = await fetch(getApiPath("/api/share"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: ps.completion,
          original_input: ps.input,
          category: ps.selectedCategory,
          capability_mode: ps.selectedCapability,
        }),
      });

      if (!res.ok) throw new Error("Share failed");
      const { id } = await res.json();
      const shareUrl = `${window.location.origin}/p/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("קישור שיתוף הועתק!");
    } catch {
      toast.error("שגיאה בשיתוף");
    }
  };

  const handleUsePrompt = (prompt: LibraryPrompt | PersonalPrompt) => {
    dispatch({ type: 'SET_INPUT', payload: prompt.prompt });
    setViewMode("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestore = (item: HistoryItem) => {
    dispatch({ type: 'SET_INPUT', payload: item.original });
    dispatch({ type: 'SET_TONE', payload: item.tone });
    dispatch({ type: 'SET_CATEGORY', payload: item.category });
    dispatch({ type: 'SET_COMPLETION', payload: item.enhanced });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    toast.success("הפרומפט שוחזר");
  };

  const addPersonalPromptFromHistory = (item: HistoryItem) => {
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
    addPrompt({
      title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
      prompt: item.enhanced,
      category: item.category,
      personal_category: item.category || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: CapabilityMode.STANDARD,
      use_case: "נשמר מהיסטוריה",
      source: "manual"
    });
    recordUsageSignal("save", item.enhanced);
    toast.success("נשמר לספריה האישית!");
  };

  const saveCompletionToPersonal = () => {
    if (!user) {
       showLoginRequired("שמירת פרומפטים");
       return;
    }
    if (!ps.completion.trim()) return;
    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: ps.selectedCategory || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual"
    });
    recordUsageSignal("save", ps.completion);
    toast.success("נשמר לספריה האישית!");
  };

  const handleImportHistory = () => {
     history.forEach(item => addPersonalPromptFromHistory(item));
     toast.success("כל ההיסטוריה יובאה!");
  };

  const handleOnboardingComplete = async () => {
      try {
          await completeOnboarding();
          setShowOnboarding(false);
          toast.success("ברוכים הבאים לפירוט!");
      } catch (e) {
          logger.error('[Onboarding] Error:', e);
          toast.error("שגיאה בשמירת נתוני Onboarding");
      }
  };

  const handleNavPersonal = () => {
     setViewMode("personal");
     setPersonalView("all");
  };

  const handleNavFavorites = () => {
    setViewMode("personal");
    setPersonalView("favorites");
  };

  const handleNavLibrary = () => {
    setViewMode("library");
  };

  // --- Render ---

  if (viewMode === "library") {
    return (
        <LibraryView
            onUsePrompt={handleUsePrompt}
            onCopyText={async (t) => { await handleCopyText(t); }}
        />
    );
  }

  if (viewMode === "personal") {
    return (
        <PersonalLibraryView
            onUsePrompt={handleUsePrompt}
            onCopyText={async (t) => { await handleCopyText(t); }}
            handleImportHistory={handleImportHistory}
            historyLength={history.length}
        />
    );
  }

  // Home View
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1920px] mx-auto w-full">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-500/8 via-yellow-500/4 to-transparent blur-3xl -z-10" />

      {/* Fixed Elements */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
         <UserMenu user={user} position="top" />
      </div>

      <div className="fixed bottom-6 right-4 sm:right-6 z-50">
         <FAQBubble />
      </div>

      {/* Sidebar Toggle Button + Credits indicator */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
        <PromptLimitIndicator creditsBalance={creditsRemaining} />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border backdrop-blur-md cursor-pointer",
            sidebarOpen
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
          )}
          title="תפריט"
          aria-expanded={sidebarOpen}
          aria-label="Toggle sidebar"
        >
          <PanelRightOpen className="w-4 h-4" />
          <span className="hidden md:inline">תפריט</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div role="dialog" aria-modal="true" aria-label="History and library sidebar" className={cn(
        "fixed top-0 right-0 z-40 h-full bg-black/95 backdrop-blur-xl border-s border-white/10 flex flex-col transition-all duration-300 ease-out",
        sidebarOpen ? "translate-x-0" : "translate-x-full",
        // Mobile: always full width. Desktop: compact or expanded
        "w-full",
        sidebarExpanded ? "lg:w-[480px]" : "lg:w-72"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <span className="text-sm font-bold text-white">תפריט</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={sidebarExpanded ? "כווץ תפריט" : "הרחב תפריט"}
              aria-label={sidebarExpanded ? "כווץ תפריט" : "הרחב תפריט"}
            >
              {sidebarExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="סגור תפריט"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col gap-2 p-4">
          <button
            onClick={() => { handleNavPersonal(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group bg-black/20 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.home.personal_library}</span>
          </button>

          <button
            onClick={() => { handleNavFavorites(); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group cursor-pointer",
              personalView === "favorites" ? "bg-amber-500/20 text-amber-300 border-amber-400/50" : "bg-black/20"
            )}
          >
            <Star className="w-4 h-4" />
            <span>{t.home.favorites}</span>
          </button>

          <button
            onClick={() => { handleNavLibrary(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group bg-black/20 cursor-pointer"
          >
            <Library className="w-4 h-4" />
            <span>{t.home.public_library}</span>
          </button>
        </div>

        {/* History Panel - takes remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <HistoryPanel
            history={history}
            isLoaded={isLoaded}
            onRestore={(item) => { handleRestore(item); setSidebarOpen(false); }}
            onClear={clearHistory}
            onSaveToPersonal={addPersonalPromptFromHistory}
            onCopy={handleCopyText}
          />
        </div>
      </div>

      {/* Main Content (Full Width) */}
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-8 pt-16 md:pt-4">
           <div className="flex justify-center">
             <div className="hero-logo-container">
               <div className="hero-logo-ring hero-logo-ring-1" />
               <div className="hero-logo-ring hero-logo-ring-2" />
               <div className="hero-logo-ring hero-logo-ring-3" />
               <NextImage
                 src={getAssetPath("/Peroot.svg")}
                 alt="Peroot"
                 className="hero-logo-image"
                 width={360}
                 height={140}
                 priority
               />
             </div>
           </div>

           <button
             onClick={() => setShowWhatIsThis(true)}
             className="text-sm text-slate-500 hover:text-amber-400 transition-colors cursor-pointer -mt-2"
           >
             מה עושים פה?
           </button>

           <LoadingOverlay isVisible={ps.isLoading} />
           <StreamingProgress phase={ps.streamPhase} />

           {!ps.completion ? (
             /* INPUT MODE */
             <>
               <PromptInput
                  inputVal={ps.input}
                  setInputVal={setInputVal}
                  handleEnhance={handleEnhance}
                  inputScore={inputScore}
                  scoreTone={scoreTone}
                  selectedCategory={ps.selectedCategory}
                  setSelectedCategory={(cat: string) => dispatch({ type: 'SET_CATEGORY', payload: cat })}
                  selectedCapability={ps.selectedCapability}
                  setSelectedCapability={(cap: CapabilityMode) => dispatch({ type: 'SET_CAPABILITY', payload: cap })}
                  isLoading={ps.isLoading}
                  variables={inputVariables}
                  variableValues={ps.variableValues}
                  setVariableValues={(vals: Record<string, string>) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: vals })}
                  onApplyVariables={applyVariablesToPrompt}
               />

               {/* Recently Used Prompts Strip */}
               {history.length > 0 && (
                 <div className="mt-3">
                   <div className="flex items-center gap-2 mb-3">
                     <Clock className="w-3.5 h-3.5 text-slate-500" />
                     <span className="text-xs font-medium text-slate-500">שימשת לאחרונה</span>
                   </div>
                   <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                     {history.slice(0, 5).map((item, i) => (
                       <button
                         key={i}
                         onClick={() => { handleRestore(item); }}
                         className="shrink-0 w-56 md:w-64 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-all cursor-pointer text-right group"
                         dir="rtl"
                       >
                         <p className="text-sm text-slate-300 font-medium truncate">{item.title || item.original.slice(0, 40)}</p>
                         <p className="text-xs text-slate-500 mt-1 truncate">{item.original.slice(0, 60)}</p>
                         <div className="flex items-center gap-2 mt-2">
                           <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/5">{item.category || 'כללי'}</span>
                           <span className="text-[10px] text-slate-600">{item.tone || ''}</span>
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* Prompt of the Day + Surprise Me */}
               {filteredLibrary.length > 0 && (
                 <div className="flex flex-col gap-4 mt-2">
                   {/* Surprise Me Button */}
                   <button
                     onClick={handleSurpriseMe}
                     className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white text-sm transition-all cursor-pointer group"
                   >
                     <Shuffle className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                     <span>הפתע אותי - פרומפט אקראי מהספריה</span>
                   </button>

                   {/* Prompt of the Day */}
                   {promptOfTheDay && (
                     <div className="glass-card rounded-xl border-white/10 bg-gradient-to-l from-amber-500/[0.04] to-transparent overflow-hidden">
                       <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                         <Lightbulb className="w-4 h-4 text-amber-400" />
                         <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">פרומפט היום</span>
                       </div>
                       <div className="p-5 flex flex-col gap-3">
                         <h4 className="text-base font-semibold text-slate-200" dir="rtl">{promptOfTheDay.title}</h4>
                         <p className="text-sm text-slate-400 leading-relaxed line-clamp-2" dir="rtl">{promptOfTheDay.use_case}</p>
                         <div className="flex items-center gap-2 mt-1">
                           <button
                             onClick={() => {
                               dispatch({ type: 'SET_INPUT', payload: promptOfTheDay.prompt });
                               toast.success('פרומפט היום נטען!');
                             }}
                             className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                           >
                             השתמש בפרומפט
                           </button>
                           <button
                             onClick={() => handleNavLibrary()}
                             className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-colors cursor-pointer"
                           >
                             עוד פרומפטים מהספריה
                           </button>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </>
           ) : (
             /* RESULT MODE */
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col gap-8">
                 <ResultSection
                     completion={ps.completion}
                     isLoading={ps.isLoading}
                     streamPhase={ps.streamPhase}
                     copied={ps.copied}
                     isPro={isPro}
                     onCopy={handleCopyText}
                     completionScore={completionScore}
                     onSave={saveCompletionToPersonal}
                     onBack={() => dispatch({ type: 'SET_COMPLETION', payload: "" })}
                     placeholders={placeholders}
                     variableValues={ps.variableValues}
                     improvementDelta={completionScore.baseScore - inputScore.baseScore}
                     onVariableChange={(key, val) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: { ...ps.variableValues, [key]: val } })}
                     onImproveAgain={() => {
                       // Feed the current completion back as the new input so the next
                       // enhance round works on the improved version, but preserve
                       // originalInput (set on first START_STREAM) so "Back to Original" works.
                       dispatch({ type: 'SET_INPUT', payload: ps.completion });
                       dispatch({ type: 'INCREMENT_ITERATION' });
                       // Kick off the enhance - START_STREAM will only set originalInput
                       // if it is still empty, so it won't overwrite the first snapshot.
                       setTimeout(() => handleEnhance(), 0);
                     }}
                     onRetryStream={handleEnhance}
                     onResetToOriginal={() => dispatch({ type: 'RESET_TO_ORIGINAL' })}
                     iterationCount={ps.iterationCount}
                     originalPrompt={ps.originalInput || ps.input}
                     onShare={handleShare}
                 />

                 {(ps.questions.length > 0 || ps.iterationCount > 0) && (
                    <SmartRefinement
                       questions={ps.questions}
                       answers={ps.questionAnswers}
                       onAnswerChange={(id, val) => dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id, answer: val } })}
                       onRefine={(instruction) => handleRefine(instruction || "")}
                       isLoading={ps.isLoading}
                    />
                 )}
             </div>
           )}

        </div>

      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        title={loginRequiredConfig.title}
        message={loginRequiredConfig.message}
        feature={loginRequiredConfig.feature}
      />

      {/* Upgrade Nudge Popup */}
      {showUpgradeNudge && (
        <UpgradeNudge
          type="exhausted"
          onUpgrade={() => { window.location.href = '/pricing'; }}
          onDismiss={() => setShowUpgradeNudge(false)}
        />
      )}

      {/* What Is This Modal */}
      <WhatIsThisModal isOpen={showWhatIsThis} onClose={() => setShowWhatIsThis(false)} />

      {/* Onboarding Overlay */}
      {showOnboarding && user && (
          <OnboardingOverlay onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

export default function HomeClient() {
  const { user } = useHistory();
  return (
    <div className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-black text-slate-200 selection:bg-amber-500/30 font-sans pb-10 pt-2 px-4 md:px-6 max-w-[100vw] overflow-x-hidden" dir="rtl">
      <PageContent user={user} />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import NextImage from "next/image";
import { getApiPath } from "@/lib/api-path";
import { toast } from 'sonner';
import { User } from "@supabase/supabase-js";
import { trackPromptEnhance, trackEnhanceComplete, trackPromptCopy, identifyUser } from "@/lib/analytics";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { PERSONAL_DEFAULT_CATEGORY, getCategoryLabel } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { UserMenu } from "@/components/layout/user-nav";
import dynamic from "next/dynamic";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const ResultSection = dynamic(
  () => import("@/components/features/prompt-improver/ResultSection").then(mod => mod.ResultSection),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-64" /> }
);
const LoginRequiredModal = dynamic(
  () => import("@/components/ui/LoginRequiredModal").then(mod => mod.LoginRequiredModal),
  { ssr: false, loading: () => null }
);
const WhatIsThisModal = dynamic(
  () => import("@/components/ui/WhatIsThisModal").then(mod => mod.WhatIsThisModal),
  { ssr: false, loading: () => null }
);
const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then(mod => mod.FAQBubble),
  { ssr: false, loading: () => <div className="animate-pulse rounded-full bg-[var(--glass-bg)] w-12 h-12" /> }
);
const SmartRefinement = dynamic(
  () => import("@/components/features/prompt-improver/SmartRefinement").then(mod => mod.SmartRefinement),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-32" /> }
);
import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { TargetModel } from "@/lib/engines/types";
import { createClient } from "@/lib/supabase/client";
const OnboardingOverlay = dynamic(
  () => import("@/components/ui/OnboardingOverlay").then(mod => mod.OnboardingOverlay),
  { ssr: false, loading: () => null }
);
import { useLibraryContext } from "@/context/LibraryContext";
import { useFeatureDiscovery, markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { useContextAttachments } from "@/hooks/useContextAttachments";
const FeatureDiscoveryTooltip = dynamic(
  () => import("@/components/ui/FeatureDiscoveryTooltip").then(mod => mod.FeatureDiscoveryTooltip),
  { ssr: false, loading: () => null }
);
import { usePromptLimits } from "@/hooks/usePromptLimits";
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then(mod => mod.LibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" /> }
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then(mod => mod.PersonalLibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" /> }
);
const LoadingOverlay = dynamic(
  () => import("@/components/ui/LoadingOverlay").then(mod => mod.LoadingOverlay),
  { ssr: false, loading: () => null }
);
const StreamingProgress = dynamic(
  () => import("@/components/ui/StreamingProgress"),
  { ssr: false, loading: () => null }
);
import { Clock } from "lucide-react";
const DidYouKnowBanner = dynamic(
  () => import("@/components/ui/DidYouKnowBanner").then(mod => mod.DidYouKnowBanner),
  { ssr: false, loading: () => null }
);
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { TopNavBar } from "@/components/layout/TopNavBar";
const UpgradeNudge = dynamic(
  () => import("@/components/features/prompt-improver/UpgradeNudge"),
  { ssr: false, loading: () => null }
);
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/context/I18nContext";
import { PromptLimitIndicator } from "@/components/PromptLimitIndicator";

// Extracted components
import { SidebarDrawer } from "@/components/features/home/SidebarDrawer";
import { MobileFaqPanel } from "@/components/features/home/MobileFaqPanel";
import { InputSection } from "@/components/features/home/InputSection";

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
    addPrompts,
    personalView,
    setPersonalView,
    completeOnboarding,
    filteredLibrary,
    libraryPrompts,
    personalLibrary,
    incrementUseCount
  } = useLibraryContext();

  const { state: ps, dispatch } = usePromptWorkflow();
  const { isPro } = useSubscription();
  const { canUsePrompt, requiredAction, incrementUsage } = usePromptLimits();
  const discovery = useFeatureDiscovery();
  const context = useContextAttachments();

  const variableValuesRef = useRef(ps.variableValues);
  variableValuesRef.current = ps.variableValues;

  const [imagePlatform, setImagePlatform] = useState<ImagePlatform>('general');
  const [imageOutputFormat, setImageOutputFormat] = useState<ImageOutputFormat>('text');
  const [imageAspectRatio, setImageAspectRatio] = useState("");
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('general');
  const [videoAspectRatio, setVideoAspectRatio] = useState("");
  const [targetModel, setTargetModel] = useState<TargetModel>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('peroot_target_model') as TargetModel) || 'general';
    }
    return 'general';
  });

  const handleSetTargetModel = useCallback((model: TargetModel) => {
    setTargetModel(model);
    localStorage.setItem('peroot_target_model', model);
  }, []);

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

  // Mutable refs for streaming delimiter parsing
  const streamAccRef = useRef({ promptText: "", questionsPart: "", foundDelimiter: false });

  const { startStream } = useStreamingCompletion({
    onChunk: useCallback((chunk: string) => {
      const acc = streamAccRef.current;
      if (!acc.foundDelimiter) {
        acc.promptText += chunk;
        const delimIdx = acc.promptText.indexOf("[GENIUS_QUESTIONS]");
        if (delimIdx !== -1) {
          acc.foundDelimiter = true;
          acc.questionsPart = acc.promptText.slice(delimIdx + "[GENIUS_QUESTIONS]".length);
          acc.promptText = acc.promptText.slice(0, delimIdx);
        }
        // Strip <thinking> blocks and incomplete opening tags from display
        const displayText = acc.promptText
          .replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '')
          .replace(/<thinking>[\s\S]*$/gi, '');
        dispatch({ type: 'SET_COMPLETION', payload: displayText });
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

  // Fetch credits for logged-in users
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
            setIsNewUser(true);
          }
        }
      } else {
        setShowOnboarding(false);
      }
    };
    fetchUserProfile();
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

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || t.home.login_required_msg.replace('{feature}', feature)
    });
    setIsLoginRequiredModalOpen(true);
  };

  // Debounce scoring
  const debouncedInput = useDebouncedValue(ps.input, 300);
  const debouncedCompletion = useDebouncedValue(ps.completion, 200);

  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(debouncedInput, ps.selectedCapability),
    [debouncedInput, ps.selectedCapability]
  );
  const completionScore = useMemo(
    () => BaseEngine.scorePrompt(debouncedCompletion, ps.selectedCapability),
    [debouncedCompletion, ps.selectedCapability]
  );

  const scoreTone =
    inputScore.level === "high"
      ? { text: "text-amber-400", bar: "bg-gradient-to-r from-amber-500 to-yellow-400" }
      : inputScore.level === "medium"
        ? { text: "text-amber-500/70", bar: "bg-gradient-to-r from-amber-600 to-amber-400" }
        : inputScore.level === "low"
          ? { text: "text-red-400", bar: "bg-red-500" }
          : { text: "text-slate-500", bar: "bg-slate-600" };

  // Debounce placeholder extraction
  const placeholders = useMemo(() => extractPlaceholders(debouncedCompletion), [debouncedCompletion]);
  const inputVariables = useMemo(() => extractPlaceholders(debouncedInput), [debouncedInput]);

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
      try {
        let jsonStr = acc.questionsPart.trim();
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        const parsed = jsonStr ? JSON.parse(jsonStr) : [];
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        dispatch({ type: 'SET_QUESTIONS', payload: questions });
      } catch (e) {
        logger.warn(`[${label}] Questions parse failed, attempting recovery`, e);
        const arrayMatch = acc.questionsPart.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            dispatch({ type: 'SET_QUESTIONS', payload: JSON.parse(arrayMatch[0]) });
          } catch {
            dispatch({ type: 'SET_QUESTIONS', payload: [] });
          }
        } else {
          dispatch({ type: 'SET_QUESTIONS', payload: [] });
        }
      }
    } else {
      dispatch({ type: 'SET_QUESTIONS', payload: [] });
    }

    // Strip AI thinking/reasoning tags and their content
    acc.promptText = acc.promptText.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '').trim();

    const titleMatch = acc.promptText.match(/\[PROMPT_TITLE\](.*?)\[\/PROMPT_TITLE\]/);
    const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
    acc.promptText = acc.promptText.replace(/\[PROMPT_TITLE\].*?\[\/PROMPT_TITLE\]\n?/, '').trim();

    dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });

    const extracted = extractPlaceholders(acc.promptText);
    const newVars = { ...variableValuesRef.current };
    extracted.forEach(ph => { if (!(ph in newVars)) newVars[ph] = ""; });
    dispatch({ type: 'SET_VARIABLE_VALUES', payload: newVars });

    return { text: acc.promptText, title: generatedTitle };
  };

  const enhanceCooldownRef = useRef(false);

  // Surprise Me - random prompt
  const handleSurpriseMe = () => {
    if (!filteredLibrary || filteredLibrary.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredLibrary.length);
    const randomPrompt = filteredLibrary[randomIndex];
    dispatch({ type: 'SET_INPUT', payload: randomPrompt.prompt });
    toast.success(`"${randomPrompt.title}" נטען!`);
  };

  const handleEnhance = useCallback(async () => {
    if (!ps.input.trim() || ps.isLoading || enhanceCooldownRef.current) return;

    enhanceCooldownRef.current = true;
    setTimeout(() => { enhanceCooldownRef.current = false; }, 500);

    if (!canUsePrompt) {
      if (requiredAction === 'login') {
        showLoginRequired("יצירת פרומפט", "כדי ליצור פרומפטים מקצועיים, יש להתחבר לחשבון. ההרשמה חינמית!");
      } else if (requiredAction === 'upgrade') {
        setShowUpgradeNudge(true);
      }
      return;
    }

    const currentModeParams: Record<string, string> | undefined =
      ps.selectedCapability === CapabilityMode.IMAGE_GENERATION
        ? { image_platform: imagePlatform, output_format: imageOutputFormat, ...(imageAspectRatio && { aspect_ratio: imageAspectRatio }) }
        : ps.selectedCapability === CapabilityMode.VIDEO_GENERATION
          ? { video_platform: videoPlatform, ...(videoAspectRatio && { aspect_ratio: videoAspectRatio }) }
          : undefined;

    dispatch({ type: 'START_STREAM' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    dispatch({ type: 'SET_GENERATION_CONTEXT', payload: {
      mode: ps.selectedCapability,
      modeParams: currentModeParams,
      category: ps.selectedCategory,
      tone: ps.selectedTone,
    }});
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    const enhanceStart = Date.now();
    trackPromptEnhance(ps.selectedCategory, ps.selectedCapability, ps.input.length);

    const contextPayload = context.getContextPayload();
    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
      ...(currentModeParams && { mode_params: currentModeParams }),
      ...(contextPayload.length > 0 && { context: contextPayload }),
      ...(targetModel !== 'general' && { target_model: targetModel }),
    });

    const result = processStreamResult("Enhance");
    if (result.text) {
      trackEnhanceComplete(ps.selectedCapability, inputScore.score, Date.now() - enhanceStart);
      recordUsageSignal("enhance", result.text);
      if (ps.selectedCapability === CapabilityMode.DEEP_RESEARCH) markFeatureUsed("peroot_used_research");
      if (ps.selectedCapability === CapabilityMode.IMAGE_GENERATION) markFeatureUsed("peroot_used_image");
      dispatch({ type: 'SET_DETECTED_CATEGORY', payload: ps.selectedCategory });

      addToHistory({
        original: ps.input,
        enhanced: result.text,
        tone: ps.selectedTone,
        category: ps.selectedCategory,
        title: result.title || ps.input.slice(0, 40) + (ps.input.length > 40 ? "..." : ""),
      });

      if (user && creditsRemaining !== null) {
        setCreditsRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null);
      }
      if (!user) {
        incrementUsage();
      }

      toast.success(t.prompt_generator.success_toast);
      discovery.onEnhanceComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps.input, ps.isLoading, ps.selectedCapability, ps.selectedCategory, ps.selectedTone, canUsePrompt, requiredAction, user, creditsRemaining, dispatch, startStream, inputScore.score, imagePlatform, imageOutputFormat, imageAspectRatio, videoPlatform, videoAspectRatio, targetModel, addToHistory, incrementUsage, t, discovery.onEnhanceComplete]);

  const handleRefine = useCallback(async (instruction: string) => {
    if (ps.isLoading) return;
    const hasAnswers = Object.values(ps.questionAnswers).some(a => a.trim());
    if ((!instruction.trim() && !hasAnswers) || !ps.completion) return;

    const currentCompletion = ps.completion;

    dispatch({ type: 'SET_PREVIOUS_SCORE', payload: completionScore.score });
    dispatch({ type: 'START_STREAM' });
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    const answerParts = ps.questions
      .filter(q => ps.questionAnswers[String(q.id)]?.trim())
      .map(q => `שאלה: ${q.question}\nתשובה: ${ps.questionAnswers[String(q.id)]}`);

    const combinedInstruction = [
      ...answerParts,
      instruction.trim() ? `הוראה נוספת: ${instruction}` : "",
    ].filter(Boolean).join("\n\n");

    const filteredAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(ps.questionAnswers)) {
      if (v.trim()) filteredAnswers[k] = v;
    }

    const ctx = ps.generationContext;

    const contextPayloadRefine = context.getContextPayload();
    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ctx?.tone || ps.selectedTone,
      category: ctx?.category || ps.selectedCategory,
      capability_mode: ctx?.mode || ps.selectedCapability,
      ...(ctx?.modeParams && { mode_params: ctx.modeParams }),
      previousResult: currentCompletion,
      refinementInstruction: combinedInstruction,
      answers: filteredAnswers,
      iteration: ps.iterationCount + 1,
      ...(contextPayloadRefine.length > 0 && { context: contextPayloadRefine }),
      ...(targetModel !== 'general' && { target_model: targetModel }),
    });

    const refineResult = processStreamResult("Refine");
    if (refineResult.text) {
      recordUsageSignal("refine", refineResult.text);
      dispatch({ type: 'INCREMENT_ITERATION' });
      toast.success("הפרומפט עודכן!");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps.isLoading, ps.completion, ps.questions, ps.questionAnswers, ps.selectedCapability, ps.selectedCategory, ps.selectedTone, ps.input, ps.generationContext, completionScore.score, targetModel, dispatch, startStream]);

  const handleCopyText = useCallback(async (text: string, withWatermark?: boolean) => {
    const shouldWatermark = withWatermark !== undefined ? withWatermark : !isPro;
    const finalText = shouldWatermark ? `${text}\n\n- נוצר עם Peroot | www.peroot.space` : text;
    await navigator.clipboard.writeText(finalText);
    dispatch({ type: 'SET_COPIED', payload: true });
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
    recordUsageSignal("copy", text);
    trackPromptCopy('result');
    toast.success("הועתק ללוח");
  }, [isPro, dispatch]);

  // Keep ref in sync for keyboard shortcut handler
  handleCopyTextRef.current = handleCopyText;

  // Use ref for completion to avoid re-attaching listener on every streaming chunk
  const completionRef = useRef(ps.completion);
  completionRef.current = ps.completion;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (e.key === 'Escape' && !isTyping) {
        if (completionRef.current) {
          dispatch({ type: 'SET_COMPLETION', payload: '' });
        }
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

  const handleShare = useCallback(async () => {
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
      markFeatureUsed("peroot_used_share");
      toast.success("קישור שיתוף נוצר");
    } catch (error) {
      logger.error("[share] Error:", error);
      toast.error("שגיאה בשיתוף");
    }
  }, [user, ps.completion, ps.input, ps.selectedCategory, ps.selectedCapability]);

  // Track where user came from so they can go back
  const [previousView, setPreviousView] = useState<string | null>(null);

  const handleUsePrompt = useCallback((prompt: LibraryPrompt | PersonalPrompt) => {
    setPreviousView(viewMode);
    markFeatureUsed("peroot_used_public_library");
    dispatch({ type: 'SET_INPUT', payload: prompt.prompt });
    dispatch({ type: 'SET_COMPLETION', payload: '' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    setViewMode("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode, dispatch, setViewMode]);

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

  const addPersonalPromptFromHistory = useCallback((item: HistoryItem) => {
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
    addPrompt({
      title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
      prompt: item.enhanced,
      category: item.category,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      capability_mode: CapabilityMode.STANDARD,
      use_case: "נשמר מהיסטוריה",
      source: "manual"
    });
    recordUsageSignal("save", item.enhanced);
    toast.success("נשמר לספריה האישית!");
  }, [user, addPrompt]);

  const saveCompletionToPersonal = useCallback(() => {
    if (!user) {
       showLoginRequired("שמירת פרומפטים");
       return;
    }
    if (!ps.completion.trim()) return;
    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual"
    });
    recordUsageSignal("save", ps.completion);
    markFeatureUsed("peroot_used_personal_library");
    toast.success("נשמר לספריה האישית!");
  }, [user, ps.completion, ps.input, ps.detectedCategory, ps.selectedCategory, ps.selectedCapability, addPrompt]);

  const handleImportHistory = useCallback(async () => {
     if (!user) {
       showLoginRequired("שמירת פרומפטים");
       return;
     }
     const itemsToAdd = history.map(item => ({
       title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
       prompt: item.enhanced,
       category: item.category,
       personal_category: PERSONAL_DEFAULT_CATEGORY,
       capability_mode: CapabilityMode.STANDARD,
       use_case: "נשמר מהיסטוריה",
       source: "manual" as const,
       tags: [] as string[]
     }));
     await addPrompts(itemsToAdd);
     toast.success("כל ההיסטוריה יובאה!");
  }, [user, history, addPrompts]);

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

  // --- Render ---

  const handleTopNavNavigate = useCallback((view: "home" | "library" | "personal") => {
    if (view === "home") setViewMode("home");
    else if (view === "library") handleNavLibrary();
    else if (view === "personal") handleNavPersonal();
  }, [setViewMode, handleNavLibrary, handleNavPersonal]);

  const topNavBar = (
    <TopNavBar viewMode={viewMode} onNavigate={handleTopNavNavigate}>
      <PromptLimitIndicator creditsBalance={creditsRemaining} />
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all border backdrop-blur-md cursor-pointer",
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-[1920px] 2xl:max-w-7xl mx-auto w-full pb-20 md:pb-0">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-500/[0.12] dark:from-amber-500/8 via-red-500/[0.04] dark:via-yellow-500/4 to-transparent blur-3xl -z-10" />

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
        onCtaClick={(action) => {
          if (action === "library") saveCompletionToPersonal();
          else if (action === "share") handleShare();
          else if (action === "research") dispatch({ type: 'SET_CAPABILITY', payload: CapabilityMode.DEEP_RESEARCH });
          else if (action === "image") dispatch({ type: 'SET_CAPABILITY', payload: CapabilityMode.IMAGE_GENERATION });
          else if (action === "chains") setViewMode("personal");
          else if (action === "public-library") handleNavLibrary();
        }}
      />

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar
        activeTab={viewMode}
        onTabChange={(tab) => {
          if (tab === "home") setViewMode("home");
          else if (tab === "library") handleNavLibrary();
          else if (tab === "personal") handleNavPersonal();
          else if (tab === "history") setSidebarOpen(true);
          else if (tab === "faq") setMobileFaqOpen(true);
        }}
      />

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
      />

      {/* Mobile FAQ Panel (extracted component) */}
      <MobileFaqPanel
        isOpen={mobileFaqOpen}
        onClose={() => setMobileFaqOpen(false)}
      />

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
             onClick={() => setShowWhatIsThis(true)}
             className="text-xs md:text-sm text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer -mt-3 md:-mt-2 min-h-[32px] md:min-h-[44px] flex items-center justify-center px-3 md:px-4"
           >
             מה עושים פה?
           </button>

           {/* Did You Know banner — shows one rotating fact per session */}
           {!ps.completion && !ps.isLoading && <DidYouKnowBanner />}

           <LoadingOverlay isVisible={ps.isLoading} />
           <StreamingProgress phase={ps.streamPhase} />

           {!ps.completion && !ps.isLoading ? (
             /* INPUT MODE (extracted component) */
             <InputSection
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
               onAddUrl={context.addUrl}
               onAddImage={context.addImage}
               onRemoveAttachment={context.removeAttachment}
               contextTotalTokens={context.totalTokens}
               contextIsOverLimit={context.isOverLimit}
               targetModel={targetModel}
               setTargetModel={handleSetTargetModel}
               isNewUser={isNewUser}
               user={user}
               previousView={previousView}
               onBackToLibrary={handleBackToLibrary}
             />
           ) : (
             /* RESULT MODE */
             /* TODO: Extract ResultMode into its own component (src/components/features/home/ResultMode.tsx)
                once the InputSection extraction is validated. The result mode section includes
                ResultSection + SmartRefinement and the associated callbacks (handleRefine, saveCompletionToPersonal, etc.) */
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col gap-8">
                 <ErrorBoundary name="ResultSection">
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
                       improvementDelta={ps.previousScore !== null && ps.iterationCount > 0
                         ? completionScore.baseScore - ps.previousScore
                         : completionScore.baseScore - inputScore.baseScore}
                       onVariableChange={(key, val) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: { ...ps.variableValues, [key]: val } })}
                       onImproveAgain={() => {
                         dispatch({ type: 'SET_INPUT', payload: ps.completion });
                         dispatch({ type: 'INCREMENT_ITERATION' });
                         setTimeout(() => handleEnhance(), 0);
                       }}
                       onRetryStream={handleEnhance}
                       onResetToOriginal={() => dispatch({ type: 'RESET_TO_ORIGINAL' })}
                       iterationCount={ps.iterationCount}
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
                   />
                 </ErrorBoundary>

                 {(ps.questions.length > 0 || ps.iterationCount > 0) && (
                    <ErrorBoundary name="SmartRefinement">
                      <SmartRefinement
                         questions={ps.questions}
                         answers={ps.questionAnswers}
                         onAnswerChange={(id, val) => dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id, answer: val } })}
                         onRefine={(instruction) => handleRefine(instruction || "")}
                         isLoading={ps.isLoading}
                      />
                    </ErrorBoundary>
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
    </>
  );
}

export default function HomeClient() {
  const { user } = useHistory();

  return (
    <div className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-[var(--surface-body)] text-[var(--text-primary)] selection:bg-amber-500/30 font-sans pb-10 pt-2 px-4 md:px-6 max-w-[100vw] overflow-x-hidden" dir="rtl">
      <PageContent user={user} />
    </div>
  );
}

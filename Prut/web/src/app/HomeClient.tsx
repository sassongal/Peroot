"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getApiPath } from "@/lib/api-path";
import { toast } from 'sonner';

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

import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { TargetModel } from "@/lib/engines/types";
import { createClient } from "@/lib/supabase/client";
import { useLibraryContext } from "@/context/LibraryContext";
import { useFeatureDiscovery, markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { useContextAttachments } from "@/hooks/useContextAttachments";
import { usePromptLimits } from "@/hooks/usePromptLimits";
import { Clock, Link2 } from "lucide-react";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/context/I18nContext";
import { PromptLimitIndicator } from "@/components/PromptLimitIndicator";

// Dynamic imports for route-level views
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then(mod => mod.LibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" /> }
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then(mod => mod.PersonalLibraryView),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" /> }
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
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-64" /> }
);

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
  const context = useContextAttachments();

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
      let displayText = acc.rawText;

      // Hide from the first `[GENIUS_QUESTIONS]` marker onward during
      // streaming. (Final split uses lastIndexOf — see processStreamResult.)
      const firstGeniusIdx = displayText.indexOf("[GENIUS_QUESTIONS]");
      if (firstGeniusIdx !== -1) {
        displayText = displayText.slice(0, firstGeniusIdx);
      }

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

    // Guard: skip saving partial/interrupted results.
    if (acc.rawText.length < 20) {
      return { text: '', title: null };
    }

    // Split body/questions at the LAST `[GENIUS_QUESTIONS]` marker. Using
    // lastIndexOf protects us from earlier accidental occurrences (e.g.
    // the model echoing the marker in an example or thinking block).
    const GENIUS_MARKER = "[GENIUS_QUESTIONS]";
    const lastGeniusIdx = acc.rawText.lastIndexOf(GENIUS_MARKER);
    let body = lastGeniusIdx !== -1
      ? acc.rawText.slice(0, lastGeniusIdx)
      : acc.rawText;
    const questionsPart = lastGeniusIdx !== -1
      ? acc.rawText.slice(lastGeniusIdx + GENIUS_MARKER.length)
      : '';

    if (lastGeniusIdx !== -1) {
      try {
        let jsonStr = questionsPart.trim();
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        const parsed = jsonStr ? JSON.parse(jsonStr) : [];
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        dispatch({ type: 'SET_QUESTIONS', payload: questions });
      } catch (e) {
        logger.warn(`[${label}] Questions parse failed, attempting recovery`, e);
        const arrayMatch = questionsPart.match(/\[[\s\S]*\]/);
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

    // Strip AI thinking/reasoning tags and their content.
    body = body.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, '').trim();

    // Extract [PROMPT_TITLE]…[/PROMPT_TITLE] with dotall-safe regex (the
    // title may contain newlines when the model wraps it weirdly).
    const titleMatch = body.match(/\[PROMPT_TITLE\]([\s\S]*?)\[\/PROMPT_TITLE\]/);
    const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
    body = body.replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]\n?/g, '').trim();

    // Defensive cleanup: if an earlier, accidental `[GENIUS_QUESTIONS]`
    // leaked into the body (lastIndexOf guarded the split, but the body
    // may still contain the literal marker string), strip it so copy /
    // save / display never show the raw delimiter.
    body = body.replace(/\[GENIUS_QUESTIONS\]/g, '').trim();

    // Persist the cleaned body back to the ref so any downstream reader
    // (copy, save, refine) sees the canonical final text, not the raw
    // buffer with markers and thinking blocks still in it.
    acc.rawText = body;

    dispatch({ type: 'SET_COMPLETION', payload: body });

    const extracted = extractPlaceholders(body);
    const newVars = { ...variableValuesRef.current };
    extracted.forEach(ph => { if (!(ph in newVars)) newVars[ph] = ""; });
    dispatch({ type: 'SET_VARIABLE_VALUES', payload: newVars });

    // Fetch saved variable values for auto-fill (authenticated users only)
    if (extracted.length > 0 && user) {
      const emptyKeys = extracted.filter(ph => !newVars[ph]);
      if (emptyKeys.length > 0) {
        fetch(getApiPath(`/api/user-variables?keys=${emptyKeys.join(",")}`))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (!data?.variables) return;
            const merged = { ...variableValuesRef.current };
            const filled: string[] = [];
            for (const [key, value] of Object.entries(data.variables as Record<string, string>)) {
              if (key in merged && !merged[key] && value) {
                merged[key] = value;
                filled.push(key);
              }
            }
            if (filled.length > 0) {
              dispatch({ type: 'SET_VARIABLE_VALUES', payload: merged });
              dispatch({ type: 'SET_PREFILLED_KEYS', payload: filled });
            }
          })
          .catch(() => {}); // non-critical
      }
    }

    return { text: body, title: generatedTitle };
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

    if (context.isOverLimit) {
      toast.error("יש יותר מדי context — הסירו קובץ לפני שדרוג");
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
    streamAccRef.current = { rawText: "" };

    const enhanceStart = Date.now();
    trackPromptEnhance(ps.selectedCategory, ps.selectedCapability, ps.input.length);

    const contextPayload = context.getContextPayload();

    // Auto-detect input language (Hebrew vs English)
    const hebrewChars = (ps.input.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = ps.input.replace(/\s/g, '').length;
    const detectedLang = totalChars > 0 && hebrewChars / totalChars < 0.3 ? 'en' : 'he';

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
      ...(currentModeParams && { mode_params: currentModeParams }),
      ...(contextPayload.length > 0 && { context: contextPayload }),
      ...(targetModel !== 'general' && { target_model: targetModel }),
      ...(detectedLang === 'en' && { mode_params: { ...currentModeParams, input_language: 'en' } }),
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
        const newCredits = Math.max(0, creditsRemaining - 1);
        setCreditsRemaining(newCredits);
        if (newCredits === 0) {
          toast("הקרדיטים נגמרו — הם מתחדשים כל יום בשעה 14:00", { duration: 8000 });
        }
      }
      if (!user) {
        incrementUsage();
      }

      toast.success(t.prompt_generator.success_toast);
      discovery.onEnhanceComplete();

      // Pro preview nudge: after 3rd enhance for free users (once per session)
      if (user && creditsRemaining !== null && creditsRemaining <= 0) {
        // Already handled by UpgradeNudge
      } else if (user && !sessionStorage.getItem('pro_nudge_shown')) {
        const enhanceCount = parseInt(sessionStorage.getItem('session_enhance_count') || '0') + 1;
        sessionStorage.setItem('session_enhance_count', String(enhanceCount));
        if (enhanceCount === 3) {
          sessionStorage.setItem('pro_nudge_shown', '1');
          setTimeout(() => {
            toast("משתמשי Pro מקבלים מודלים מתקדמים לתוצאות טובות יותר", {
              action: { label: "לשדרוג", onClick: () => window.location.href = "/pricing" },
              duration: 6000,
            });
          }, 2000);
        }
      }

      // Clear attachments after successful enhance to prevent stale context on next prompt
      if (context.attachments.length > 0) {
        context.clearAll();
      }
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
    streamAccRef.current = { rawText: "" };

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

  // Save-and-favorite: one-tap action that saves the current completion
  // to the personal library AND marks it as a favorite. This is the
  // star-icon replacement for the old thumbs-up — the "keeper" signal
  // users asked for on the result card. Uses the id returned by
  // addPrompt to immediately toggle favorite state, so the star lights
  // up in the library the moment the user hits the star.
  const saveCompletionAsFavorite = useCallback(async () => {
    if (!user) {
       showLoginRequired("שמירת מועדפים");
       return;
    }
    if (!ps.completion.trim()) return;
    const newId = await addPrompt({
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
    if (newId) {
      await handleToggleFavorite("personal", newId);
      toast.success("נשמר ונוסף למועדפים ⭐");
    } else {
      // addPrompt returned undefined when a fuzzy duplicate was found.
      // The dedupe toast already fired — no second toast here.
    }
  }, [user, ps.completion, ps.input, ps.detectedCategory, ps.selectedCategory, ps.selectedCapability, addPrompt, handleToggleFavorite, showLoginRequired]);

  const saveAsTemplate = useCallback(() => {
    if (!user) {
       showLoginRequired("שמירת תבניות");
       return;
    }
    if (!ps.completion.trim()) return;

    // Extract {variable} placeholders from the enhanced prompt
    const varMatches = ps.completion.match(/\{([a-z_]+)\}/gi) || [];
    const variables = [...new Set(varMatches.map(v => v.replace(/[{}]/g, '')))];

    if (variables.length === 0) {
      toast.error("הפרומפט לא מכיל משתנים {variable} — הוסיפו משתנים כדי ליצור תבנית");
      return;
    }

    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "תבנית לשימוש חוזר",
      source: "manual",
      is_template: true,
      template_variables: variables,
    });
    recordUsageSignal("save", ps.completion);
    toast.success(`תבנית נשמרה עם ${variables.length} משתנים!`);
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
      <button
        onClick={handleOpenChainsFromNav}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 cursor-pointer"
        aria-label="שרשראות"
        title="שרשראות פרומפטים"
      >
        <Link2 className="w-4 h-4" />
        <span className="hidden md:inline">שרשראות</span>
      </button>
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
    <HomeViewChrome
      viewMode={viewMode}
      onTabChange={handleMobileTabChange}
      discovery={discovery}
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
          creditsRemaining={creditsRemaining}
          isNewUser={isNewUser}
          user={user}
          previousView={previousView}
          onBackToLibrary={handleBackToLibrary}
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
    <div ref={wrapperRef} className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-[var(--surface-body)] text-[var(--text-primary)] selection:bg-amber-500/30 font-sans pb-10 pt-2 px-4 md:px-6 max-w-[100vw] overflow-x-hidden" dir="rtl">
      <PageContent />
    </div>
  );
}

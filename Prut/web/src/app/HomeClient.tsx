"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getApiPath } from "@/lib/api-path";
import { toast } from "sonner";

import {
  trackPromptEnhance,
  trackEnhanceComplete,
  trackPromptCopy,
  identifyUser,
} from "@/lib/analytics";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { PERSONAL_DEFAULT_CATEGORY, getCategoryLabel } from "@/lib/constants";
import { PLAN_CONTEXT_LIMITS } from "@/lib/plans";
import { CapabilityMode } from "@/lib/capability-mode";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { UserMenu } from "@/components/layout/user-nav";
import dynamic from "next/dynamic";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useConfirm } from "@/components/ui/ConfirmDialog";

import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { LibraryPrompt, PersonalPrompt, Question } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { stripTrailerForDisplay } from "@/lib/prompt-stream/trailer";
import { EnhancedScorer } from "@/lib/engines/scoring/enhanced-scorer";
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
import { TargetModel, OutputLanguage } from "@/lib/engines/types";
import { voiceLangToOutputLang, type VoiceLang } from "@/hooks/useVoiceRecorder";
import { createClient } from "@/lib/supabase/client";
import { useLibraryContext } from "@/context/LibraryContext";
import { useFeatureDiscovery, markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { useContextAttachments } from "@/hooks/useContextAttachments";
import { consumePendingPrompt, setPendingPrompt } from "@/lib/pending-prompt";
import { usePromptLimits } from "@/hooks/usePromptLimits";
import { Clock, Link2 } from "lucide-react";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion, type StreamError } from "@/hooks/useStreamingCompletion";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/context/I18nContext";
import { PromptLimitIndicator } from "@/components/PromptLimitIndicator";

// Dynamic imports for route-level views
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then((mod) => mod.LibraryView),
  {
    ssr: false,
    loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" />,
  },
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then((mod) => mod.PersonalLibraryView),
  {
    ssr: false,
    loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-96" />,
  },
);

// Extracted components — InputSection + HomeViewChrome are above the fold,
// so they stay static. The rest load on demand to keep the initial JS lean.
import { InputSection } from "@/components/features/home/InputSection";
import { HomeViewChrome } from "@/components/features/home/HomeViewChrome";

const SidebarDrawer = dynamic(
  () => import("@/components/features/home/SidebarDrawer").then((m) => m.SidebarDrawer),
  { ssr: false, loading: () => null },
);
const MobileFaqPanel = dynamic(
  () => import("@/components/features/home/MobileFaqPanel").then((m) => m.MobileFaqPanel),
  { ssr: false, loading: () => null },
);
const HomeResultSection = dynamic(
  () => import("@/components/features/home/HomeResultSection").then((m) => m.HomeResultSection),
  {
    ssr: false,
    loading: () => <div className="animate-pulse rounded-xl bg-[var(--glass-bg)] h-64" />,
  },
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
  const {
    user,
    history,
    addToHistory,
    clearHistory,
    updateHistoryTitle,
    bumpHistoryLastUsed,
    isLoaded,
  } = useHistory();
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
    isPersonalLoaded,
    incrementUseCount,
    handleToggleFavorite,
  } = useLibraryContext();

  const { state: ps, dispatch } = usePromptWorkflow();
  const { isPro } = useSubscription();
  const { canUsePrompt, requiredAction, incrementUsage, isPro: isProPlan } = usePromptLimits();
  const discovery = useFeatureDiscovery();
  const context = useContextAttachments({ tier: isPro ? "pro" : "free" });

  const variableValuesRef = useRef(ps.variableValues);
  variableValuesRef.current = ps.variableValues;

  // Batched debounced auto-save for variable memory
  const pendingVarsRef = useRef<Record<string, string>>({});
  const saveVarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVariable = useCallback(
    (key: string, value: string) => {
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
    },
    [user],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (saveVarTimeoutRef.current) clearTimeout(saveVarTimeoutRef.current);
    };
  }, []);

  const [imagePlatform, setImagePlatform] = useState<ImagePlatform>("general");
  const [imageOutputFormat, setImageOutputFormat] = useState<ImageOutputFormat>("text");
  const [imageAspectRatio, setImageAspectRatio] = useState("");
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>("general");
  const [videoAspectRatio, setVideoAspectRatio] = useState("");
  // Always start with "general" on both server and client to prevent hydration
  // mismatch. Persisted value is restored in a post-mount effect below.
  const [targetModel, setTargetModel] = useState<TargetModel>("general");
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("he-IL");
  const outputLanguage: OutputLanguage = voiceLangToOutputLang(voiceLang);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("peroot_target_model");
      const valid: TargetModel[] = ["chatgpt", "claude", "gemini", "general"];
      if (stored && valid.includes(stored as TargetModel)) {
        // Hydration-safe restore of persisted preference: must run post-mount
        // so server (no localStorage) and first client render match.
        setTargetModel(stored as TargetModel);
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  const handleSetTargetModel = useCallback((model: TargetModel) => {
    setTargetModel(model);
    try {
      localStorage.setItem("peroot_target_model", model);
    } catch {
      // QuotaExceededError or unavailable — state updated, persistence skipped
    }
  }, []);

  const inputRef = useRef(ps.input);
  inputRef.current = ps.input;

  // Recent personal prompts (sorted by last_used_at, only those that have been used)
  const recentPersonalPrompts = useMemo(() => {
    return personalLibrary
      .filter((p) => p.last_used_at)
      .sort((a, b) => {
        const aTime = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bTime = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [personalLibrary]);

  const setInputVal = useCallback(
    (action: SetStateAction<string>) => {
      if (typeof action === "function") {
        dispatch({ type: "SET_INPUT", payload: action(inputRef.current) });
      } else {
        dispatch({ type: "SET_INPUT", payload: action });
      }
    },
    [dispatch],
  );

  // Single raw buffer — we never drop or redirect incoming chunks. The
  // promptText / questionsPart split happens ONLY at stream-end, on the
  // final rawText, so an accidental or early `[GENIUS_QUESTIONS]` in the
  // model output can't cause the "missing middle" bug where the rest of
  // the prompt body is misrouted into the questions buffer and lost.
  const streamAccRef = useRef({ rawText: "" });
  // Set when the stream is cut mid-response so the success branch can bail out
  // instead of saving the partial prompt as complete + spending a credit.
  const streamInterruptedRef = useRef(false);
  const questionsAbortRef = useRef<AbortController | null>(null);
  // Structured fields from the last stream error (code/balance/refresh_at), so
  // the UI can distinguish quota_exhausted from a generic failure.
  const lastStreamErrorRef = useRef<StreamError | null>(null);

  const { startStream, abort: abortStream } = useStreamingCompletion({
    onChunk: useCallback(
      (chunk: string) => {
        const acc = streamAccRef.current;
        acc.rawText += chunk;

        // Derive a safe display string from the raw buffer. We only HIDE
        // trailing auxiliary blocks; we never truncate the canonical buffer.
        let displayText = acc.rawText;

        // Hide the prompt-trailer for display: everything from the first
        // line-boundary `[GENIUS_QUESTIONS]` onward (fixing the old indexOf
        // false-positive on a mid-body echo) plus the [PROMPT_TITLE] block.
        displayText = stripTrailerForDisplay(displayText);

        // Strip <thinking> blocks — both fully-closed and unclosed trailing.
        // (Not part of the trailer contract, so handled here.)
        displayText = displayText
          .replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, "")
          .replace(/<thinking>[\s\S]*$/gi, "");

        dispatch({ type: "SET_COMPLETION", payload: displayText });
      },
      [dispatch],
    ),
    onDone: useCallback(() => {
      dispatch({ type: "STREAM_DONE" });
    }, [dispatch]),
    onError: useCallback(
      (error: Error) => {
        lastStreamErrorRef.current = error as StreamError;
        dispatch({ type: "SET_ERROR", payload: error.message });
      },
      [dispatch],
    ),
    onInterrupted: useCallback(() => {
      streamInterruptedRef.current = true;
      dispatch({ type: "STREAM_INTERRUPTED" });
    }, [dispatch]),
  });

  const confirmDialog = useConfirm();

  // Sidebar & mobile FAQ state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileFaqOpen, setMobileFaqOpen] = useState(false);

  // User / Auth State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Modals
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginRequiredConfig, setLoginRequiredConfig] = useState<{
    title?: string;
    message?: string;
    feature?: string;
  }>({});
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);

  // --- Effects ---

  // Shared-chain deep link: when a user opens `?chain=<base64>`, decode
  // the payload, navigate to personal view, and hand off to
  // PersonalLibraryGrid to import via useChains (single source of truth
  // for dedupe/validation). The URL is cleaned up so reloads don't
  // re-import the same chain. Invalid payloads are silently ignored
  // because HomeClient mounts on every route entry.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get("chain");
    if (!encoded) return;
    (async () => {
      const { decodeSharedChain } = await import("@/lib/chains/share-url");
      const payload = decodeSharedChain(encoded);
      // Clean up the URL regardless of validity so a reload doesn't retry.
      url.searchParams.delete("chain");
      window.history.replaceState({}, "", url.toString());
      if (!payload) return;
      // Navigate to personal view and dispatch the import event; the
      // PersonalLibraryGrid listener will call importChain + toast.
      handleNavPersonal();
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("peroot:import-shared-chain", {
            detail: {
              json: JSON.stringify({
                title: payload.title,
                description: payload.description,
                steps: payload.steps,
              }),
            },
          }),
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
      document.cookie = "referral_bonus=; path=/; max-age=0";
    }
  }, []);

  // Identify user in PostHog when logged in (include plan so server-side funnels segment correctly)
  useEffect(() => {
    if (user) {
      identifyUser(user.id, { email: user.email, plan: isPro ? "pro" : "free" });
    }
  }, [user, isPro]);

  // Fetch credits + onboarding status in a single query
  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("credits_balance, onboarding_completed")
      .eq("id", user.id)
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
  const handleCopyTextRef = useRef<
    ((text: string, withWatermark?: boolean) => Promise<void>) | null
  >(null);

  // --- Logic ---

  // Show upgrade popup when user hits rate limit or runs out of credits.
  // Never show for Pro/admin — they don't need to upgrade, they need to wait.
  useEffect(() => {
    if (!ps.error) return;
    const code = lastStreamErrorRef.current?.code;
    // Prefer the server's structured code; fall back to message keywords for
    // older/edge responses that don't carry one.
    const err = ps.error.toLowerCase();
    const isQuota =
      code === "quota_exhausted" ||
      code === "guest_quota_exhausted" ||
      err.includes("too many") ||
      err.includes("insufficient") ||
      err.includes("http 429") ||
      err.includes("http 403");
    if (!isQuota) return;
    if (!user || code === "guest_quota_exhausted") {
      // Guest hit the limit → the path forward is to sign up, not "upgrade".
      // Preserve their prompt so it's restored after signup.
      if (ps.input.trim()) setPendingPrompt({ prompt: ps.input, source: "home-quota-wall" });
      setLoginRequiredConfig({
        feature: "נגמרו הפרומפטים להיום",
        message: "המשך שדרוג פרומפטים דורש התחברות. ההרשמה חינמית ומעניקה עוד קרדיטים!",
      });
      setIsLoginRequiredModalOpen(true);
    } else if (!isProPlan) {
      setShowUpgradeNudge(true);
    }
  }, [ps.error, ps.input, user, isProPlan]);

  // Pro/admin users don't get the upgrade nudge — they need actual error feedback
  // so a silent failure doesn't leave them staring at a blank screen.
  useEffect(() => {
    if (ps.error && user && isProPlan) {
      toast.error(ps.error);
    }
  }, [ps.error, user, isProPlan]);

  // Fallback feedback for EVERYONE else. Previously a generic failure (HTTP 500,
  // "No response body", network drop) was surfaced only via the Pro toast and the
  // rate-limit nudge — so guests and free users whose error wasn't a rate-limit
  // keyword got zero feedback and silently bounced back to the empty screen.
  useEffect(() => {
    if (!ps.error) return;
    if (user && isProPlan) return; // handled by the Pro toast above
    const err = ps.error.toLowerCase();
    const isRateLimit =
      err.includes("too many") ||
      err.includes("insufficient") ||
      err.includes("http 429") ||
      err.includes("http 403") ||
      err.includes("quota");
    if (user && !isProPlan && isRateLimit) return; // free user → upgrade nudge handles it
    toast.error("השדרוג נכשל. נסו שוב בעוד רגע.");
  }, [ps.error, user, isProPlan]);

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || t.home.login_required_msg.replace("{feature}", feature),
    });
    setIsLoginRequiredModalOpen(true);
  };

  // Debounce scoring
  const debouncedInput = useDebouncedValue(ps.input, 300);
  const debouncedCompletion = useDebouncedValue(ps.completion, 200);

  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(debouncedInput, ps.selectedCapability),
    [debouncedInput, ps.selectedCapability],
  );
  // Live, mode-aware input score — drives the pill + breakdown drawer in
  // PromptInput. Separate from `inputScore` (which is kept only for telemetry
  // at trackEnhanceComplete and for analytic score tracking).
  const liveInputScore = useMemo(
    () => scoreInput(debouncedInput, ps.selectedCapability),
    [debouncedInput, ps.selectedCapability],
  );
  // IMPORTANT: The result-section header score must match the numbers shown
  // inside the score-breakdown drawer and the PDF export. Both of those use
  // EnhancedScorer, so compute the header score from the same source to
  // avoid a silent mismatch (e.g. header says 100 but the drawer breakdown
  // sums to a different total). We synthesize a PromptScore-shaped object
  // so ResultSection continues to work unchanged.
  const completionScore = useMemo(() => {
    const trimmed = debouncedCompletion.trim();
    if (!trimmed) {
      return {
        score: 0,
        baseScore: 0,
        level: "empty" as const,
        label: "חסר",
        tips: [],
        usageBoost: 0,
      };
    }
    const enhanced = EnhancedScorer.score(debouncedCompletion, ps.selectedCapability);
    const level: "low" | "medium" | "high" =
      enhanced.total >= 70 ? "high" : enhanced.total >= 40 ? "medium" : "low";
    return {
      score: enhanced.total,
      baseScore: enhanced.total,
      level,
      label: enhanced.label,
      tips: enhanced.topWeaknesses.slice(0, 3),
      usageBoost: 0,
    };
  }, [debouncedCompletion, ps.selectedCapability]);

  // Debounce placeholder extraction
  const placeholders = useMemo(
    () => extractPlaceholders(debouncedCompletion),
    [debouncedCompletion],
  );
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
    dispatch({ type: "SET_INPUT", payload: next });
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

  const processStreamResult = (
    label: string,
    fetchQuestionsParams?: {
      prompt: string;
      category: string;
      tone: string;
      capability_mode: string;
      contextPayload: unknown[];
      iteration?: number;
      previousQuestionIds?: number[];
    },
  ) => {
    const acc = streamAccRef.current;

    // Guard: skip saving partial/interrupted results.
    if (acc.rawText.length < 20) {
      return { text: "", title: null };
    }

    // Split body/questions at the LAST `[GENIUS_QUESTIONS]` marker. Using
    // lastIndexOf protects us from earlier accidental occurrences (e.g.
    // the model echoing the marker in an example or thinking block).
    const GENIUS_MARKER = "[GENIUS_QUESTIONS]";
    const lastGeniusIdx = acc.rawText.lastIndexOf(GENIUS_MARKER);
    let body = lastGeniusIdx !== -1 ? acc.rawText.slice(0, lastGeniusIdx) : acc.rawText;
    const questionsPart =
      lastGeniusIdx !== -1 ? acc.rawText.slice(lastGeniusIdx + GENIUS_MARKER.length) : "";

    if (lastGeniusIdx !== -1) {
      try {
        let jsonStr = questionsPart.trim();
        if (jsonStr.startsWith("```json"))
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        if (jsonStr.startsWith("```"))
          jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        const parsed = jsonStr ? JSON.parse(jsonStr) : [];
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        dispatch({ type: "SET_QUESTIONS", payload: questions });
      } catch (e) {
        logger.warn(`[${label}] Questions parse failed, attempting recovery`, e);
        const arrayMatch = questionsPart.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            dispatch({ type: "SET_QUESTIONS", payload: JSON.parse(arrayMatch[0]) });
          } catch {
            dispatch({ type: "SET_QUESTIONS", payload: [] });
          }
        } else {
          dispatch({ type: "SET_QUESTIONS", payload: [] });
        }
      }
    } else if (fetchQuestionsParams && body.length > 20) {
      dispatch({ type: "SET_QUESTIONS_LOADING", payload: true });
      questionsAbortRef.current?.abort();
      const abort = new AbortController();
      questionsAbortRef.current = abort;
      fetch(getApiPath("/api/enhance/questions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fetchQuestionsParams.prompt,
          enhancedPrompt: body,
          category: fetchQuestionsParams.category,
          tone: fetchQuestionsParams.tone,
          capability_mode: fetchQuestionsParams.capability_mode,
          ...(fetchQuestionsParams.iteration !== undefined && {
            iteration: fetchQuestionsParams.iteration,
          }),
          ...(fetchQuestionsParams.contextPayload.length > 0 && {
            context: fetchQuestionsParams.contextPayload,
          }),
          ...(fetchQuestionsParams.previousQuestionIds?.length && {
            previousQuestionIds: fetchQuestionsParams.previousQuestionIds,
          }),
        }),
        signal: abort.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { questions?: Question[] } | null) => {
          if (abort.signal.aborted) return;
          const qs = Array.isArray(data?.questions) ? data.questions : [];
          dispatch({ type: "SET_QUESTIONS", payload: qs });
        })
        .catch((err: Error) => {
          if (err?.name === "AbortError") return;
          logger.warn(`[${label}] Questions fetch failed`, err);
          dispatch({ type: "SET_QUESTIONS", payload: [] });
        });
    } else {
      dispatch({ type: "SET_QUESTIONS", payload: [] });
    }

    // Strip AI thinking/reasoning tags and their content.
    body = body.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, "").trim();

    // Extract [PROMPT_TITLE]…[/PROMPT_TITLE] with dotall-safe regex (the
    // title may contain newlines when the model wraps it weirdly).
    const titleMatch = body.match(/\[PROMPT_TITLE\]([\s\S]*?)\[\/PROMPT_TITLE\]/);
    const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
    body = body.replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]\n?/g, "").trim();

    // Defensive cleanup: if an earlier, accidental `[GENIUS_QUESTIONS]`
    // leaked into the body (lastIndexOf guarded the split, but the body
    // may still contain the literal marker string), strip it so copy /
    // save / display never show the raw delimiter.
    body = body.replace(/\[GENIUS_QUESTIONS\]/g, "").trim();

    // Persist the cleaned body back to the ref so any downstream reader
    // (copy, save, refine) sees the canonical final text, not the raw
    // buffer with markers and thinking blocks still in it.
    acc.rawText = body;

    dispatch({ type: "SET_COMPLETION", payload: body });

    const extracted = extractPlaceholders(body);
    const newVars = { ...variableValuesRef.current };
    extracted.forEach((ph) => {
      if (!(ph in newVars)) newVars[ph] = "";
    });
    dispatch({ type: "SET_VARIABLE_VALUES", payload: newVars });

    // Fetch saved variable values for auto-fill (authenticated users only)
    if (extracted.length > 0 && user) {
      const emptyKeys = extracted.filter((ph) => !newVars[ph]);
      if (emptyKeys.length > 0) {
        fetch(getApiPath(`/api/user-variables?keys=${emptyKeys.join(",")}`))
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
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
              dispatch({ type: "SET_VARIABLE_VALUES", payload: merged });
              dispatch({ type: "SET_PREFILLED_KEYS", payload: filled });
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
    dispatch({ type: "SET_INPUT", payload: randomPrompt.prompt });
    toast.success(`"${randomPrompt.title}" נטען!`);
  };

  const handleEnhance = useCallback(
    async (textOverride?: string) => {
      // textOverride lets "שפר שוב" refine the generated result instead of the
      // stale original input (the closure's ps.input hasn't updated yet).
      const inputText = textOverride ?? ps.input;
      if (!inputText.trim() || ps.isLoading || enhanceCooldownRef.current) return;

      enhanceCooldownRef.current = true;
      setTimeout(() => {
        enhanceCooldownRef.current = false;
      }, 500);

      // Block immediately when credits hit 0 — avoid wasting an API round trip.
      // Pro/admin: skip — server auto-refreshes at spend time; local counter is stale.
      if (user && !isProPlan && creditsRemaining !== null && creditsRemaining <= 0) {
        setShowUpgradeNudge(true);
        return;
      }

      if (!canUsePrompt) {
        if (requiredAction === "login") {
          // Preserve the prompt they just typed so it's restored after signup,
          // instead of returning them to an empty box at the conversion moment.
          if (inputText.trim()) setPendingPrompt({ prompt: inputText, source: "home-quota-wall" });
          showLoginRequired(
            "יצירת פרומפט",
            "כדי ליצור פרומפטים מקצועיים, יש להתחבר לחשבון. ההרשמה חינמית!",
          );
        } else if (requiredAction === "upgrade") {
          setShowUpgradeNudge(true);
        }
        return;
      }

      if (context.isOverLimit) {
        toast.error("יש יותר מדי context — הסירו קובץ לפני שדרוג");
        return;
      }

      const erroredAttachments = context.attachments.filter((a) => a.status === "error");
      if (erroredAttachments.length > 0) {
        toast.warning(
          `${erroredAttachments.length === 1 ? "קובץ אחד" : `${erroredAttachments.length} קבצים`} לא עובדו בהצלחה ולא יכללו בקונטקסט — הסירו אותם או נסו שוב`,
          { duration: 5000 },
        );
      }

      const currentModeParams: Record<string, string> | undefined =
        ps.selectedCapability === CapabilityMode.IMAGE_GENERATION
          ? {
              image_platform: imagePlatform,
              output_format: imageOutputFormat,
              ...(imageAspectRatio && { aspect_ratio: imageAspectRatio }),
            }
          : ps.selectedCapability === CapabilityMode.VIDEO_GENERATION
            ? {
                video_platform: videoPlatform,
                ...(videoAspectRatio && { aspect_ratio: videoAspectRatio }),
              }
            : undefined;

      dispatch({ type: "START_STREAM" });
      dispatch({ type: "SET_QUESTIONS", payload: [] });
      dispatch({
        type: "SET_GENERATION_CONTEXT",
        payload: {
          mode: ps.selectedCapability,
          modeParams: currentModeParams,
          category: ps.selectedCategory,
          tone: ps.selectedTone,
        },
      });
      streamAccRef.current = { rawText: "" };
      streamInterruptedRef.current = false;

      const enhanceStart = Date.now();
      trackPromptEnhance(ps.selectedCategory, ps.selectedCapability, inputText.length);

      const contextPayload = context.getContextPayload();

      // Auto-detect input language (Hebrew vs English)
      const hebrewChars = (inputText.match(/[\u0590-\u05FF]/g) || []).length;
      const totalChars = inputText.replace(/\s/g, "").length;
      const detectedLang = totalChars > 0 && hebrewChars / totalChars < 0.3 ? "en" : "he";

      await startStream(getApiPath("/api/enhance"), {
        prompt: inputText,
        tone: ps.selectedTone,
        category: ps.selectedCategory,
        capability_mode: ps.selectedCapability,
        ...(currentModeParams && { mode_params: currentModeParams }),
        ...(contextPayload.length > 0 && { context: contextPayload }),
        ...(targetModel !== "general" && { target_model: targetModel }),
        ...(outputLanguage !== "hebrew" && { output_language: outputLanguage }),
        ...(detectedLang === "en" && {
          mode_params: { ...currentModeParams, input_language: "en" },
        }),
      });

      questionsAbortRef.current?.abort();
      const result = processStreamResult("Enhance", {
        prompt: inputText,
        category: ps.selectedCategory,
        tone: ps.selectedTone,
        capability_mode: ps.selectedCapability,
        contextPayload,
      });
      if (result.text && !streamInterruptedRef.current) {
        trackEnhanceComplete(ps.selectedCapability, inputScore.score, Date.now() - enhanceStart);
        recordUsageSignal("enhance", result.text);
        if (ps.selectedCapability === CapabilityMode.DEEP_RESEARCH)
          markFeatureUsed("peroot_used_research");
        if (ps.selectedCapability === CapabilityMode.IMAGE_GENERATION)
          markFeatureUsed("peroot_used_image");
        dispatch({ type: "SET_DETECTED_CATEGORY", payload: ps.selectedCategory });

        addToHistory({
          original: inputText,
          enhanced: result.text,
          tone: ps.selectedTone,
          category: ps.selectedCategory,
          title: result.title || inputText.slice(0, 40) + (inputText.length > 40 ? "..." : ""),
        });

        if (user && creditsRemaining !== null) {
          const newCredits = Math.max(0, creditsRemaining - 1);
          setCreditsRemaining(newCredits);
          if (newCredits === 0 && !isProPlan) {
            toast("הקרדיטים נגמרו — הם מתחדשים 24 שעות לאחר השימוש", { duration: 8000 });
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
        } else if (user && !sessionStorage.getItem("pro_nudge_shown")) {
          const enhanceCount = parseInt(sessionStorage.getItem("session_enhance_count") || "0") + 1;
          sessionStorage.setItem("session_enhance_count", String(enhanceCount));
          if (enhanceCount === 3) {
            sessionStorage.setItem("pro_nudge_shown", "1");
            setTimeout(() => {
              toast("משתמשי Pro מקבלים מודלים מתקדמים לתוצאות טובות יותר", {
                action: { label: "לשדרוג", onClick: () => (window.location.href = "/pricing") },
                duration: 6000,
              });
            }, 2000);
          }
        }
      }
    },
    [
      ps.input,
      ps.isLoading,
      ps.selectedCapability,
      ps.selectedCategory,
      ps.selectedTone,
      canUsePrompt,
      requiredAction,
      user,
      creditsRemaining,
      dispatch,
      startStream,
      inputScore.score,
      imagePlatform,
      imageOutputFormat,
      imageAspectRatio,
      videoPlatform,
      videoAspectRatio,
      targetModel,
      outputLanguage,
      addToHistory,
      incrementUsage,
      t,
      discovery.onEnhanceComplete,
    ],
  );

  const handleRefine = useCallback(
    async (instruction: string) => {
      if (ps.isLoading) return;
      const hasAnswers = Object.values(ps.questionAnswers).some((a) => a.trim());
      if ((!instruction.trim() && !hasAnswers) || !ps.completion) return;

      const currentCompletion = ps.completion;

      dispatch({ type: "SET_PREVIOUS_SCORE", payload: completionScore.score });
      dispatch({ type: "START_STREAM" });
      streamAccRef.current = { rawText: "" };
      streamInterruptedRef.current = false;

      const answerParts = ps.questions
        .filter((q) => ps.questionAnswers[String(q.id)]?.trim())
        .map((q) => `שאלה: ${q.question}\nתשובה: ${ps.questionAnswers[String(q.id)]}`);

      const combinedInstruction = [
        ...answerParts,
        instruction.trim() ? `הוראה נוספת: ${instruction}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

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
        ...(targetModel !== "general" && { target_model: targetModel }),
        ...(outputLanguage !== "hebrew" && { output_language: outputLanguage }),
      });

      const answeredIds = ps.questions
        .filter((q) => ps.questionAnswers[String(q.id)]?.trim())
        .map((q) => q.id);
      questionsAbortRef.current?.abort();
      const refineResult = processStreamResult("Refine", {
        prompt: ps.input,
        category: ctx?.category || ps.selectedCategory,
        tone: ctx?.tone || ps.selectedTone,
        capability_mode: ctx?.mode || ps.selectedCapability,
        contextPayload: contextPayloadRefine,
        iteration: ps.iterationCount + 1,
        previousQuestionIds: answeredIds,
      });
      if (refineResult.text && !streamInterruptedRef.current) {
        recordUsageSignal("refine", refineResult.text);
        dispatch({ type: "INCREMENT_ITERATION" });
        toast.success("הפרומפט עודכן!");
      }
    },
    [
      ps.isLoading,
      ps.completion,
      ps.questions,
      ps.questionAnswers,
      ps.selectedCapability,
      ps.selectedCategory,
      ps.selectedTone,
      ps.input,
      ps.generationContext,
      completionScore.score,
      targetModel,
      outputLanguage,
      dispatch,
      startStream,
    ],
  );

  const handleCopyText = useCallback(
    async (text: string, withWatermark?: boolean) => {
      const shouldWatermark = withWatermark !== undefined ? withWatermark : !isPro;
      const finalText = shouldWatermark ? `${text}\n\n- נוצר עם Peroot | www.peroot.space` : text;
      await navigator.clipboard.writeText(finalText);
      dispatch({ type: "SET_COPIED", payload: true });
      setTimeout(() => dispatch({ type: "SET_COPIED", payload: false }), 2000);
      recordUsageSignal("copy", text);
      trackPromptCopy("result");
      toast.success("הועתק ללוח");
    },
    [isPro, dispatch],
  );

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

      if (e.key === "Escape" && !isTyping) {
        if (completionRef.current) {
          // Styled, RTL, non-blocking replacement for the native confirm().
          void confirmDialog({
            title: "למחוק את התוצאה?",
            danger: true,
            confirmLabel: "מחק",
          }).then((ok) => {
            if (ok) dispatch({ type: "SET_COMPLETION", payload: "" });
          });
        }
      }
      // Cmd+Enter or Ctrl+Enter to enhance
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleEnhanceRef.current?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        if (completionRef.current) {
          e.preventDefault();
          handleCopyTextRef.current?.(completionRef.current);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        setViewMode("personal");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        if (!isTyping) {
          e.preventDefault();
          setSidebarOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, setViewMode, setSidebarOpen, confirmDialog]);

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

  const handleUsePrompt = useCallback(
    (prompt: LibraryPrompt | PersonalPrompt) => {
      setPreviousView(viewMode);
      markFeatureUsed("peroot_used_public_library");

      // Templates: load directly into completion (skip re-enhance, show variable inputs)
      if ("is_template" in prompt && prompt.is_template) {
        dispatch({ type: "SET_INPUT", payload: prompt.title || "" });
        dispatch({ type: "SET_COMPLETION", payload: prompt.prompt });
        dispatch({ type: "SET_QUESTIONS", payload: [] });
        toast.success("תבנית נטענה — מלאו את המשתנים");
      } else {
        dispatch({ type: "SET_INPUT", payload: prompt.prompt });
        dispatch({ type: "SET_COMPLETION", payload: "" });
        dispatch({ type: "SET_QUESTIONS", payload: [] });
      }

      setViewMode("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [viewMode, dispatch, setViewMode],
  );

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
      title: pending.title ?? "",
      prompt: pending.prompt,
      category: pending.category ?? PERSONAL_DEFAULT_CATEGORY,
      is_template: !!pending.is_template,
    } as unknown as LibraryPrompt);
    toast.success("הפרומפט נטען");
  }, [handleUsePrompt]);

  const handleBackToLibrary = useCallback(() => {
    if (previousView === "personal" || previousView === "library") {
      setViewMode(previousView);
    } else {
      setViewMode("personal");
    }
    setPreviousView(null);
  }, [previousView, setViewMode]);

  const handleRestore = useCallback(
    (item: HistoryItem) => {
      dispatch({ type: "SET_INPUT", payload: item.original });
      dispatch({ type: "SET_TONE", payload: item.tone });
      dispatch({ type: "SET_CATEGORY", payload: item.category });
      dispatch({ type: "SET_COMPLETION", payload: item.enhanced });
      dispatch({ type: "SET_QUESTIONS", payload: [] });
      toast.success("הפרומפט שוחזר");
    },
    [dispatch],
  );

  const addPersonalPromptFromHistory = useCallback(
    (item: HistoryItem) => {
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
        source: "manual",
        original_prompt: item.original,
        source_history_id: item.id,
      });
      recordUsageSignal("save", item.enhanced);
      toast.success("נשמר לספריה האישית!");
    },
    [user, addPrompt],
  );

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
      source: "manual",
      original_prompt: ps.input,
    });
    recordUsageSignal("save", ps.completion);
    markFeatureUsed("peroot_used_personal_library");
    toast.success("נשמר לספריה האישית!");
  }, [
    user,
    ps.completion,
    ps.input,
    ps.detectedCategory,
    ps.selectedCategory,
    ps.selectedCapability,
    addPrompt,
  ]);

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
      source: "manual",
      original_prompt: ps.input,
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
  }, [
    user,
    ps.completion,
    ps.input,
    ps.detectedCategory,
    ps.selectedCategory,
    ps.selectedCapability,
    addPrompt,
    handleToggleFavorite,
    showLoginRequired,
  ]);

  const saveAsTemplate = useCallback(() => {
    if (!user) {
      showLoginRequired("שמירת תבניות");
      return;
    }
    if (!ps.completion.trim()) return;

    // Extract {variable} placeholders from the enhanced prompt
    const varMatches = ps.completion.match(/\{([a-z_]+)\}/gi) || [];
    const variables = [...new Set(varMatches.map((v) => v.replace(/[{}]/g, "")))];

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
  }, [
    user,
    ps.completion,
    ps.input,
    ps.detectedCategory,
    ps.selectedCategory,
    ps.selectedCapability,
    addPrompt,
  ]);

  const handleImportHistory = useCallback(async () => {
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
    const itemsToAdd = history.map((item) => ({
      title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
      prompt: item.enhanced,
      category: item.category,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      capability_mode: CapabilityMode.STANDARD,
      use_case: "נשמר מהיסטוריה",
      source: "manual" as const,
      tags: [] as string[],
    }));
    await addPrompts(itemsToAdd);
    toast.success("כל ההיסטוריה יובאה!");
  }, [user, history, addPrompts]);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await completeOnboarding();
      setShowOnboarding(false);
      toast.success("ברוכים הבאים לפירוט! 🎉 הזן את הפרומפט הראשון שלך");
      setTimeout(() => {
        const textarea = document.querySelector('textarea[dir="rtl"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 600);
    } catch (e) {
      logger.error("[Onboarding] Error:", e);
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

  const [pendingGraph, setPendingGraph] = useState(false);
  const handleOpenGraph = useCallback(() => {
    setPendingGraph(true);
    handleNavPersonal();
  }, [handleNavPersonal]);

  const handleNavFavorites = useCallback(() => {
    setViewMode("personal");
    setPersonalView("favorites");
  }, [setViewMode, setPersonalView]);

  const handleNavLibrary = useCallback(() => {
    setViewMode("library");
  }, [setViewMode]);

  // --- Render callbacks for sub-components ---

  const handleVariableChange = useCallback(
    (key: string, val: string) => {
      dispatch({ type: "SET_VARIABLE_VALUES", payload: { ...ps.variableValues, [key]: val } });
      saveVariable(key, val);
    },
    [dispatch, ps.variableValues, saveVariable],
  );

  const handleImproveAgain = useCallback(() => {
    const text = ps.completion;
    dispatch({ type: "SET_INPUT", payload: text });
    dispatch({ type: "INCREMENT_ITERATION" });
    // Pass the text explicitly so it refines the result, not the stale ps.input.
    handleEnhance(text);
  }, [dispatch, ps.completion, handleEnhance]);

  // Stop an in-flight stream — keeps whatever partial text arrived, marks it
  // interrupted so the success branch doesn't save/toast it.
  const handleStop = useCallback(() => {
    streamInterruptedRef.current = true;
    abortStream();
    dispatch({ type: "STREAM_INTERRUPTED" });
  }, [abortStream, dispatch]);

  const handleDiscoveryCtaClick = useCallback(
    (action: string) => {
      if (action === "library") saveCompletionToPersonal();
      else if (action === "share") handleShare();
      else if (action === "research")
        dispatch({ type: "SET_CAPABILITY", payload: CapabilityMode.DEEP_RESEARCH });
      else if (action === "image")
        dispatch({ type: "SET_CAPABILITY", payload: CapabilityMode.IMAGE_GENERATION });
      else if (action === "chains") setViewMode("personal");
      else if (action === "public-library") handleNavLibrary();
    },
    [saveCompletionToPersonal, handleShare, dispatch, setViewMode, handleNavLibrary],
  );

  const handleMobileTabChange = useCallback(
    (tab: string) => {
      if (tab === "home") setViewMode("home");
      else if (tab === "library") handleNavLibrary();
      else if (tab === "personal") handleNavPersonal();
      else if (tab === "history") setSidebarOpen(true);
      else if (tab === "faq") setMobileFaqOpen(true);
    },
    [setViewMode, handleNavLibrary, handleNavPersonal],
  );

  // --- Render ---

  const handleTopNavNavigate = useCallback(
    (view: "home" | "library" | "personal") => {
      if (view === "home") setViewMode("home");
      else if (view === "library") handleNavLibrary();
      else if (view === "personal") handleNavPersonal();
    },
    [setViewMode, handleNavLibrary, handleNavPersonal],
  );

  // Deep-link the top-nav "Chains" tab into the personal library's
  // chains section. We navigate to personal view first, then dispatch a
  // window event that PersonalLibraryView listens for to auto-expand the
  // collapsible chains block and scroll it into view. Keeps the nav
  // stateless — no prop drilling, no new context.
  const handleOpenChainsFromNav = useCallback(() => {
    handleNavPersonal();
    // Let the personal view mount first, then trigger the expand.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("peroot:open-chains"));
    }, 50);
  }, [handleNavPersonal]);

  const topNavBar = (
    <TopNavBar viewMode={viewMode} onNavigate={handleTopNavNavigate} onOpenGraph={handleOpenGraph}>
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
            : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10",
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
            onCopyText={async (t) => {
              await handleCopyText(t);
            }}
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
            onCopyText={async (t) => {
              await handleCopyText(t);
            }}
            handleImportHistory={handleImportHistory}
            historyLength={history.length}
            openToGraph={pendingGraph}
            onGraphOpened={() => setPendingGraph(false)}
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
            <MobileFaqPanel isOpen={mobileFaqOpen} onClose={() => setMobileFaqOpen(false)} />
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
            setSelectedCategory={(cat: string) => dispatch({ type: "SET_CATEGORY", payload: cat })}
            selectedCapability={ps.selectedCapability}
            setSelectedCapability={(cap: CapabilityMode) =>
              dispatch({ type: "SET_CAPABILITY", payload: cap })
            }
            isLoading={ps.isLoading}
            onStop={handleStop}
            inputVariables={inputVariables}
            variableValues={ps.variableValues}
            setVariableValues={(vals: Record<string, string>) =>
              dispatch({ type: "SET_VARIABLE_VALUES", payload: vals })
            }
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
            isPersonalLoaded={isPersonalLoaded}
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
            onRetryAttachment={context.retryUrl}
            onRetryFile={context.retryFile}
            onRetryImage={context.retryImage}
            contextTier={isPro ? "pro" : "free"}
            onRemoveAttachment={context.removeAttachment}
            contextTotalTokens={context.totalTokens}
            contextIsOverLimit={context.isOverLimit}
            targetModel={targetModel}
            setTargetModel={handleSetTargetModel}
            voiceLang={voiceLang}
            setVoiceLang={setVoiceLang}
            contextLimits={{
              maxFiles: PLAN_CONTEXT_LIMITS[isPro ? "pro" : "free"].maxFiles,
              tokenLimit: PLAN_CONTEXT_LIMITS[isPro ? "pro" : "free"].total,
            }}
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
            onBack={() => dispatch({ type: "SET_COMPLETION", payload: "" })}
            placeholders={placeholders}
            variableValues={ps.variableValues}
            previousScore={ps.previousScore}
            iterationCount={ps.iterationCount}
            preFilledKeys={ps.preFilledKeys}
            onVariableChange={handleVariableChange}
            onImproveAgain={handleImproveAgain}
            onRetryStream={handleEnhance}
            onResetToOriginal={() => dispatch({ type: "RESET_TO_ORIGINAL" })}
            originalPrompt={ps.originalInput || ps.input}
            onShare={handleShare}
            onReset={() => dispatch({ type: "RESET" })}
            isAuthenticated={!!user}
            capabilityMode={ps.generationContext?.mode || ps.selectedCapability}
            creditsLeft={creditsRemaining ?? undefined}
            selectedPlatform={
              ps.generationContext?.modeParams?.image_platform ||
              ps.generationContext?.modeParams?.video_platform ||
              (ps.selectedCapability === CapabilityMode.IMAGE_GENERATION
                ? imagePlatform
                : undefined) ||
              (ps.selectedCapability === CapabilityMode.VIDEO_GENERATION
                ? videoPlatform
                : undefined)
            }
            questions={ps.questions}
            questionsLoading={ps.questionsLoading}
            questionAnswers={ps.questionAnswers}
            onAnswerChange={(id, val) =>
              dispatch({ type: "SET_QUESTION_ANSWER", payload: { id, answer: val } })
            }
            onQuickRefine={(instruction) => handleRefine(instruction)}
            onRefine={(instruction) => handleRefine(instruction || "")}
          />
        )}
      </HomeViewChrome>
    </>
  );
}

export default function HomeClient() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    wrapperRef.current?.classList.add("hydrated");
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-[var(--surface-body)] text-[var(--text-primary)] selection:bg-amber-500/30 font-sans pb-10 pt-2 px-4 md:px-6 w-full overflow-x-hidden"
      dir="rtl"
    >
      <PageContent />
    </div>
  );
}

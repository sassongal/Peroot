"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  trackPromptEnhance,
  trackEnhanceComplete,
} from "@/lib/analytics";
import { markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { getApiPath } from "@/lib/api-path";
import { recordUsageSignal } from "@/lib/prompt-usage";
import { CapabilityMode, capabilitySupportsTargetModel } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import { splitCompletionAndQuestions } from "@/lib/prompt-stream/split-genius-completion";
import { extractPlaceholders } from "@/lib/text-utils";
import type { PromptState, PromptAction } from "@/hooks/usePromptWorkflow";
import type { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import type { useHistory } from "@/hooks/useHistory";
import type { usePromptLimits } from "@/hooks/usePromptLimits";
import type { useFeatureDiscovery } from "@/hooks/useFeatureDiscovery";
import type { useContextAttachments } from "@/hooks/useContextAttachments";
import type { useI18n } from "@/context/I18nContext";
import type { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import type { VideoPlatform } from "@/lib/video-platforms";
import type { TargetModel } from "@/lib/engines/types";
import type { LibraryPrompt } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import type React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsePromptEnhanceParams {
  // Core state
  ps: PromptState;
  dispatch: React.Dispatch<PromptAction>;
  /** Ref that accumulates raw stream chunks — shared with the streaming onChunk handler */
  streamAccRef: React.MutableRefObject<{ rawText: string }>;
  /** Ref that mirrors ps.variableValues for use inside async callbacks */
  variableValuesRef: React.MutableRefObject<Record<string, string>>;
  // Stream
  startStream: ReturnType<typeof useStreamingCompletion>["startStream"];
  // Auth / limits
  user: User | null;
  canUsePrompt: boolean;
  requiredAction: ReturnType<typeof usePromptLimits>["requiredAction"];
  creditsRemaining: number | null;
  setCreditsRemaining: (n: number) => void;
  setShowUpgradeNudge: (b: boolean) => void;
  showLoginRequired: (feature: string, message?: string) => void;
  // Context attachments
  context: ReturnType<typeof useContextAttachments>;
  // Scoring — used only for analytics telemetry, not display
  inputScore: { score: number };
  completionScore: { score: number };
  // Platform params
  imagePlatform: ImagePlatform;
  imageOutputFormat: ImageOutputFormat;
  imageAspectRatio: string;
  videoPlatform: VideoPlatform;
  videoAspectRatio: string;
  targetModel: TargetModel;
  // Callbacks
  addToHistory: ReturnType<typeof useHistory>["addToHistory"];
  incrementUsage: ReturnType<typeof usePromptLimits>["incrementUsage"];
  t: ReturnType<typeof useI18n>;
  discovery: ReturnType<typeof useFeatureDiscovery>;
  filteredLibrary: LibraryPrompt[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates the prompt enhancement and refinement flow:
 * - processStreamResult — parses the raw accumulated stream buffer
 * - handleEnhance — fires the main /api/enhance call
 * - handleRefine — fires a refinement call using Q&A answers
 * - handleSurpriseMe — loads a random prompt from the library
 *
 * Extracted from HomeClient.tsx to keep that file focused on orchestration.
 */
export function usePromptEnhance({
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
}: UsePromptEnhanceParams) {

  // Cooldown ref prevents double-fire from rapid taps / keyboard shortcuts.
  const enhanceCooldownRef = useRef(false);

  // ── Stream result parser ──────────────────────────────────────────────────

  /**
   * Called after a stream completes. Parses the raw accumulated buffer,
   * extracts GENIUS_QUESTIONS and PROMPT_TITLE, strips thinking tags,
   * dispatches cleaned state, and fetches saved variable values for auto-fill.
   *
   * Mutates streamAccRef.current.rawText in-place with the cleaned body so
   * downstream readers (copy, save, refine) always see canonical text.
   */
  const processStreamResult = useCallback(
    (label: string) => {
      const acc = streamAccRef.current;

      // Guard: skip saving partial/interrupted results.
      if (acc.rawText.length < 20) {
        return { text: "", title: null };
      }

      // Split at last newline-boundary [GENIUS_QUESTIONS] to avoid false
      // positives when the literal appears inside the prompt body.
      const split = splitCompletionAndQuestions(acc.rawText);
      let body = split.body;
      const questionsPart = split.questionsPart;

      if (questionsPart.trim()) {
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
      } else {
        dispatch({ type: "SET_QUESTIONS", payload: [] });
      }

      // Strip AI thinking/reasoning tags.
      body = body.replace(/<thinking>[\s\S]*?<\/thinking>\n?/gi, "").trim();

      // Extract [PROMPT_TITLE]…[/PROMPT_TITLE] with dotall-safe regex.
      const titleMatch = body.match(/\[PROMPT_TITLE\]([\s\S]*?)\[\/PROMPT_TITLE\]/);
      const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
      body = body.replace(/\[PROMPT_TITLE\][\s\S]*?\[\/PROMPT_TITLE\]\n?/g, "").trim();

      // Defensive: strip any leaked [GENIUS_QUESTIONS] delimiter from body.
      body = body.replace(/\[GENIUS_QUESTIONS\]/g, "").trim();

      // Persist the cleaned body so downstream readers never see raw markers.
      acc.rawText = body;

      dispatch({ type: "SET_COMPLETION", payload: body });

      const extracted = extractPlaceholders(body);
      const newVars = { ...variableValuesRef.current };
      extracted.forEach((ph) => {
        if (!(ph in newVars)) newVars[ph] = "";
      });
      dispatch({ type: "SET_VARIABLE_VALUES", payload: newVars });

      // Fetch saved variable values for auto-fill (authenticated users only).
      if (extracted.length > 0 && user) {
        const emptyKeys = extracted.filter((ph) => !newVars[ph]);
        if (emptyKeys.length > 0) {
          fetch(getApiPath(`/api/user-variables?keys=${emptyKeys.join(",")}`))
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (!data?.variables) return;
              const merged = { ...variableValuesRef.current };
              const filled: string[] = [];
              for (const [key, value] of Object.entries(
                data.variables as Record<string, string>,
              )) {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, user],
  );

  // ── Enhance ───────────────────────────────────────────────────────────────

  const handleEnhance = useCallback(async () => {
    if (!ps.input.trim() || ps.isLoading || enhanceCooldownRef.current) return;

    enhanceCooldownRef.current = true;
    setTimeout(() => {
      enhanceCooldownRef.current = false;
    }, 500);

    if (!canUsePrompt) {
      if (requiredAction === "login") {
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
      toast.error("יש יותר מדי context — הסירו קובץ לפני שיפור הפרומפט");
      return;
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

    const enhanceStart = Date.now();
    trackPromptEnhance(ps.selectedCategory, ps.selectedCapability, ps.input.length);

    const contextPayload = context.getContextPayload();

    // Auto-detect input language (Hebrew vs English).
    const hebrewChars = (ps.input.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = ps.input.replace(/\s/g, "").length;
    const detectedLang =
      totalChars > 0 && hebrewChars / totalChars < 0.3 ? "en" : "he";

    // Merge media params + language detection into a single mode_params object.
    // Spreading twice would cause the English branch to silently overwrite the
    // media branch (last key wins in an object literal).
    const finalModeParams =
      currentModeParams || detectedLang === "en"
        ? { ...currentModeParams, ...(detectedLang === "en" && { input_language: "en" }) }
        : undefined;

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
      ...(finalModeParams && { mode_params: finalModeParams }),
      ...(contextPayload.length > 0 && { context: contextPayload }),
      ...(capabilitySupportsTargetModel(ps.selectedCapability) &&
        targetModel !== "general" && { target_model: targetModel }),
    });

    const result = processStreamResult("Enhance");
    if (result.text) {
      trackEnhanceComplete(
        ps.selectedCapability,
        inputScore.score,
        Date.now() - enhanceStart,
      );
      recordUsageSignal("enhance", result.text);
      if (ps.selectedCapability === CapabilityMode.DEEP_RESEARCH)
        markFeatureUsed("peroot_used_research");
      if (ps.selectedCapability === CapabilityMode.IMAGE_GENERATION)
        markFeatureUsed("peroot_used_image");
      dispatch({ type: "SET_DETECTED_CATEGORY", payload: ps.selectedCategory });

      addToHistory({
        original: ps.input,
        enhanced: result.text,
        tone: ps.selectedTone,
        category: ps.selectedCategory,
        title:
          result.title ||
          ps.input.slice(0, 40) + (ps.input.length > 40 ? "..." : ""),
      });

      if (user && creditsRemaining !== null) {
        const newCredits = Math.max(0, creditsRemaining - 1);
        setCreditsRemaining(newCredits);
        if (newCredits === 0) {
          toast("הקרדיטים נגמרו — הם מתחדשים כל יום בשעה 14:00", {
            duration: 8000,
          });
        }
      }
      if (!user) {
        incrementUsage();
      }

      toast.success(t.prompt_generator.success_toast);
      discovery.onEnhanceComplete();

      // Pro preview nudge after 3rd enhancement in session (free users only).
      if (user && !sessionStorage.getItem("pro_nudge_shown")) {
        const enhanceCount =
          parseInt(sessionStorage.getItem("session_enhance_count") || "0") + 1;
        sessionStorage.setItem("session_enhance_count", String(enhanceCount));
        if (enhanceCount === 3) {
          sessionStorage.setItem("pro_nudge_shown", "1");
          setTimeout(() => {
            toast("משתמשי Pro מקבלים מודלים מתקדמים לתוצאות טובות יותר", {
              action: {
                label: "לשדרוג",
                onClick: () => {
                  window.location.href = "/pricing";
                },
              },
              duration: 6000,
            });
          }, 2000);
        }
      }

      // Clear attachments after successful enhance to prevent stale context.
      if (context.attachments.length > 0) {
        context.clearAll();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    addToHistory,
    incrementUsage,
    t,
    discovery.onEnhanceComplete,
    processStreamResult,
  ]);

  // ── Refine ────────────────────────────────────────────────────────────────

  const handleRefine = useCallback(
    async (instruction: string) => {
      if (ps.isLoading) return;
      const hasAnswers = Object.values(ps.questionAnswers).some((a) => a.trim());
      if ((!instruction.trim() && !hasAnswers) || !ps.completion) return;

      const currentCompletion = ps.completion;

      dispatch({ type: "SET_PREVIOUS_SCORE", payload: completionScore.score });
      dispatch({ type: "START_STREAM" });
      streamAccRef.current = { rawText: "" };

      const answerParts = ps.questions
        .filter((q) => ps.questionAnswers[String(q.id)]?.trim())
        .map(
          (q) =>
            `שאלה: ${q.question}\nתשובה: ${ps.questionAnswers[String(q.id)]}`,
        );

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
        ...(capabilitySupportsTargetModel(ctx?.mode || ps.selectedCapability) &&
          targetModel !== "general" && { target_model: targetModel }),
      });

      const refineResult = processStreamResult("Refine");
      if (refineResult.text) {
        recordUsageSignal("refine", refineResult.text);
        dispatch({ type: "INCREMENT_ITERATION" });
        toast.success("הפרומפט עודכן!");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      dispatch,
      startStream,
      processStreamResult,
    ],
  );

  // ── Surprise Me ───────────────────────────────────────────────────────────

  const handleSurpriseMe = useCallback(() => {
    if (!filteredLibrary || filteredLibrary.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredLibrary.length);
    const randomPrompt = filteredLibrary[randomIndex];
    dispatch({ type: "SET_INPUT", payload: randomPrompt.prompt });
    toast.success(`"${randomPrompt.title}" נטען!`);
  }, [filteredLibrary, dispatch]);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    handleEnhance,
    handleRefine,
    handleSurpriseMe,
  };
}

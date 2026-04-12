"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { trackPromptCopy } from "@/lib/analytics";
import { markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import { getApiPath } from "@/lib/api-path";
import { recordUsageSignal } from "@/lib/prompt-usage";
import { PERSONAL_DEFAULT_CATEGORY, getCategoryLabel } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { logger } from "@/lib/logger";
import type { PromptState, PromptAction } from "@/hooks/usePromptWorkflow";
import type { HistoryItem } from "@/hooks/useHistory";
import type { PersonalPrompt } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import type React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AddPromptInput = Omit<PersonalPrompt, "id" | "use_count" | "created_at" | "updated_at">;

interface UseResultActionsParams {
  ps: PromptState;
  dispatch: React.Dispatch<PromptAction>;
  user: User | null;
  isPro: boolean;
  addPrompt: (prompt: AddPromptInput, category?: string) => Promise<string | undefined>;
  addPrompts: (prompts: AddPromptInput[]) => Promise<void>;
  handleToggleFavorite: (scope: "personal" | "library", id: string) => Promise<void>;
  history: HistoryItem[];
  showLoginRequired: (feature: string, message?: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Encapsulates all actions taken on a completed prompt result:
 * copy, share, save to personal library, save as favourite, save as template,
 * and history-import operations.
 *
 * Extracted from HomeClient.tsx to keep that file focused on orchestration.
 */
export function useResultActions({
  ps,
  dispatch,
  user,
  isPro,
  addPrompt,
  addPrompts,
  handleToggleFavorite,
  history,
  showLoginRequired,
}: UseResultActionsParams) {

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopyText = useCallback(
    async (text: string, withWatermark?: boolean) => {
      const shouldWatermark = withWatermark !== undefined ? withWatermark : !isPro;
      const finalText = shouldWatermark
        ? `${text}\n\n- נוצר עם Peroot | www.peroot.space`
        : text;
      await navigator.clipboard.writeText(finalText);
      dispatch({ type: "SET_COPIED", payload: true });
      setTimeout(() => dispatch({ type: "SET_COPIED", payload: false }), 2000);
      recordUsageSignal("copy", text);
      trackPromptCopy("result");
      toast.success("הועתק ללוח");
    },
    [isPro, dispatch],
  );

  // ── Share ─────────────────────────────────────────────────────────────────

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
  }, [user, ps.completion, ps.input, ps.selectedCategory, ps.selectedCapability, showLoginRequired]);

  // ── Save to personal library ───────────────────────────────────────────────

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
      personal_category:
        getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
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
    showLoginRequired,
  ]);

  // ── Save + favourite ──────────────────────────────────────────────────────

  const saveCompletionAsFavorite = useCallback(async () => {
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
    if (!ps.completion.trim()) return;
    const newId = await addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category:
        getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual",
    });
    recordUsageSignal("save", ps.completion);
    markFeatureUsed("peroot_used_personal_library");
    if (newId) {
      await handleToggleFavorite("personal", newId);
      toast.success("נשמר ונוסף למועדפים ⭐");
    }
    // addPrompt returned undefined → fuzzy duplicate found; dedup toast already fired.
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

  // ── Save as template ──────────────────────────────────────────────────────

  const saveAsTemplate = useCallback(() => {
    if (!user) {
      showLoginRequired("שמירת תבניות");
      return;
    }
    if (!ps.completion.trim()) return;

    const varMatches = ps.completion.match(/\{([a-z_]+)\}/gi) || [];
    const variables = [...new Set(varMatches.map((v) => v.replace(/[{}]/g, "")))];

    if (variables.length === 0) {
      toast.error(
        "הפרומפט לא מכיל משתנים {variable} — הוסיפו משתנים כדי ליצור תבנית",
      );
      return;
    }

    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category:
        getCategoryLabel(ps.selectedCategory) || PERSONAL_DEFAULT_CATEGORY,
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
    showLoginRequired,
  ]);

  // ── Add from history ──────────────────────────────────────────────────────

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
      });
      recordUsageSignal("save", item.enhanced);
      toast.success("נשמר לספריה האישית!");
    },
    [user, addPrompt, showLoginRequired],
  );

  // ── Import all history ────────────────────────────────────────────────────

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
  }, [user, history, addPrompts, showLoginRequired]);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    handleCopyText,
    handleShare,
    saveCompletionToPersonal,
    saveCompletionAsFavorite,
    saveAsTemplate,
    addPersonalPromptFromHistory,
    handleImportHistory,
  };
}

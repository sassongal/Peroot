"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { PersonalPrompt } from "@/lib/types";
import { useLibraryContext } from "@/context/LibraryContext";
import { useFavoritesContext } from "@/context/FavoritesContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/**
 * THE personal-prompt action layer (U3.2). The grid card and the graph
 * panel card each hand-wrote copy/pin/move/duplicate/delete around the same
 * context functions, and they had already drifted: the grid delete asked for
 * confirmation and offered undo, the panel delete did neither; even the
 * toast wording disagreed. Both surfaces now call these.
 */
export function usePromptActions() {
  const ctx = useLibraryContext();
  const { togglePin, movePrompts, deletePrompts, duplicatePrompt } = ctx;
  const { favoritePersonalIds, handleToggleFavorite } = useFavoritesContext();
  const confirmDialog = useConfirm();

  const copyPrompt = useCallback(async (prompt: PersonalPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("הפרומפט הועתק ללוח");
    } catch {
      toast.error("העתקה נכשלה");
    }
  }, []);

  const pinPrompt = useCallback(
    async (prompt: PersonalPrompt) => {
      try {
        await togglePin(prompt.id);
      } catch {
        toast.error("שגיאה בהצמדה");
      }
    },
    [togglePin],
  );

  const movePrompt = useCallback(
    async (prompt: PersonalPrompt, category: string) => {
      try {
        await movePrompts([prompt.id], category);
        toast.success(`הועבר לתיקייה "${category}"`);
        return true;
      } catch {
        toast.error("ההעברה נכשלה, נסה שוב.");
        return false;
      }
    },
    [movePrompts],
  );

  const duplicate = useCallback(
    async (prompt: PersonalPrompt) => {
      try {
        await duplicatePrompt(prompt);
        toast.success("הפרומפט שוכפל");
      } catch {
        toast.error("שכפול נכשל");
      }
    },
    [duplicatePrompt],
  );

  const toggleFavorite = useCallback(
    async (prompt: PersonalPrompt) => {
      try {
        await handleToggleFavorite("personal", prompt.id);
      } catch {
        toast.error("שגיאה בעדכון מועדפים");
      }
    },
    [handleToggleFavorite],
  );

  /**
   * Confirm, delete, and offer undo. Returns true when the prompt was
   * actually deleted (so callers can close panels / menus).
   */
  const deleteWithUndo = useCallback(
    async (prompt: PersonalPrompt): Promise<boolean> => {
      const ok = await confirmDialog({
        title: "למחוק את הפרומפט?",
        message: "אפשר לבטל מיד לאחר המחיקה.",
        danger: true,
        confirmLabel: "מחק",
      });
      if (!ok) return false;

      const snapshot: Partial<PersonalPrompt> = { ...prompt };
      delete snapshot.id;
      delete snapshot.created_at;
      delete snapshot.updated_at;
      delete snapshot.use_count;
      try {
        await deletePrompts([prompt.id]);
        toast.success("הפרומפט נמחק", {
          action: {
            label: "בטל",
            onClick: async () => {
              try {
                await ctx.addPrompts([
                  snapshot as Omit<
                    PersonalPrompt,
                    "id" | "created_at" | "updated_at" | "use_count"
                  >,
                ]);
                toast.success("הפרומפט שוחזר");
              } catch {
                toast.error("השחזור נכשל, נסה שוב.");
              }
            },
          },
        });
        return true;
      } catch {
        toast.error("המחיקה נכשלה. נסה שוב, או רענן את הדף.");
        return false;
      }
    },
    [confirmDialog, deletePrompts, ctx],
  );

  return {
    copyPrompt,
    pinPrompt,
    movePrompt,
    duplicate,
    toggleFavorite,
    deleteWithUndo,
    favoritePersonalIds,
    personalCategories: ctx.personalCategories,
  };
}

"use client";

import { memo, useRef, useEffect, useState } from "react";
import {
  Star,
  ArrowRight,
  Plus,
  Copy,
  Pencil,
  Check,
  X,
  Trash2,
  CheckSquare,
  Square,
  Tag,
  Download,
  FolderInput,
  Pin,
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Link2,
  Network,
  GripVertical,
} from "lucide-react";
import { Type, Eraser, Maximize2, Minimize2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { PersonalPrompt } from "@/lib/types";
import { toast } from "sonner";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS } from "@/lib/text-utils";
import { toStyledHtml } from "@/lib/styled-html";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { DateBadge } from "@/components/ui/DateBadge";
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";
import { fromPersonalLibraryRow } from "@/lib/prompt-entity";
import { useLibraryContext } from "@/context/LibraryContext";
import { useStyleEditor } from "@/context/LibraryUIContext";
import { usePromptActions } from "@/components/features/library/use-prompt-actions";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { VariableFiller } from "@/components/features/variables/VariableFiller";
import { usePresets } from "@/hooks/usePresets";
import { getStyledPromptMarkup, extractVariablesFromPrompt } from "@/lib/prompt-variables";
import {
  usePersonalLibrarySelection,
  usePersonalLibraryExpanded,
  usePersonalLibraryCardMenu,
  usePersonalLibraryFolders,
  usePersonalLibraryViewPrefs,
  usePersonalLibraryVersionHistory,
  usePersonalLibraryActions,
} from "./context/PersonalLibraryContext";

interface PersonalLibraryPromptCardProps {
  prompt: PersonalPrompt;
}

function PersonalLibraryPromptCardImpl({ prompt }: PersonalLibraryPromptCardProps) {
  const ctx = useLibraryContext();
  // Shared action layer (U3.2) — same behavior + toasts as the graph panel.
  const { pinPrompt, movePrompt, duplicate: duplicateShared, deleteWithUndo } = usePromptActions();
  const {
    user,
    favoritePersonalIds,
    handleToggleFavorite,
    bumpPersonalLibraryLastUsed,
    editingPersonalId,
    startEditingPersonalPrompt,
    saveEditingPersonalPrompt,
    cancelEditingPersonalPrompt,
    editingStylePromptId,
    openStyleEditor,
    saveStylePrompt,
    closeStyleEditor,
    handlePersonalDragStart,
    handlePersonalDragOver,
    handlePersonalDragEnd,
    handlePersonalDrop,
    draggingPersonalId,
    dragOverPersonalId,
  } = ctx;

  const { presets, addPreset, deletePreset } = usePresets();

  const { selectionMode, setSelectionMode, selectedIds, toggleSelection } =
    usePersonalLibrarySelection();
  const { expandedIds, setExpandedIds } = usePersonalLibraryExpanded();
  const {
    openMenuId,
    setOpenMenuId,
    showMoveSubMenu,
    setShowMoveSubMenu,
    newMoveInlineName,
    setNewMoveInlineName,
    showNewMoveInlineInput,
    setShowNewMoveInlineInput,
  } = usePersonalLibraryCardMenu();
  const {
    styleEditorExpanded,
    setStyleEditorExpanded,
    styleTextareaRef,
    applyStyleToken,
    clearStyleTokens,
    insertTextAtCursor,
    quickInserts,
  } = useStyleEditor();
  const { setVersionHistoryPrompt } = usePersonalLibraryVersionHistory();
  const { allPersonalCategories } = usePersonalLibraryFolders();
  const { density } = usePersonalLibraryViewPrefs();
  const { onUsePrompt, onCopyText, onShowConnections } = usePersonalLibraryActions();

  const isExpanded = expandedIds.has(prompt.id);
  const isEditing = editingPersonalId === prompt.id;

  // Draft text is local to the card being edited. It used to live in the
  // shared library context, so a single keystroke here rebuilt that context
  // value and re-rendered every other card in the list: with a few hundred
  // saved prompts, typing a title was visibly laggy.
  const [draftTitle, setDraftTitle] = useState("");
  const [draftUseCase, setDraftUseCase] = useState("");
  const [draftStyle, setDraftStyle] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const isDragging = draggingPersonalId === prompt.id;
  const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
  const isFavorite = favoritePersonalIds.has(prompt.id);
  const favStarTitle = user
    ? isFavorite
      ? "הסר ממועדפים"
      : "הוסף למועדפים"
    : isFavorite
      ? "הסר ממועדפים מקומיים"
      : "הוסף למועדפים במכשיר זה, התחבר לסנכרון בענן";
  const isStyling = editingStylePromptId === prompt.id;

  // Seeded when an editor opens, not mirrored from context in an effect.
  function beginEditing() {
    setDraftTitle(prompt.title);
    setDraftUseCase(prompt.use_case ?? "");
    startEditingPersonalPrompt(prompt);
  }

  function beginStyling() {
    setDraftStyle(openStyleEditor(prompt));
  }
  const styledMarkup = getStyledPromptMarkup(prompt);
  const isSelected = selectedIds.has(prompt.id);
  const isMenuOpen = openMenuId === prompt.id;
  const hasVariables = extractVariablesFromPrompt(prompt.prompt).length > 0;

  const toIso = (v: unknown): string =>
    typeof v === "number"
      ? new Date(v).toISOString()
      : typeof v === "string"
        ? v
        : new Date().toISOString();
  const toIsoOrNull = (v: unknown): string | null => (v == null ? null : toIso(v));

  const entity = fromPersonalLibraryRow({
    id: prompt.id,
    title: prompt.title,
    prompt: prompt.prompt,
    category: prompt.category,
    capability_mode: prompt.capability_mode,
    created_at: toIso(prompt.created_at),
    updated_at: toIso(prompt.updated_at),
    last_used_at: toIsoOrNull(prompt.last_used_at),
  });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionModeRef = useRef(selectionMode);
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);
  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    [],
  );

  const handlePointerDown = () => {
    if (selectionModeRef.current) return;
    longPressTimer.current = setTimeout(() => {
      if (selectionModeRef.current) return;
      navigator.vibrate?.(40);
      setSelectionMode(true);
      toggleSelection(prompt.id);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleExpand = () => {
    if (selectionMode) {
      toggleSelection(prompt.id);
      return;
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(prompt.id)) next.delete(prompt.id);
      else next.add(prompt.id);
      return next;
    });
  };

  // Delete a prompt with confirmation + undo. Shared by the kebab menu and the
  // expanded-card delete button so both behave identically (the expanded button
  // previously only collapsed the card without deleting anything).
  const handleDeletePrompt = async () => {
    await deleteWithUndo(prompt);
    setOpenMenuId(null);
  };

  return (
    <div
      key={prompt.id}
      data-prompt-id={prompt.id}
      draggable={!isEditing}
      onDragStart={(event) => handlePersonalDragStart(event, prompt)}
      onDragEnd={handlePersonalDragEnd}
      onDragOver={(event) => handlePersonalDragOver(event, prompt)}
      onDrop={(event) => handlePersonalDrop(event, prompt)}
      className={cn(
        // @container/plcard: the card responds to ITS OWN width, not the
        // viewport — so it lays out correctly whether it's a full-width mobile
        // row or a narrow cell in the multi-column grid on a wide monitor.
        "group @container/plcard rounded-xl border transition-all duration-200",
        // Glass surface from tokens, so the card actually HAS a surface and a
        // border in light mode (white/2.5 over a light page is nothing).
        // Depth is a gold glow on hover, never a resting grey shadow.
        "border-(--glass-border) bg-(--glass-bg)",
        "hover:border-amber-500/30 hover:shadow-[0_6px_24px_rgba(245,158,11,0.10)]",
        isDragging && "opacity-50",
        isDragOver && "border-amber-500/40 bg-amber-500/5",
        // Selection is gold like every other active state in the library.
        isSelected && "border-amber-500/50 bg-amber-500/8",
        isExpanded && "border-(--glass-border) bg-(--glass-bg)",
      )}
    >
      {/* Collapsed Row */}
      <div
        className={cn(
          // DESIGN.md asks card interiors to breathe. The row was px-3/py-2.5
          // with a 2px gap, which is what made a title, a badge and the
          // controls read as one dense strip rather than a row.
          "flex items-center gap-2.5 px-4 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
          isExpanded
            ? "py-3.5 border-b border-(--glass-border)"
            : density === "compact"
              ? "py-2"
              : "py-3",
        )}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-expanded={isExpanded}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Drag-handle hint — signals the row is draggable to reorder. Desktop
            hover-only (drag-reorder isn't a touch gesture); hidden in selection
            mode where the checkbox owns the leading slot. */}
        {!selectionMode && (
          <span
            aria-hidden
            title="גרור לשינוי סדר"
            className="hidden @sm/plcard:flex shrink-0 -ms-1 text-(--text-muted) opacity-0 group-hover:opacity-40 transition-opacity cursor-grab"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
        )}
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(prompt.id);
          }}
          className={cn(
            "shrink-0 transition-opacity",
            isSelected || selectionMode
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-60 hidden @sm/plcard:inline-flex",
          )}
          aria-label={`בחר את הפרומפט "${prompt.title}"`}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-(--text-muted)" />
          )}
        </button>

        {/* Pin toggle — click to pin/unpin without opening the kebab menu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void pinPrompt(prompt);
          }}
          title={prompt.is_pinned ? "בטל הצמדה" : "הצמד"}
          aria-label={prompt.is_pinned ? "בטל הצמדה" : "הצמד"}
          aria-pressed={!!prompt.is_pinned}
          className={cn(
            "shrink-0 p-1 rounded transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none cursor-pointer",
            prompt.is_pinned
              ? "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              : "text-(--text-muted) opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-amber-500 [@media(hover:none)]:opacity-40",
          )}
        >
          <Pin className={cn("w-3.5 h-3.5", prompt.is_pinned && "fill-amber-400")} />
        </button>

        {/* Capability badge — hidden on mobile collapsed (shown in expanded meta row) */}
        <div className="hidden @sm/plcard:block shrink-0" onClick={(e) => e.stopPropagation()}>
          <CapabilityBadge mode={prompt.capability_mode} className="scale-90 origin-center" />
        </div>

        {/* Title + Template badge + (mobile) DateBadge */}
        <div className="flex-1 min-w-0" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[15px] @md/plcard:text-base leading-snug text-(--text-primary) truncate">
              {prompt.title}
            </span>
            {prompt.is_template && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-(--glass-bg) text-(--text-muted) border border-(--glass-border)">
                תבנית
              </span>
            )}
          </div>
          {/* ONE meta line for every width. This was three near-identical rows
              (mobile / sm / md), which is how the same fact drifted into three
              formats and the card grew past 1000 lines. Pieces that do not fit
              a narrow card hide themselves; the row is not duplicated. */}
          <div className="flex items-center gap-1.5 text-[11px] text-(--text-muted) mt-1 min-w-0">
            <CapabilityBadge
              mode={prompt.capability_mode}
              showLabel={false}
              className="@sm/plcard:hidden scale-90 origin-left shrink-0"
            />
            <DateBadge mode="compact" entity={entity} />
            <span className="opacity-30" aria-hidden>
              ·
            </span>
            <span className="truncate">
              {prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}
            </span>
            {prompt.use_count > 0 && (
              <span className="hidden @sm/plcard:inline shrink-0 tabular-nums">
                <span className="opacity-30" aria-hidden>
                  {" · "}
                </span>
                שומש {prompt.use_count}x
              </span>
            )}
          </div>
        </div>

        {/* Row actions: ONE primary plus the menu.
            This used to carry four controls (copy, relations, use, menu) on top
            of the pin, checkbox and drag handle on the other side — seven slots
            competing for one row, which left roughly 120px for the title in a
            three-column grid and read as a pile of icons. Copy and relations
            both already live in the menu below, so they are not repeated here.
            They are also no longer hover-revealed: with two controls there is
            nothing to hide, and fading them in on hover was what made the row
            feel like it was shifting under the pointer. */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              bumpPersonalLibraryLastUsed?.(prompt.id);
              onUsePrompt(prompt);
            }}
            title="השתמש"
            aria-label="השתמש בפרומפט"
            className="flex items-center justify-center gap-1.5 shrink-0 min-h-11 @md/plcard:min-h-9 px-2.5 rounded-lg border border-(--glass-border) text-(--text-secondary) hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/8 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 shrink-0" />
            {/* The label appears once the card is wide enough to afford it, so
                the primary action is not a bare icon on desktop. */}
            <span className="hidden @md/plcard:inline text-xs font-medium">השתמש</span>
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : prompt.id);
                setShowMoveSubMenu(false);
                setShowNewMoveInlineInput(false);
                setNewMoveInlineName("");
              }}
              title="עוד"
              aria-label="פעולות נוספות"
              className="p-2 @md/plcard:p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none min-h-11 min-w-11 @md/plcard:min-h-0 @md/plcard:min-w-0 flex items-center justify-center"
            >
              <MoreHorizontal className="w-4 h-4 @md/plcard:w-3.5 @md/plcard:h-3.5" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 bg-(--surface-panel) border border-(--glass-border) rounded-xl shadow-2xl py-1 min-w-[180px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {showMoveSubMenu ? (
                  <>
                    {/* Sub-menu header / back button */}
                    <button
                      onClick={() => {
                        setShowMoveSubMenu(false);
                        setShowNewMoveInlineInput(false);
                        setNewMoveInlineName("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> העבר לתיקייה
                    </button>
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* Folder list */}
                    {allPersonalCategories.map((cat) => {
                      const isCurrent =
                        (prompt.personal_category || PERSONAL_DEFAULT_CATEGORY) === cat;
                      return (
                        <button
                          key={cat}
                          onClick={async () => {
                            if (isCurrent) return;
                            await movePrompt(prompt, cat);
                            setOpenMenuId(null);
                            setShowMoveSubMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/10",
                            isCurrent
                              ? "text-amber-600 dark:text-amber-400 cursor-default"
                              : "text-(--text-secondary) hover:text-(--text-primary)",
                          )}
                        >
                          <Folder className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 text-right">{cat}</span>
                          {isCurrent && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* New folder inline creation */}
                    {showNewMoveInlineInput ? (
                      <div className="px-3 py-2 flex flex-col gap-1.5">
                        <input
                          autoFocus
                          dir="rtl"
                          value={newMoveInlineName}
                          onChange={(e) => setNewMoveInlineName(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              const name = newMoveInlineName.trim();
                              if (!name) return;
                              if (allPersonalCategories.includes(name)) {
                                toast.error("תיקייה בשם זה כבר קיימת");
                                return;
                              }
                              await movePrompt(prompt, name);
                              setOpenMenuId(null);
                              setShowMoveSubMenu(false);
                              setShowNewMoveInlineInput(false);
                              setNewMoveInlineName("");
                            }
                            if (e.key === "Escape") {
                              setShowNewMoveInlineInput(false);
                              setNewMoveInlineName("");
                            }
                          }}
                          placeholder="שם תיקייה חדשה"
                          className="w-full bg-(--glass-bg) border border-(--glass-border) rounded-lg px-2 py-1 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-black/15 dark:border-white/30"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={async () => {
                              const name = newMoveInlineName.trim();
                              if (!name) return;
                              if (allPersonalCategories.includes(name)) {
                                toast.error("תיקייה בשם זה כבר קיימת");
                                return;
                              }
                              await movePrompt(prompt, name);
                              setOpenMenuId(null);
                              setShowMoveSubMenu(false);
                              setShowNewMoveInlineInput(false);
                              setNewMoveInlineName("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-black/5 dark:bg-white/10 rounded text-xs text-(--text-primary) hover:bg-white/20"
                          >
                            <Check className="w-3 h-3" /> צור
                          </button>
                          <button
                            onClick={() => {
                              setShowNewMoveInlineInput(false);
                              setNewMoveInlineName("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 border border-(--glass-border) rounded text-xs text-(--text-muted) hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            <X className="w-3 h-3" /> ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewMoveInlineInput(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                      >
                        <Plus className="w-3.5 h-3.5" /> תיקייה חדשה
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Group 1: Actions */}
                    <button
                      onClick={() => {
                        onUsePrompt(prompt);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> השתמש
                    </button>
                    <button
                      onClick={() => {
                        onCopyText(prompt.prompt);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Copy className="w-3.5 h-3.5" /> העתק
                    </button>
                    <button
                      onClick={() => {
                        onCopyText(prompt.prompt);
                        toast.success("הפרומפט הועתק, אפשר להדביק ולשתף");
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Link2 className="w-3.5 h-3.5" /> שתף
                    </button>
                    {onShowConnections && (
                      <button
                        onClick={() => {
                          onShowConnections(prompt.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                      >
                        <Network className="w-3.5 h-3.5" /> קשרים
                      </button>
                    )}
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* Group 2: Edit */}
                    <button
                      onClick={() => {
                        beginEditing();
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Pencil className="w-3.5 h-3.5" /> ערוך
                    </button>
                    <button
                      onClick={() => {
                        beginStyling();
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> עיצוב
                    </button>
                    <button
                      onClick={async () => {
                        await duplicateShared(prompt);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Plus className="w-3.5 h-3.5" /> שכפל
                    </button>
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* Group 3: Organize */}
                    <button
                      onClick={() => {
                        setShowMoveSubMenu(true);
                        setShowNewMoveInlineInput(false);
                        setNewMoveInlineName("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span className="flex-1 text-right">העבר לתיקייה</span>
                      <ChevronLeft className="w-3 h-3 text-(--text-muted)" />
                    </button>
                    <button
                      onClick={() => {
                        void pinPrompt(prompt);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Pin className="w-3.5 h-3.5" /> {prompt.is_pinned ? "בטל הצמדה" : "הצמד"}
                    </button>
                    <button
                      type="button"
                      title={favStarTitle}
                      aria-label={favStarTitle}
                      onClick={() => {
                        handleToggleFavorite("personal", prompt.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-start gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary) text-start"
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 mt-0.5",
                          isFavorite && "fill-yellow-300 text-yellow-300",
                        )}
                      />
                      <span className="flex-1 text-right leading-snug">{favStarTitle}</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleSelection(prompt.id);
                        setSelectionMode(true);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Square className="w-3.5 h-3.5" /> בחר
                    </button>
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* Group 4: Info */}
                    <button
                      onClick={() => {
                        setVersionHistoryPrompt(prompt);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <History className="w-3.5 h-3.5" /> גרסאות
                    </button>
                    <button
                      onClick={() => {
                        const dataStr =
                          "data:text/json;charset=utf-8," +
                          encodeURIComponent(JSON.stringify(prompt, null, 2));
                        const a = document.createElement("a");
                        a.setAttribute("href", dataStr);
                        a.setAttribute("download", `prompt_${prompt.id}.json`);
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        toast.success("יצוא הושלם");
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                    >
                      <Download className="w-3.5 h-3.5" /> ייצוא
                    </button>
                    <div className="h-px bg-(--glass-bg) my-1" />
                    {/* Group 5: Danger */}
                    <button
                      onClick={handleDeletePrompt}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> מחק
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-(--text-muted) shrink-0 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-3">
              <input
                dir="rtl"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg py-2 px-3 text-sm text-(--text-primary) focus:outline-none focus:border-black/15 dark:border-white/30"
                placeholder="כותרת לפרומפט"
              />
              <textarea
                dir="rtl"
                value={draftUseCase}
                onChange={(e) => setDraftUseCase(e.target.value)}
                className="w-full h-16 bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg py-2 px-3 text-sm text-(--text-secondary) focus:outline-none focus:border-black/15 dark:border-white/30 resize-none"
                placeholder="תיאור קצר"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveEditingPersonalPrompt(draftTitle, draftUseCase)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs rounded-lg font-medium hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Check className="w-3.5 h-3.5" /> שמור
                </button>
                <button
                  onClick={cancelEditingPersonalPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-(--glass-border) text-(--text-muted) text-xs rounded-lg hover:bg-(--glass-bg) focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <X className="w-3.5 h-3.5" /> ביטול
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Prompt text */}
              <SafeHtml
                html={toStyledHtml(styledMarkup)}
                className="text-sm text-(--text-primary) leading-relaxed rounded-lg bg-black/5 dark:bg-black/20 p-3 border border-(--glass-border)"
                dir="rtl"
              />

              {/* Original prompt ("before") — only shown when stored */}
              {prompt.original_prompt && (
                <div>
                  <button
                    onClick={() => setShowOriginal((v) => !v)}
                    className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    dir="rtl"
                  >
                    {showOriginal ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    הצג פרומפט מקורי
                  </button>
                  {showOriginal && (
                    <div
                      className="mt-2 me-2 text-xs text-(--text-muted) leading-relaxed whitespace-pre-wrap border-s-2 border-(--glass-border) ps-3"
                      dir="rtl"
                    >
                      {prompt.original_prompt}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {prompt.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-(--glass-bg) text-(--text-secondary) border border-(--glass-border)"
                    >
                      <Tag className="w-2.5 h-2.5 me-1 opacity-50" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Use count + favorites (ratings removed 2026-04-08;
                  the Star at the top of the card is the single source
                  of sentiment now). */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-(--text-muted)">
                  {prompt.use_count > 0 ? (
                    <span className="text-emerald-400/80">שומש {prompt.use_count} פעמים</span>
                  ) : (
                    <span className="text-blue-400/80">חדש</span>
                  )}
                  <span className="hidden @md/plcard:inline text-(--text-muted)">
                    {prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleFavorite("personal", prompt.id)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    isFavorite
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-(--text-muted) hover:text-amber-500 hover:bg-amber-500/10",
                  )}
                  title={favStarTitle}
                  aria-label={favStarTitle}
                  aria-pressed={isFavorite}
                >
                  <Star className={cn("w-4 h-4", isFavorite && "fill-amber-500")} />
                </button>
              </div>

              {/* Variable Filler */}
              {!isStyling && hasVariables && (
                <VariableFiller
                  promptText={prompt.prompt}
                  onApply={(filledText) => onUsePrompt({ ...prompt, prompt: filledText })}
                  presets={presets}
                  onSavePreset={addPreset}
                  onDeletePreset={deletePreset}
                />
              )}

              {/* Style Editor */}
              {isStyling && (
                <>
                  {styleEditorExpanded && (
                    <div
                      className="fixed inset-0 bg-black/70 z-40"
                      onClick={() => setStyleEditorExpanded(false)}
                    />
                  )}
                  <div
                    className={cn(
                      "rounded-xl border border-amber-500/20 bg-linear-to-b from-black/60 to-black/40 backdrop-blur-sm relative z-20 transition-all duration-300",
                      styleEditorExpanded ? "fixed inset-4 z-50 overflow-auto p-6" : "p-4",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && styleEditorExpanded) setStyleEditorExpanded(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-(--text-primary)">
                          עורך עיצוב
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setStyleEditorExpanded(!styleEditorExpanded)}
                          className="p-1.5 rounded-lg border border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                          title={styleEditorExpanded ? "מזער" : "הגדל"}
                        >
                          {styleEditorExpanded ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            closeStyleEditor();
                            setStyleEditorExpanded(false);
                          }}
                          className="p-1.5 rounded-lg border border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-(--text-muted) uppercase tracking-wider me-2 shrink-0">
                          צבע טקסט
                        </span>
                        {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                          <button
                            key={`text-${color}`}
                            onClick={() => applyStyleToken("c", color)}
                            className="w-7 h-7 rounded-lg border border-(--glass-border) hover:border-black/15 dark:border-white/30 hover:scale-110 transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                            title={color}
                          >
                            <span className={cn("font-bold text-sm", STYLE_TEXT_COLORS[color])}>
                              A
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-(--text-muted) uppercase tracking-wider me-2 shrink-0">
                          היילייט
                        </span>
                        {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                          <button
                            key={`hl-${color}`}
                            onClick={() => applyStyleToken("hl", color)}
                            className={cn(
                              "h-7 px-2 rounded-lg border border-(--glass-border) hover:border-black/15 dark:border-white/30 hover:scale-105 transition-all text-xs font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                              STYLE_HIGHLIGHT_COLORS[color],
                            )}
                          >
                            HL
                          </button>
                        ))}
                        <div className="w-px h-5 bg-black/5 dark:bg-white/10 mx-1" />
                        <button
                          onClick={clearStyleTokens}
                          className="h-7 px-2 rounded-lg border border-(--glass-border) text-(--text-muted) hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                          <Eraser className="w-3 h-3" />
                          <span className="text-xs">נקה</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-(--text-muted) uppercase tracking-wider me-2 shrink-0">
                          משתנים
                        </span>
                        {quickInserts.map((qi) => {
                          const Icon = qi.icon;
                          return (
                            <button
                              key={qi.text}
                              onClick={() => insertTextAtCursor(qi.text)}
                              className="h-7 px-2 rounded-lg border border-dashed border-amber-500/30 text-amber-600/70 dark:text-amber-400/70 hover:text-amber-700 dark:text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-1 text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                            >
                              <Icon className="w-3 h-3" />
                              {qi.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[10px] text-(--text-muted) mb-2 flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>סמנ/י טקסט ולחצ/י על צבע או היילייט כדי לעצב</span>
                    </div>
                    <textarea
                      ref={styleTextareaRef}
                      dir="rtl"
                      value={draftStyle}
                      onChange={(e) => setDraftStyle(e.target.value)}
                      className={cn(
                        "w-full bg-(--glass-bg) border border-(--glass-border) rounded-xl p-4 text-sm text-(--text-primary) leading-relaxed focus:outline-none focus:border-amber-500/30 transition-colors",
                        styleEditorExpanded ? "h-[50vh] resize-y" : "h-32 resize-y",
                      )}
                      placeholder="הטקסט של הפרומפט..."
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-(--text-muted)">
                        {draftStyle.length} תווים
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            closeStyleEditor();
                            setStyleEditorExpanded(false);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-muted) hover:bg-(--glass-bg) text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                          סגור
                        </button>
                        <button
                          onClick={() => {
                            saveStylePrompt(prompt.id, draftStyle);
                            setStyleEditorExpanded(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                        >
                          שמור עיצוב
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Full action buttons row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-(--glass-border)">
                <button
                  onClick={() => {
                    bumpPersonalLibraryLastUsed?.(prompt.id);
                    onUsePrompt(prompt);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Plus className="w-3 h-3" /> השתמש
                </button>
                <button
                  onClick={() => {
                    bumpPersonalLibraryLastUsed?.(prompt.id);
                    onCopyText(prompt.prompt);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Copy className="w-3 h-3" /> העתק
                </button>
                {/* Anchor 3 — Export to PDF. The personal library row is its
                    own "after" content (the saved enhanced prompt); there's
                    no separate "before" string here, so we pass the same
                    text as both. */}
                <ExportPdfButton
                  title={prompt.title || prompt.prompt.slice(0, 60)}
                  original={prompt.original_prompt || prompt.prompt}
                  enhanced={prompt.prompt}
                  createdAt={
                    typeof prompt.created_at === "number"
                      ? new Date(prompt.created_at).toISOString()
                      : (prompt.created_at as string | undefined)
                  }
                  className="p-1.5! min-h-0! min-w-0! w-7! h-7!"
                />
                <button
                  onClick={beginStyling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Wand2 className="w-3 h-3" /> עיצוב
                </button>
                <button
                  onClick={() => duplicateShared(prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-(--glass-border) text-(--text-secondary) text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Plus className="w-3 h-3" /> שכפל
                </button>
                <button
                  onClick={() => setVersionHistoryPrompt(prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <History className="w-3 h-3" /> גרסאות
                </button>
                <button
                  onClick={beginEditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                >
                  <Pencil className="w-3 h-3" /> ערוך
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite("personal", prompt.id)}
                  title={favStarTitle}
                  aria-label={favStarTitle}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    isFavorite
                      ? "border-yellow-300/30 text-yellow-300 bg-yellow-300/5"
                      : "border-(--glass-border) text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/10",
                  )}
                >
                  <Star className={cn("w-3 h-3", isFavorite && "fill-yellow-300")} /> מועדף
                </button>
                <button
                  onClick={handleDeletePrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/10 text-red-400 text-xs hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none ms-auto"
                >
                  <Trash2 className="w-3 h-3" /> מחק
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Memoized: the card takes a single `prompt` prop and reads the rest from
// focused contexts, so any grid re-render (pagination, sort, corpus arrival)
// re-rendered every visible card. React.memo skips cards whose prompt is unchanged.
export const PersonalLibraryPromptCard = memo(PersonalLibraryPromptCardImpl);

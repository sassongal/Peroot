"use client";

import {
    Star, ArrowRight, Plus, Copy, Pencil, Check, X,
    Trash2, CheckSquare, Square, Tag, Download,
    FolderInput, Upload, Pin, History,
    ChevronDown, ChevronLeft, ChevronRight, Folder,
    MoreHorizontal, Link2
} from "lucide-react";
import {
    Bold, Italic, Type, Eraser, Maximize2, Minimize2, Hash, AtSign, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { PersonalPrompt } from "@/lib/types";
import { toast } from "sonner";
import { STYLE_TEXT_COLORS, STYLE_HIGHLIGHT_COLORS, toStyledHtml, stripStyleTokens } from "@/lib/text-utils";
import { CapabilityBadge } from "@/components/ui/CapabilityBadge";
import { DateBadge } from "@/components/ui/DateBadge";
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";
import { fromPersonalLibraryRow } from "@/lib/prompt-entity";
import { useLibraryContext } from "@/context/LibraryContext";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { VariableFiller } from "@/components/features/variables/VariableFiller";
import { usePresets } from "@/hooks/usePresets";
import type { PersonalLibrarySharedState, PersonalLibraryViewProps } from "./types";

interface PersonalLibraryPromptCardProps {
  prompt: PersonalPrompt;
  shared: PersonalLibrarySharedState;
  viewProps: Pick<PersonalLibraryViewProps, "onUsePrompt" | "onCopyText">;
}

export function PersonalLibraryPromptCard({ prompt, shared, viewProps }: PersonalLibraryPromptCardProps) {
  const { onUsePrompt, onCopyText } = viewProps;
  const ctx = useLibraryContext();
  const {
    user,
    favoritePersonalIds,
    handleToggleFavorite,
    bumpPersonalLibraryLastUsed,
    editingPersonalId,
    editingTitle,
    setEditingTitle,
    editingUseCase,
    setEditingUseCase,
    startEditingPersonalPrompt,
    saveEditingPersonalPrompt,
    cancelEditingPersonalPrompt,
    editingStylePromptId,
    styleDraft,
    setStyleDraft,
    openStyleEditor,
    saveStylePrompt,
    closeStyleEditor,
    handlePersonalDragStart,
    handlePersonalDragOver,
    handlePersonalDragEnd,
    handlePersonalDrop,
    draggingPersonalId,
    dragOverPersonalId,
    duplicatePrompt,
    togglePin,
    deletePrompts,
    movePrompts,
    personalCategories,
  } = ctx;

  const { presets, addPreset, deletePreset } = usePresets();

  const {
    selectionMode,
    selectedIds,
    toggleSelection,
    expandedIds,
    setExpandedIds,
    openMenuId,
    setOpenMenuId,
    showMoveSubMenu,
    setShowMoveSubMenu,
    newMoveInlineName,
    setNewMoveInlineName,
    showNewMoveInlineInput,
    setShowNewMoveInlineInput,
    styleEditorExpanded,
    setStyleEditorExpanded,
    styleTextareaRef,
    applyStyleToken,
    clearStyleTokens,
    insertTextAtCursor,
    quickInserts,
    setVersionHistoryPrompt,
    allPersonalCategories,
    getStyledPromptMarkup,
    extractVariablesFromPrompt,
  } = shared;

  const isExpanded = expandedIds.has(prompt.id);
  const isEditing = editingPersonalId === prompt.id;
  const isDragging = draggingPersonalId === prompt.id;
  const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
  const isFavorite = favoritePersonalIds.has(prompt.id);
  const favStarTitle = user
    ? (isFavorite ? "הסר ממועדפים" : "הוסף למועדפים")
    : (isFavorite ? "הסר ממועדפים מקומיים" : "הוסף למועדפים במכשיר זה — התחבר לסנכרון בענן");
  const isStyling = editingStylePromptId === prompt.id;
  const styledMarkup = getStyledPromptMarkup(prompt);
  const isSelected = selectedIds.has(prompt.id);
  const isMenuOpen = openMenuId === prompt.id;
  const hasVariables = extractVariablesFromPrompt(prompt.prompt).length > 0;

  const toIso = (v: unknown): string =>
    typeof v === 'number' ? new Date(v).toISOString() : (typeof v === 'string' ? v : new Date().toISOString());
  const toIsoOrNull = (v: unknown): string | null =>
    v == null ? null : toIso(v);

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

  const toggleExpand = () => {
    if (selectionMode) { toggleSelection(prompt.id); return; }
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(prompt.id)) next.delete(prompt.id);
      else next.add(prompt.id);
      return next;
    });
  };

  return (
    <div
      key={prompt.id}
      draggable={!isEditing}
      onDragStart={(event) => handlePersonalDragStart(event, prompt)}
      onDragEnd={handlePersonalDragEnd}
      onDragOver={(event) => handlePersonalDragOver(event, prompt)}
      onDrop={(event) => handlePersonalDrop(event, prompt)}
      className={cn(
        "group rounded-xl border transition-all duration-200",
        "border-white/8 bg-white/[0.025] hover:bg-white/[0.04]",
        isDragging && "opacity-50 scale-[0.98]",
        isDragOver && "border-amber-500/40 bg-amber-500/5",
        isSelected && "border-blue-500/40 bg-blue-500/[0.06]",
        isExpanded && "border-white/15 bg-white/[0.04]"
      )}
    >
      {/* Collapsed Row */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 cursor-pointer select-none",
          isExpanded ? "py-3 border-b border-white/8" : "py-2.5"
        )}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(); } }}
        aria-expanded={isExpanded}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSelection(prompt.id); }}
          className={cn(
            "shrink-0 transition-opacity",
            (isSelected || selectionMode) ? "opacity-100" : "opacity-0 group-hover:opacity-60"
          )}
          aria-label="בחר"
        >
          {isSelected
            ? <CheckSquare className="w-4 h-4 text-blue-400" />
            : <Square className="w-4 h-4 text-[var(--text-muted)]" />}
        </button>

        {/* Pin indicator */}
        {prompt.is_pinned && (
          <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400 shrink-0" />
        )}

        {/* Capability badge */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <CapabilityBadge mode={prompt.capability_mode} className="scale-90 origin-center" />
        </div>

        {/* Title + Template badge + (mobile) DateBadge */}
        <div className="flex-1 min-w-0" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-primary)] font-medium truncate">
              {prompt.title}
            </span>
            {prompt.is_template && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                תבנית
              </span>
            )}
          </div>
          {/* Mobile-only meta line — dates + category always visible on small screens.
              Desktop uses the inline md:flex row below. */}
          <div className="flex md:hidden items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
            <DateBadge mode="compact" entity={entity} />
            <span className="opacity-50">·</span>
            <span className="truncate">{prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}</span>
            {prompt.use_count > 0 && (
              <>
                <span className="opacity-50">·</span>
                <span>{prompt.use_count}x</span>
              </>
            )}
          </div>
        </div>

        {/* Meta: use count + category + date (desktop) */}
        <span className="hidden md:flex items-center gap-2 text-xs text-[var(--text-muted)] shrink-0">
          {prompt.use_count > 0 && <span>שומש {prompt.use_count}x</span>}
          <span className="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--text-muted)]">{prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}</span>
          <DateBadge mode="compact" entity={entity} />
        </span>

        {/* Quick actions (collapsed) — always visible on mobile (no hover),
            hover-revealed on desktop. Bigger tap targets on mobile. */}
        <div
          className="flex items-center gap-0.5 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); bumpPersonalLibraryLastUsed?.(prompt.id); onCopyText(prompt.prompt); }}
            title="העתק"
            aria-label="העתק פרומפט"
            className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center"
          >
            <Copy className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); bumpPersonalLibraryLastUsed?.(prompt.id); onUsePrompt(prompt); }}
            title="השתמש"
            aria-label="השתמש בפרומפט"
            className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 md:w-3.5 md:h-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : prompt.id); setShowMoveSubMenu(false); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
              title="עוד"
              aria-label="פעולות נוספות"
              className="p-2 md:p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center"
            >
              <MoreHorizontal className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-50 bg-[#111] border border-[var(--glass-border)] rounded-xl shadow-2xl py-1 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {showMoveSubMenu ? (
                  <>
                    {/* Sub-menu header / back button */}
                    <button
                      onClick={() => { setShowMoveSubMenu(false); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> העבר לתיקייה
                    </button>
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
                    {/* Folder list */}
                    {allPersonalCategories.map((cat) => {
                      const isCurrent = (prompt.personal_category || PERSONAL_DEFAULT_CATEGORY) === cat;
                      return (
                        <button
                          key={cat}
                          onClick={async () => {
                            if (isCurrent) return;
                            try {
                              await movePrompts([prompt.id], cat);
                              toast.success(`הועבר לתיקייה "${cat}"`);
                            } catch { toast.error("שגיאה בהעברה"); }
                            setOpenMenuId(null);
                            setShowMoveSubMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-black/5 dark:bg-white/10",
                            isCurrent ? "text-amber-600 dark:text-amber-400 cursor-default" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <Folder className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 text-right">{cat}</span>
                          {isCurrent && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
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
                              try {
                                await movePrompts([prompt.id], name);
                                toast.success(`הועבר לתיקייה "${name}"`);
                              } catch { toast.error("שגיאה בהעברה"); }
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
                          className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-black/15 dark:border-white/30"
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
                              try {
                                await movePrompts([prompt.id], name);
                                toast.success(`הועבר לתיקייה "${name}"`);
                              } catch { toast.error("שגיאה בהעברה"); }
                              setOpenMenuId(null);
                              setShowMoveSubMenu(false);
                              setShowNewMoveInlineInput(false);
                              setNewMoveInlineName("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-black/5 dark:bg-white/10 rounded text-xs text-[var(--text-primary)] hover:bg-white/20"
                          >
                            <Check className="w-3 h-3" /> צור
                          </button>
                          <button
                            onClick={() => { setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1 border border-[var(--glass-border)] rounded text-xs text-[var(--text-muted)] hover:bg-black/5 dark:bg-white/10"
                          >
                            <X className="w-3 h-3" /> ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewMoveInlineInput(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                      >
                        <Plus className="w-3.5 h-3.5" /> תיקייה חדשה
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Group 1: Actions */}
                    <button onClick={() => { onUsePrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <ArrowRight className="w-3.5 h-3.5" /> השתמש
                    </button>
                    <button onClick={() => { onCopyText(prompt.prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Copy className="w-3.5 h-3.5" /> העתק
                    </button>
                    <button onClick={() => { onCopyText(prompt.prompt); toast.success("קישור הועתק!"); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Link2 className="w-3.5 h-3.5" /> שתף
                    </button>
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
                    {/* Group 2: Edit */}
                    <button onClick={() => { startEditingPersonalPrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Pencil className="w-3.5 h-3.5" /> ערוך
                    </button>
                    <button onClick={() => { openStyleEditor(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Wand2 className="w-3.5 h-3.5" /> עיצוב
                    </button>
                    <button onClick={async () => { await duplicatePrompt(prompt); toast.success("פרומפט שוכפל!"); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Plus className="w-3.5 h-3.5" /> שכפל
                    </button>
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
                    {/* Group 3: Organize */}
                    <button
                      onClick={() => { setShowMoveSubMenu(true); setShowNewMoveInlineInput(false); setNewMoveInlineName(""); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span className="flex-1 text-right">העבר לתיקייה</span>
                      <ChevronLeft className="w-3 h-3 text-[var(--text-muted)]" />
                    </button>
                    <button onClick={() => { togglePin(prompt.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Pin className="w-3.5 h-3.5" /> {prompt.is_pinned ? "בטל הצמדה" : "הצמד"}
                    </button>
                    <button onClick={() => { handleToggleFavorite("personal", prompt.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-yellow-300 text-yellow-300")} /> {isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                    </button>
                    <button onClick={() => { toggleSelection(prompt.id); shared.setSelectionMode(true); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <Square className="w-3.5 h-3.5" /> בחר
                    </button>
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
                    {/* Group 4: Info */}
                    <button onClick={() => { setVersionHistoryPrompt(prompt); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]">
                      <History className="w-3.5 h-3.5" /> גרסאות
                    </button>
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompt, null, 2));
                        const a = document.createElement("a");
                        a.setAttribute("href", dataStr);
                        a.setAttribute("download", `prompt_${prompt.id}.json`);
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        toast.success("יצוא הושלם");
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10 hover:text-[var(--text-primary)]"
                    >
                      <Download className="w-3.5 h-3.5" /> ייצוא
                    </button>
                    <div className="h-px bg-[var(--glass-bg)] my-1" />
                    {/* Group 5: Danger */}
                    <button
                      onClick={async () => {
                        if (!confirm("האם למחוק פרומפט זה?")) return;
                        try {
                          await deletePrompts([prompt.id]);
                          toast.success("נמחק בהצלחה");
                        } catch { toast.error("שגיאה במחיקה"); }
                        setOpenMenuId(null);
                      }}
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
        <ChevronDown className={cn(
          "w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-3">
              <input
                dir="rtl"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="w-full bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-black/15 dark:border-white/30"
                placeholder="כותרת לפרומפט"
              />
              <textarea
                dir="rtl"
                value={editingUseCase}
                onChange={(e) => setEditingUseCase(e.target.value)}
                className="w-full h-16 bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg py-2 px-3 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-black/15 dark:border-white/30 resize-none"
                placeholder="תיאור קצר"
              />
              <div className="flex items-center gap-2">
                <button onClick={saveEditingPersonalPrompt} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs rounded-lg font-medium hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Check className="w-3.5 h-3.5" /> שמור
                </button>
                <button onClick={cancelEditingPersonalPrompt} className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--glass-border)] text-[var(--text-muted)] text-xs rounded-lg hover:bg-[var(--glass-bg)] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <X className="w-3.5 h-3.5" /> ביטול
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Prompt text */}
              <SafeHtml
                html={toStyledHtml(styledMarkup)}
                className="text-sm text-[var(--text-secondary)] leading-relaxed rounded-lg bg-black/5 dark:bg-black/20 p-3 border border-[var(--glass-border)]"
                dir="rtl"
              />

              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {prompt.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-white/8 text-[var(--text-secondary)] border border-white/8">
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
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  {prompt.use_count > 0
                    ? <span className="text-emerald-400/80">שומש {prompt.use_count} פעמים</span>
                    : <span className="text-blue-400/80">חדש</span>
                  }
                  <span className="hidden md:inline text-[var(--text-muted)]">{prompt.personal_category || PERSONAL_DEFAULT_CATEGORY}</span>
                </div>
                <button
                  onClick={() => handleToggleFavorite('personal', prompt.id)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                    isFavorite
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10"
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
                    <div className="fixed inset-0 bg-black/70 z-40" onClick={() => setStyleEditorExpanded(false)} />
                  )}
                  <div
                    className={cn(
                      "rounded-xl border border-amber-500/20 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-sm relative z-20 transition-all duration-300",
                      styleEditorExpanded ? "fixed inset-4 z-50 overflow-auto p-6" : "p-4"
                    )}
                    onKeyDown={(e) => { if (e.key === 'Escape' && styleEditorExpanded) setStyleEditorExpanded(false); }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">עורך עיצוב</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setStyleEditorExpanded(!styleEditorExpanded)} className="p-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title={styleEditorExpanded ? "מזער" : "הגדל"}>
                          {styleEditorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }} className="p-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">צבע טקסט</span>
                        {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                          <button key={`text-${color}`} onClick={() => applyStyleToken("c", color)} className="w-7 h-7 rounded-lg border border-[var(--glass-border)] hover:border-black/15 dark:border-white/30 hover:scale-110 transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none" title={color}>
                            <span className={cn("font-bold text-sm", STYLE_TEXT_COLORS[color])}>A</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">היילייט</span>
                        {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                          <button key={`hl-${color}`} onClick={() => applyStyleToken("hl", color)} className={cn("h-7 px-2 rounded-lg border border-[var(--glass-border)] hover:border-black/15 dark:border-white/30 hover:scale-105 transition-all text-xs font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", STYLE_HIGHLIGHT_COLORS[color])}>
                            HL
                          </button>
                        ))}
                        <div className="w-px h-5 bg-black/5 dark:bg-white/10 mx-1" />
                        <button onClick={clearStyleTokens} className="h-7 px-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                          <Eraser className="w-3 h-3" /><span className="text-xs">נקה</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider me-2 shrink-0">משתנים</span>
                        {quickInserts.map((qi) => {
                          const Icon = qi.icon;
                          return (
                            <button key={qi.text} onClick={() => insertTextAtCursor(qi.text)} className="h-7 px-2 rounded-lg border border-dashed border-amber-500/30 text-amber-600/70 dark:text-amber-400/70 hover:text-amber-700 dark:text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center gap-1 text-xs focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                              <Icon className="w-3 h-3" />{qi.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mb-2 flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>סמנ/י טקסט ולחצ/י על צבע או היילייט כדי לעצב</span>
                    </div>
                    <textarea
                      ref={styleTextareaRef}
                      dir="rtl"
                      value={styleDraft}
                      onChange={(e) => setStyleDraft(e.target.value)}
                      className={cn("w-full bg-black/40 border border-[var(--glass-border)] rounded-xl p-4 text-sm text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-amber-500/30 transition-colors", styleEditorExpanded ? "h-[50vh] resize-y" : "h-32 resize-y")}
                      placeholder="הטקסט של הפרומפט..."
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-600">{styleDraft.length} תווים</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { closeStyleEditor(); setStyleEditorExpanded(false); }} className="px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--glass-bg)] text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                          סגור
                        </button>
                        <button onClick={() => { saveStylePrompt(prompt.id); setStyleEditorExpanded(false); }} className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                          שמור עיצוב
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Full action buttons row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--glass-border)]">
                <button onClick={() => { bumpPersonalLibraryLastUsed?.(prompt.id); onUsePrompt(prompt); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Plus className="w-3 h-3" /> השתמש
                </button>
                <button onClick={() => { bumpPersonalLibraryLastUsed?.(prompt.id); onCopyText(prompt.prompt); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Copy className="w-3 h-3" /> העתק
                </button>
                {/* Anchor 3 — Export to PDF. The personal library row is its
                    own "after" content (the saved enhanced prompt); there's
                    no separate "before" string here, so we pass the same
                    text as both. */}
                <ExportPdfButton
                  title={prompt.title || prompt.prompt.slice(0, 60)}
                  original={prompt.prompt}
                  enhanced={prompt.prompt}
                  createdAt={typeof prompt.created_at === 'number' ? new Date(prompt.created_at).toISOString() : (prompt.created_at as string | undefined)}
                  className="!p-1.5 !min-h-0 !min-w-0 !w-7 !h-7"
                />
                <button onClick={() => openStyleEditor(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Wand2 className="w-3 h-3" /> עיצוב
                </button>
                <button onClick={async () => { await duplicatePrompt(prompt); toast.success("פרומפט שוכפל!"); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Plus className="w-3 h-3" /> שכפל
                </button>
                <button onClick={() => setVersionHistoryPrompt(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <History className="w-3 h-3" /> גרסאות
                </button>
                <button onClick={() => startEditingPersonalPrompt(prompt)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-black/5 dark:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none">
                  <Pencil className="w-3 h-3" /> ערוך
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFavorite("personal", prompt.id)}
                  title={favStarTitle}
                  aria-label={favStarTitle}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none", isFavorite ? "border-yellow-300/30 text-yellow-300 bg-yellow-300/5" : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-black/5 dark:bg-white/10")}
                >
                  <Star className={cn("w-3 h-3", isFavorite && "fill-yellow-300")} /> מועדף
                </button>
                <button onClick={() => { const next = new Set(expandedIds); next.delete(prompt.id); setExpandedIds(next); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/10 text-red-400 text-xs hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none ms-auto">
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

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Zap,
  Pencil,
  Tag,
  Clock,
  BarChart2,
  Star,
  BookTemplate,
  Check,
  Plus,
  Copy,
  Pin,
  MoreVertical,
  Trash2,
  FolderInput,
  History,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { CAPABILITY_COLORS } from "./graph-utils";
import { useLibraryContext } from "@/context/LibraryContext";
import { useFavoritesContext } from "@/context/FavoritesContext";
import { VersionHistoryModal } from "./VersionHistoryModal";

const CAPABILITY_LABELS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "רגיל",
  [CapabilityMode.IMAGE_GENERATION]: "תמונות",
  [CapabilityMode.DEEP_RESEARCH]: "מחקר",
  [CapabilityMode.AGENT_BUILDER]: "סוכן",
  [CapabilityMode.VIDEO_GENERATION]: "וידאו",
};

interface PromptNodeCardProps {
  prompt: PersonalPrompt | null;
  onClose: () => void;
  onUse: (p: PersonalPrompt) => void;
  onEdit: (p: PersonalPrompt) => void;
  onSaveTitle: (id: string, title: string) => Promise<void>;
  onSaveTags: (id: string, tags: string[]) => Promise<void>;
  backButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function PromptNodeCard({
  prompt,
  onClose,
  onUse,
  onEdit,
  onSaveTitle,
  onSaveTags,
  backButtonRef,
}: PromptNodeCardProps) {
  const { togglePin, movePrompts, deletePrompts, personalCategories, updatePrompt } =
    useLibraryContext();
  const { favoritePersonalIds, handleToggleFavorite } = useFavoritesContext();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Full inline edit mode
  const [editMode, setEditMode] = useState(false);
  const [editTitleDraft, setEditTitleDraft] = useState("");
  const [editUseCaseDraft, setEditUseCaseDraft] = useState("");
  const [editPromptDraft, setEditPromptDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const folderPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prompt) setTitleDraft(prompt.title);
    setEditingTitle(false);
    setTagInput("");
    setMenuOpen(false);
    setMoveOpen(false);
    setConfirmDelete(false);
    setEditMode(false);
  }, [prompt?.id]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!folderPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setFolderPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [folderPickerOpen]);

  const handleSaveTitle = useCallback(async () => {
    if (!prompt) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === prompt.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await onSaveTitle(prompt.id, trimmed);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }, [prompt, titleDraft, onSaveTitle]);

  const handleAddTag = useCallback(async () => {
    if (!prompt) return;
    const tag = tagInput.trim().toLowerCase();
    if (!tag || prompt.tags?.includes(tag)) {
      setTagInput("");
      return;
    }
    const newTags = [...(prompt.tags ?? []), tag];
    setSavingTags(true);
    setTagInput("");
    try {
      await onSaveTags(prompt.id, newTags);
    } finally {
      setSavingTags(false);
    }
  }, [prompt, tagInput, onSaveTags]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!prompt) return;
      const newTags = (prompt.tags ?? []).filter((t) => t !== tag);
      setSavingTags(true);
      try {
        await onSaveTags(prompt.id, newTags);
      } finally {
        setSavingTags(false);
      }
    },
    [prompt, onSaveTags],
  );

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("הפרומפט הועתק ללוח");
    } catch {
      toast.error("העתקה נכשלה");
    }
  }, [prompt]);

  const handleToggleFav = useCallback(async () => {
    if (!prompt) return;
    try {
      await handleToggleFavorite("personal", prompt.id);
    } catch {
      toast.error("שגיאה בעדכון מועדפים");
    }
  }, [prompt, handleToggleFavorite]);

  const handlePin = useCallback(async () => {
    if (!prompt) return;
    try {
      await togglePin(prompt.id);
    } catch {
      toast.error("שגיאה בהצמדה");
    }
  }, [prompt, togglePin]);

  const handleMove = useCallback(
    async (category: string) => {
      if (!prompt) return;
      try {
        await movePrompts([prompt.id], category);
        toast.success(`הועבר ל"${category}"`);
        setMenuOpen(false);
        setMoveOpen(false);
      } catch {
        toast.error("העברה נכשלה");
      }
    },
    [prompt, movePrompts],
  );

  const handleDelete = useCallback(async () => {
    if (!prompt) return;
    try {
      await deletePrompts([prompt.id]);
      toast.success("הפרומפט נמחק");
      onClose();
    } catch {
      toast.error("מחיקה נכשלה");
    }
  }, [prompt, deletePrompts, onClose]);

  const handleOpenEdit = useCallback(() => {
    if (!prompt) return;
    setEditTitleDraft(prompt.title);
    setEditUseCaseDraft(prompt.use_case ?? "");
    setEditPromptDraft(prompt.prompt);
    setEditMode(true);
  }, [prompt]);

  const handleSaveEdit = useCallback(async () => {
    if (!prompt) return;
    setSavingEdit(true);
    try {
      await updatePrompt(prompt.id, {
        title: editTitleDraft.trim() || prompt.title,
        use_case: editUseCaseDraft.trim(),
        prompt: editPromptDraft.trim() || prompt.prompt,
      });
      toast.success("הפרומפט עודכן");
      setEditMode(false);
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSavingEdit(false);
    }
  }, [prompt, updatePrompt, editTitleDraft, editUseCaseDraft, editPromptDraft]);

  if (!prompt) return null;

  const cap = prompt.capability_mode ?? CapabilityMode.STANDARD;
  const color = CAPABILITY_COLORS[cap];
  const total = (prompt.success_count ?? 0) + (prompt.fail_count ?? 0);
  const successPct = total > 0 ? Math.round(((prompt.success_count ?? 0) / total) * 100) : null;
  const isFavorite = favoritePersonalIds.has(prompt.id);
  const isPinned = !!prompt.is_pinned;

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 gap-2"
        dir="rtl"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            ref={backButtonRef}
            onClick={onClose}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
            aria-label="חזרה לגרף"
          >
            <X className="w-3.5 h-3.5" />
            חזרה לגרף
          </button>
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0"
            style={{ color, borderColor: color + "55", backgroundColor: color + "18" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {CAPABILITY_LABELS[cap]}
          </span>
        </div>

        {/* Overflow menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="פעולות נוספות"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full mt-1 left-0 w-56 rounded-xl border border-white/15 bg-slate-900/98 backdrop-blur-md shadow-2xl z-10 overflow-hidden"
            >
              {/* Move to folder */}
              <button
                onClick={() => setMoveOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/8 transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span className="flex-1 text-right">העבר לתיקייה</span>
                <span className="text-slate-500 text-[10px]">{moveOpen ? "▾" : "▸"}</span>
              </button>
              {moveOpen && (
                <div className="max-h-48 overflow-y-auto border-t border-white/8 bg-black/30">
                  {personalCategories.length === 0 ? (
                    <div className="px-5 py-2 text-[11px] text-slate-500">אין תיקיות</div>
                  ) : (
                    personalCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleMove(cat)}
                        disabled={cat === prompt.personal_category}
                        className="w-full px-5 py-1.5 text-[11px] text-right text-slate-300 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {cat}
                        {cat === prompt.personal_category && (
                          <span className="text-slate-500 text-[9px] mr-2">(נוכחית)</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
              {/* Pin / Unpin */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handlePin();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/8 transition-colors border-t border-white/8"
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current text-amber-300" : ""}`} />
                <span className="flex-1 text-right">{isPinned ? "בטל הצמדה" : "הצמד"}</span>
              </button>
              {/* Version history */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowHistory(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/8 transition-colors border-t border-white/8"
              >
                <History className="w-3.5 h-3.5" />
                <span className="flex-1 text-right">היסטוריית גרסאות</span>
              </button>
              {/* Delete */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/15 transition-colors border-t border-white/8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="flex-1 text-right">מחק</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/8 bg-red-500/10">
                  <span className="flex-1 text-[11px] text-red-300 text-right px-1">
                    למחוק לצמיתות?
                  </span>
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-md bg-red-500/30 text-red-200 hover:bg-red-500/50 transition-colors"
                    aria-label="אישור מחיקה"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="p-1.5 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="ביטול"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Edit Mode — replaces body + footer */}
      {editMode && (
        <>
          <div className="px-4 py-3 flex-1 flex flex-col gap-3 overflow-y-auto" dir="rtl">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">כותרת</label>
              <input
                value={editTitleDraft}
                onChange={(e) => setEditTitleDraft(e.target.value)}
                className="w-full text-sm font-semibold text-white bg-white/8 rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-amber-400/60 transition-colors"
                dir="rtl"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">תיאור קצר</label>
              <input
                value={editUseCaseDraft}
                onChange={(e) => setEditUseCaseDraft(e.target.value)}
                placeholder="מה הפרומפט הזה עושה?"
                className="w-full text-sm text-white bg-white/8 rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-amber-400/60 transition-colors placeholder:text-slate-600"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-slate-400">תוכן הפרומפט</label>
              <textarea
                value={editPromptDraft}
                onChange={(e) => setEditPromptDraft(e.target.value)}
                className="flex-1 min-h-[140px] text-sm text-slate-200 bg-white/8 rounded-lg px-3 py-2 border border-white/15 focus:outline-none focus:border-amber-400/60 transition-colors resize-none leading-relaxed"
                dir="rtl"
              />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3 shrink-0 border-t border-white/10 flex gap-2" dir="rtl">
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-60 transition-all"
            >
              <Check className="w-4 h-4" />
              {savingEdit ? "שומר..." : "שמור שינויים"}
            </button>
            <button
              onClick={() => setEditMode(false)}
              disabled={savingEdit}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-sm text-white/80 border border-white/15 hover:bg-white/8 transition-all"
            >
              ביטול
            </button>
          </div>
        </>
      )}

      {/* Body + Footer — hidden in edit mode */}
      {!editMode && (
        <>
          <div className="px-4 py-3 flex-1 flex flex-col gap-3 overflow-y-auto" dir="rtl">
            {/* Editable title */}
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={titleRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="flex-1 min-w-0 text-sm font-semibold text-white bg-white/10 rounded-md px-2 py-1 outline-none border border-white/20 focus:border-amber-400/60"
                  disabled={savingTitle}
                  dir="auto"
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="p-1 rounded text-green-400 hover:text-green-300 hover:bg-white/10"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <h3
                className="text-base font-semibold text-white cursor-pointer hover:text-amber-300 transition-colors"
                title="לחץ לעריכת כותרת"
                onClick={() => setEditingTitle(true)}
              >
                {prompt.title}
              </h3>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {prompt.is_template && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-300 bg-cyan-400/10">
                  <BookTemplate className="w-3 h-3" />
                  תבנית
                </span>
              )}
              {isPinned && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300 bg-amber-400/10">
                  <Pin className="w-3 h-3" />
                  מוצמד
                </span>
              )}
              {prompt.use_count > 0 && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-slate-300 bg-white/5">
                  <Star className="w-3 h-3" />
                  {prompt.use_count} שימושים
                </span>
              )}
            </div>

            {/* Prompt text */}
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-8 whitespace-pre-line bg-white/4 rounded-lg p-2.5">
              {prompt.prompt}
            </p>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {(prompt.tags ?? []).slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => !savingTags && handleRemoveTag(tag)}
                    disabled={savingTags}
                    className="group flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/8 text-slate-300 text-[10px] border border-white/8 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-colors"
                    title="הסר תגית"
                  >
                    {tag}
                    <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                  }}
                  placeholder="+ תגית חדשה"
                  disabled={savingTags}
                  dir="auto"
                  className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded-md px-2 py-1 text-slate-300 placeholder-slate-600 outline-none focus:border-amber-400/40 transition-colors"
                />
                {tagInput.trim() && (
                  <button
                    onClick={handleAddTag}
                    disabled={savingTags}
                    className="p-1.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Variables */}
            {prompt.template_variables && prompt.template_variables.length > 0 && (
              <div className="flex items-start gap-1.5 flex-wrap">
                <span className="text-[10px] text-cyan-400 shrink-0 mt-0.5">משתנים:</span>
                {prompt.template_variables.map((v) => (
                  <span
                    key={v}
                    className="px-1.5 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 text-[10px] border border-cyan-400/20"
                  >
                    {"{{"}
                    {v}
                    {"}}"}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
              {prompt.use_count > 0 && (
                <div className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" />
                  <span>{prompt.use_count} שימושים</span>
                </div>
              )}
              {successPct !== null && (
                <div
                  className="flex items-center gap-1"
                  style={{
                    color: successPct > 70 ? "#22c55e" : successPct > 40 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  <span>{successPct}% הצלחה</span>
                </div>
              )}
              {prompt.last_used_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(prompt.last_used_at).toLocaleDateString("he-IL")}</span>
                </div>
              )}
            </div>

            {/* Folder — inline picker */}
            <div ref={folderPickerRef} className="relative">
              <button
                onClick={() => setFolderPickerOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors group"
              >
                <FolderInput className="w-3.5 h-3.5 shrink-0" />
                <span>
                  תיקייה:{" "}
                  <span className="text-slate-200 group-hover:text-amber-300 transition-colors">
                    {prompt.personal_category || "ללא תיקייה"}
                  </span>
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${folderPickerOpen ? "rotate-180" : ""}`}
                />
              </button>
              {folderPickerOpen && (
                <div className="absolute top-full mt-1 right-0 w-52 rounded-xl border border-white/15 bg-slate-900/98 backdrop-blur-md shadow-2xl z-20 overflow-hidden">
                  {personalCategories.length === 0 ? (
                    <div className="px-4 py-3 text-[11px] text-slate-500">אין תיקיות</div>
                  ) : (
                    personalCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          handleMove(cat);
                          setFolderPickerOpen(false);
                        }}
                        disabled={cat === prompt.personal_category}
                        className="w-full px-4 py-2 text-[11px] text-right text-slate-300 hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
                      >
                        {cat}
                        {cat === prompt.personal_category && (
                          <Check className="w-3 h-3 text-amber-400" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer — primary + secondary actions */}
          <div
            className="px-4 pb-4 pt-3 shrink-0 border-t border-white/10 flex flex-col gap-2"
            dir="rtl"
          >
            {/* Primary row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUse(prompt)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-black transition-all shadow-lg hover:scale-[1.01] active:scale-[0.98]"
                style={{ backgroundColor: color }}
              >
                <Zap className="w-4 h-4" />
                השתמש בפרומפט
              </button>
              <button
                onClick={handleOpenEdit}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-medium text-sm text-white/90 border border-white/15 hover:bg-white/8 hover:border-white/25 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                ערוך
              </button>
            </div>
            {/* Secondary row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] text-slate-300 hover:text-white border border-white/10 hover:bg-white/6 transition-colors"
                title="העתק טקסט"
              >
                <Copy className="w-3.5 h-3.5" />
                העתק
              </button>
              <button
                onClick={handleToggleFav}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] border transition-colors ${
                  isFavorite
                    ? "text-amber-300 border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15"
                    : "text-slate-300 hover:text-white border-white/10 hover:bg-white/6"
                }`}
                title="הוסף למועדפים"
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "מועדף" : "מועדף"}
              </button>
              <button
                onClick={handlePin}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] border transition-colors ${
                  isPinned
                    ? "text-amber-300 border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15"
                    : "text-slate-300 hover:text-white border-white/10 hover:bg-white/6"
                }`}
                title="הצמד"
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                {isPinned ? "מוצמד" : "הצמד"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Version history modal */}
      {showHistory && (
        <VersionHistoryModal
          promptId={prompt.id}
          promptTitle={prompt.title}
          onClose={() => setShowHistory(false)}
          onRestore={async (content, title) => {
            try {
              await updatePrompt(prompt.id, {
                prompt: content,
                title: title ?? prompt.title,
              });
              toast.success("הגרסה שוחזרה");
            } catch {
              toast.error("שחזור נכשל");
            }
            setShowHistory(false);
          }}
        />
      )}
    </>
  );
}

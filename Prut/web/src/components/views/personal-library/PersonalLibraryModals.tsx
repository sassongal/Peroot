"use client";

import { X, Plus, Trash2, Tag, Download, FolderInput, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalPrompt } from "@/lib/types";
import { useLibraryContext } from "@/context/LibraryContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { VersionHistoryModal } from "@/components/features/library/VersionHistoryModal";
import {
  usePersonalLibrarySelection,
  usePersonalLibraryFolders,
  usePersonalLibraryBatchDialogs,
  usePersonalLibraryVersionHistory,
} from "./context/PersonalLibraryContext";

export function PersonalLibraryModals() {
  const ctx = useLibraryContext();
  const confirmDialog = useConfirm();
  const { personalCategories, patchPromptLocal, deletePersonalCategory } = ctx;

  const { selectedIds, clearSelection } = usePersonalLibrarySelection();
  const { effectiveFolder, folderCounts, setFolder, handleFolderRename } =
    usePersonalLibraryFolders();
  const {
    folderContextMenu,
    setFolderContextMenu,
    showMoveDialog,
    setShowMoveDialog,
    showTagDialog,
    setShowTagDialog,
    tagsInput,
    setTagsInput,
    targetMoveCategory,
    setTargetMoveCategory,
    isCreatingNewMoveCategory,
    setIsCreatingNewMoveCategory,
    newMoveCategoryInput,
    setNewMoveCategoryInput,
    handleBatchDelete,
    handleBatchMove,
    handleBatchTag,
    handleBatchExport,
  } = usePersonalLibraryBatchDialogs();
  const { versionHistoryPrompt, setVersionHistoryPrompt } = usePersonalLibraryVersionHistory();

  return (
    <>
      {/* ── Floating Batch Actions Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-2 rounded-2xl border border-(--glass-border) bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 w-[calc(100%-2rem)] md:w-auto">
          <div className="ps-3 pe-2 text-sm font-medium text-(--text-primary) border-e border-(--glass-border)">
            {selectedIds.size} נבחרו
          </div>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:outline-none"
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden md:inline">מחק</span>
          </button>
          <button
            onClick={() => setShowMoveDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-(--text-secondary) text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <FolderInput className="w-4 h-4" /> <span className="hidden md:inline">העבר ל...</span>
          </button>
          <button
            onClick={() => setShowTagDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-(--text-secondary) text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <Tag className="w-4 h-4" /> <span className="hidden md:inline">תגיות</span>
          </button>
          <button
            onClick={handleBatchExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:bg-white/10 text-(--text-secondary) text-xs transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <Download className="w-4 h-4" /> <span className="hidden md:inline">ייצוא</span>
          </button>
          <div className="w-px h-5 bg-black/5 dark:bg-white/10 mx-1" />
          <button
            onClick={clearSelection}
            className="p-1.5 hover:bg-black/5 dark:bg-white/10 rounded-full text-(--text-muted) focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Move Dialog ── */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-[#111] border border-(--glass-border) rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4"
            dir="rtl"
          >
            <h3 className="text-xl text-(--text-primary) font-serif mb-4 text-center">
              העברת {selectedIds.size} פריטים
            </h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  setIsCreatingNewMoveCategory(true);
                  setTargetMoveCategory("");
                }}
                className={cn(
                  "w-full text-start px-4 py-3 rounded-xl border transition-all text-sm flex items-center justify-between focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  isCreatingNewMoveCategory
                    ? "bg-blue-600/20 border-blue-500 text-blue-200"
                    : "bg-(--glass-bg) border-(--glass-border) text-(--text-secondary) hover:bg-black/5 dark:bg-white/10",
                )}
              >
                <span>+ קטגוריה חדשה</span>
                <Plus className="w-4 h-4" />
              </button>
              {isCreatingNewMoveCategory && (
                <div className="p-1 animate-in slide-in-from-top-2 duration-300">
                  <input
                    dir="rtl"
                    value={newMoveCategoryInput}
                    onChange={(e) => setNewMoveCategoryInput(e.target.value)}
                    placeholder="שם הקטגוריה..."
                    className="w-full bg-black/40 border border-blue-500/50 rounded-lg p-3 text-(--text-primary) focus:outline-none"
                    autoFocus
                  />
                </div>
              )}
              <div className="h-px bg-(--glass-bg) my-2" />
              {Array.from(new Set([...personalCategories, PERSONAL_DEFAULT_CATEGORY])).map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setTargetMoveCategory(cat);
                      setIsCreatingNewMoveCategory(false);
                    }}
                    className={cn(
                      "w-full text-start px-4 py-3 rounded-xl border transition-all text-sm focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                      targetMoveCategory === cat && !isCreatingNewMoveCategory
                        ? "bg-white text-black border-white"
                        : "bg-(--glass-bg) border-(--glass-border) text-(--text-secondary) hover:bg-black/5 dark:bg-white/10",
                    )}
                  >
                    {cat}
                  </button>
                ),
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchMove}
                disabled={!targetMoveCategory && !newMoveCategoryInput.trim()}
                className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                אישור
              </button>
              <button
                onClick={() => {
                  setShowMoveDialog(false);
                  setIsCreatingNewMoveCategory(false);
                }}
                className="flex-1 bg-(--glass-bg) text-(--text-secondary) py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tag Dialog ── */}
      {showTagDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-[#111] border border-(--glass-border) rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4"
            dir="rtl"
          >
            <h3 className="text-xl text-(--text-primary) font-serif mb-4 text-center">
              הוספת תגיות
            </h3>
            <p className="text-(--text-muted) text-sm mb-4 text-center">
              הזן תגיות מופרדות בפסיקים
            </p>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="למשל: שיווק, דואל, חשוב"
              className="w-full bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg p-3 text-(--text-primary) mb-6 focus:border-black/15 dark:border-white/30 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBatchTag}
                className="flex-1 bg-white text-black py-2.5 rounded-lg font-medium focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                שמור תגיות
              </button>
              <button
                onClick={() => setShowTagDialog(false)}
                className="flex-1 bg-(--glass-bg) text-(--text-secondary) py-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folder context menu ── */}
      {folderContextMenu && (
        <div
          className="fixed z-80 bg-[#111] border border-(--glass-border) rounded-xl shadow-2xl py-1 min-w-[160px] animate-in fade-in duration-150"
          style={{ top: folderContextMenu.y, left: folderContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleFolderRename(folderContextMenu.folder)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-(--text-secondary) hover:bg-black/5 dark:bg-white/10 hover:text-(--text-primary)"
          >
            <Pencil className="w-3.5 h-3.5" /> שנה שם
          </button>
          <div className="h-px bg-(--glass-bg) my-1" />
          <button
            onClick={async () => {
              const folder = folderContextMenu.folder;
              const count = folderCounts[folder] ?? 0;
              const msg =
                count > 0
                  ? `${count} פרומפטים יועברו לתיקיית "כללי" והתיקייה תימחק.`
                  : "התיקייה הריקה תימחק.";
              if (
                !(await confirmDialog({
                  title: `למחוק את התיקייה "${folder}"?`,
                  message: msg,
                  danger: true,
                  confirmLabel: "מחק תיקייה",
                }))
              )
                return;
              setFolderContextMenu(null);
              if (effectiveFolder === folder) setFolder("all");
              await deletePersonalCategory(folder, "move");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> מחק תיקייה
          </button>
        </div>
      )}

      {/* ── Version History Modal ── */}
      {versionHistoryPrompt && (
        <VersionHistoryModal
          promptId={versionHistoryPrompt.id}
          promptTitle={versionHistoryPrompt.title}
          onClose={() => setVersionHistoryPrompt(null)}
          onRestore={(content, title) => {
            // The restore POST (/api/prompts/versions) already persisted the row;
            // patch local state only to avoid a redundant DB write + extra snapshot.
            const updates: Partial<PersonalPrompt> = { prompt: content };
            if (title) updates.title = title;
            patchPromptLocal(versionHistoryPrompt.id, updates);
          }}
        />
      )}
    </>
  );
}

import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import React from "react";

// ─── Props passed from the top-level PersonalLibraryView to every child ────

export interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
}

// ─── Shared state that the orchestrator computes and passes down ────────────

export interface PersonalLibrarySharedState {
  // Display
  displayItems: PersonalPrompt[];
  allDisplayItems: PersonalPrompt[];
  effectiveFolder: string;
  activeFolderLabel: string;
  folderCounts: Record<string, number>;
  allPersonalCategories: string[];
  isLoading: boolean;
  currentSort: string;
  localSearch: string;

  // Pagination
  usedPage: number;
  usedPageSize: number;
  usedTotalCount: number;
  totalPages: number;

  // Selection
  selectionMode: boolean;
  setSelectionMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelection: (id: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;

  // Expanded card state
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;

  // Per-card dropdown menu
  openMenuId: string | null;
  setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  showMoveSubMenu: boolean;
  setShowMoveSubMenu: React.Dispatch<React.SetStateAction<boolean>>;
  newMoveInlineName: string;
  setNewMoveInlineName: React.Dispatch<React.SetStateAction<string>>;
  showNewMoveInlineInput: boolean;
  setShowNewMoveInlineInput: React.Dispatch<React.SetStateAction<boolean>>;

  // Style editor
  styleEditorExpanded: boolean;
  setStyleEditorExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  styleTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  applyStyleToken: (prefix: string, value: string) => void;
  clearStyleTokens: () => void;
  insertTextAtCursor: (text: string) => void;
  quickInserts: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }[];

  // Version history
  versionHistoryPrompt: PersonalPrompt | null;
  setVersionHistoryPrompt: React.Dispatch<React.SetStateAction<PersonalPrompt | null>>;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Folder context menu
  folderContextMenu: { folder: string; x: number; y: number } | null;
  setFolderContextMenu: React.Dispatch<
    React.SetStateAction<{ folder: string; x: number; y: number } | null>
  >;

  // New folder input
  showNewFolderInput: boolean;
  setShowNewFolderInput: React.Dispatch<React.SetStateAction<boolean>>;
  newFolderName: string;
  setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
  handleAddNewFolder: () => Promise<void>;

  // Chains
  chainsExpanded: boolean;
  setChainsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  // Dialog state
  showMoveDialog: boolean;
  setShowMoveDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showTagDialog: boolean;
  setShowTagDialog: React.Dispatch<React.SetStateAction<boolean>>;
  tagsInput: string;
  setTagsInput: React.Dispatch<React.SetStateAction<string>>;
  targetMoveCategory: string;
  setTargetMoveCategory: React.Dispatch<React.SetStateAction<string>>;
  isCreatingNewMoveCategory: boolean;
  setIsCreatingNewMoveCategory: React.Dispatch<React.SetStateAction<boolean>>;
  newMoveCategoryInput: string;
  setNewMoveCategoryInput: React.Dispatch<React.SetStateAction<string>>;

  // Graph view toggle
  localViewType: "grid" | "graph";
  setLocalViewType: React.Dispatch<React.SetStateAction<"grid" | "graph">>;

  // Import ref
  importFileRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  handleSearchChange: (val: string) => void;
  handleSortChange: (val: string) => void;
  handlePageChange: (p: number) => void;
  setFolder: (folder: string) => void;
  handleFolderContextMenu: (e: React.MouseEvent, folder: string) => void;
  handleFolderRename: (folder: string) => void;
  handleBatchDelete: () => Promise<void>;
  handleBatchMove: () => Promise<void>;
  handleBatchTag: () => Promise<void>;
  handleBatchExport: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  addPersonalPromptFromLibrary: (prompt: LibraryPrompt) => Promise<void>;
  getPaginationPages: () => (number | "...")[];
  getStyledPromptMarkup: (prompt: PersonalPrompt) => string;
  extractVariablesFromPrompt: (text: string) => string[];
}

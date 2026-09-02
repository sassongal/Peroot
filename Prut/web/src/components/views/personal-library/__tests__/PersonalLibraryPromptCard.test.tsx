// @vitest-environment jsdom
/**
 * The collapsed card row is ONE primary action plus the menu.
 *
 * It used to carry seven slots on one line (drag handle, checkbox, pin, title,
 * copy, relations, use, menu), which left roughly 120px for the title in a
 * three-column grid and read as a pile of icons. Copy and relations were
 * duplicated: both already existed in the kebab menu.
 *
 * This test pins the composition so the row cannot silently refill.
 */
import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import type { PersonalPrompt } from "@/lib/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/SafeHtml", () => ({ SafeHtml: () => null }));
vi.mock("@/components/ui/ExportPdfButton", () => ({ ExportPdfButton: () => null }));
vi.mock("@/components/features/variables/VariableFiller", () => ({ VariableFiller: () => null }));
vi.mock("@/hooks/usePresets", () => ({ usePresets: () => ({ presets: [] }) }));

vi.mock("@/context/LibraryContext", () => ({
  useLibraryContext: () => ({
    user: { id: "u1" },
    favoritePersonalIds: new Set<string>(),
    handleToggleFavorite: vi.fn(),
    bumpPersonalLibraryLastUsed: vi.fn(),
    editingPersonalId: null,
    editingStylePromptId: null,
  }),
}));

vi.mock("@/context/LibraryUIContext", () => ({
  useStyleEditor: () => ({
    styleEditorExpanded: false,
    setStyleEditorExpanded: vi.fn(),
    styleTextareaRef: { current: null },
    applyStyleToken: vi.fn(),
    clearStyleTokens: vi.fn(),
    insertTextAtCursor: vi.fn(),
    quickInserts: [],
  }),
}));

vi.mock("@/components/features/library/use-prompt-actions", () => ({
  usePromptActions: () => ({
    pinPrompt: vi.fn(),
    movePrompt: vi.fn(),
    duplicate: vi.fn(),
    deleteWithUndo: vi.fn(),
  }),
}));

const onCopyText = vi.fn();
const onShowConnections = vi.fn();
const onUsePrompt = vi.fn();

vi.mock("../context/PersonalLibraryContext", () => ({
  usePersonalLibraryExpanded: () => ({
    expandedIds: new Set<string>(),
    toggleExpanded: vi.fn(),
    setExpandedIdsTracked: vi.fn(),
    draggingPersonalId: null,
    dragOverPersonalId: null,
    handlePersonalDragStart: vi.fn(),
    handlePersonalDragOver: vi.fn(),
    handlePersonalDrop: vi.fn(),
    handlePersonalDragEnd: vi.fn(),
  }),
  usePersonalLibrarySelection: () => ({
    selectionMode: false,
    selectedIds: new Set<string>(),
    toggleSelection: vi.fn(),
  }),
  usePersonalLibraryCardMenu: () => ({
    openMenuId: null,
    setOpenMenuId: vi.fn(),
    showMoveSubMenu: false,
    setShowMoveSubMenu: vi.fn(),
    newMoveInlineName: "",
    setNewMoveInlineName: vi.fn(),
    showNewMoveInlineInput: false,
    setShowNewMoveInlineInput: vi.fn(),
  }),
  usePersonalLibraryVersionHistory: () => ({ setVersionHistoryPrompt: vi.fn() }),
  usePersonalLibraryFolders: () => ({ allPersonalCategories: ["כללי"] }),
  usePersonalLibraryViewPrefs: () => ({ density: "comfortable" }),
  usePersonalLibraryActions: () => ({ onUsePrompt, onCopyText, onShowConnections }),
}));

import { PersonalLibraryPromptCard } from "../PersonalLibraryPromptCard";

const prompt = {
  id: "p1",
  title: "פרומפט לבדיקה",
  prompt: "גוף הפרומפט",
  personal_category: "כללי",
  use_count: 3,
  is_pinned: false,
  is_template: false,
  capability_mode: "standard",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as PersonalPrompt;

/** The collapsed row is the first element child of the card. */
function collapsedRow(container: HTMLElement): HTMLElement {
  const row = container.querySelector("[aria-expanded]");
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

describe("personal library card, collapsed row", () => {
  it("shows the primary action and the menu, and nothing else", () => {
    const { container } = render(<PersonalLibraryPromptCard prompt={prompt} />);
    const row = collapsedRow(container);

    expect(within(row).getByLabelText("השתמש בפרומפט")).toBeTruthy();
    expect(within(row).getByLabelText("פעולות נוספות")).toBeTruthy();
  });

  it("does not repeat copy or relations in the row", () => {
    const { container } = render(<PersonalLibraryPromptCard prompt={prompt} />);
    const row = collapsedRow(container);

    // Both live in the kebab menu; duplicating them here is what crowded the
    // row down to ~120px of title.
    expect(within(row).queryByLabelText("העתק פרומפט")).toBeNull();
    expect(within(row).queryByLabelText("הצג קשרים")).toBeNull();
  });

  it("keeps the primary action reachable at touch size", () => {
    const { container } = render(<PersonalLibraryPromptCard prompt={prompt} />);
    const use = within(collapsedRow(container)).getByLabelText("השתמש בפרומפט");
    expect(use.className).toContain("min-h-11");
  });
});

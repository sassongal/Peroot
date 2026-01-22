import { useState, DragEvent } from 'react';
import { PersonalPrompt } from '@/lib/types';

interface UseDragAndDropProps {
  personalLibrary: PersonalPrompt[];
  reorderPrompts: (category: string, promptIds: string[]) => Promise<void>;
  movePrompt: (promptId: string, targetCategory: string, targetIndex: number) => Promise<void>;
  renamingCategory: string | null;
  cancelRenameCategory: () => void;
  setPersonalSort: (sort: "recent" | "title" | "usage" | "custom") => void;
  PERSONAL_DEFAULT_CATEGORY: string;
}

export function useDragAndDrop({
  personalLibrary,
  reorderPrompts,
  movePrompt,
  renamingCategory,
  cancelRenameCategory,
  setPersonalSort,
  PERSONAL_DEFAULT_CATEGORY,
}: UseDragAndDropProps) {
  const [draggingPersonalId, setDraggingPersonalId] = useState<string | null>(null);
  const [draggingPersonalCategory, setDraggingPersonalCategory] = useState<string | null>(null);
  const [dragOverPersonalId, setDragOverPersonalId] = useState<string | null>(null);

  const getSortIndex = (prompt: PersonalPrompt) =>
    typeof prompt.sort_index === "number" ? prompt.sort_index : 0;

  const reorderWithinCategory = (category: string, draggedId: string, targetId?: string) => {
    const items = personalLibrary
      .filter((item) => item.personal_category === category)
      .sort((a, b) => getSortIndex(a) - getSortIndex(b));

    const dragIndex = items.findIndex((item) => item.id === draggedId);
    if (dragIndex === -1) return;

    const targetIndex = targetId ? items.findIndex((item) => item.id === targetId) : -1;
    if (targetId && targetIndex === -1) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(dragIndex, 1);
    let insertIndex = targetIndex === -1 ? nextItems.length : targetIndex;
    if (dragIndex < insertIndex) insertIndex -= 1;
    if (insertIndex < 0) insertIndex = 0;
    nextItems.splice(insertIndex, 0, moved);

    reorderPrompts(category, nextItems.map((item) => item.id));
  };

  const getCategoryOrder = (category: string) =>
    personalLibrary
      .filter((item) => item.personal_category === category)
      .sort((a, b) => getSortIndex(a) - getSortIndex(b));

  const moveToCategory = (draggedId: string, targetCategory: string, targetId?: string) => {
    const ordered = getCategoryOrder(targetCategory);
    const targetIndex = targetId
      ? ordered.findIndex((item) => item.id === targetId)
      : ordered.length;
    const normalizedIndex = targetIndex < 0 ? ordered.length : targetIndex;
    movePrompt(draggedId, targetCategory, normalizedIndex);
  };

  const handlePersonalDragStart = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    if (renamingCategory) {
      cancelRenameCategory();
    }
    setPersonalSort("custom");
    setDraggingPersonalId(prompt.id);
    setDraggingPersonalCategory(prompt.personal_category ?? PERSONAL_DEFAULT_CATEGORY);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", prompt.id);
    event.dataTransfer.setData("application/x-peroot-category", prompt.personal_category ?? PERSONAL_DEFAULT_CATEGORY);
  };

  const handlePersonalDragOver = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    event.preventDefault();
    setDragOverPersonalId(prompt.id);
  };

  const handlePersonalDrop = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingPersonalId;
    const dragCategory =
      event.dataTransfer.getData("application/x-peroot-category") || draggingPersonalCategory;

    if (!draggedId || draggedId === prompt.id) return;
    const sourceCategory = dragCategory ?? prompt.personal_category ?? PERSONAL_DEFAULT_CATEGORY;
    const targetCategory = prompt.personal_category ?? PERSONAL_DEFAULT_CATEGORY;

    if (sourceCategory === targetCategory) {
      reorderWithinCategory(targetCategory, draggedId, prompt.id);
    } else {
      moveToCategory(draggedId, targetCategory, prompt.id);
    }
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  const handlePersonalDropToEnd = (event: DragEvent<HTMLDivElement>, category: string) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingPersonalId;
    const dragCategory =
      event.dataTransfer.getData("application/x-peroot-category") || draggingPersonalCategory;
    if (!draggedId) return;
    const sourceCategory = dragCategory ?? category;
    if (sourceCategory !== category) {
      moveToCategory(draggedId, category);
    } else {
      reorderWithinCategory(category, draggedId);
    }
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  const handlePersonalDragEnd = () => {
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  return {
    draggingPersonalId,
    draggingPersonalCategory,
    dragOverPersonalId,
    handlePersonalDragStart,
    handlePersonalDragOver,
    handlePersonalDragEnd,
    handlePersonalDrop,
    handlePersonalDropToEnd
  };
}

import { PersonalPrompt, LibraryPrompt } from "@/lib/types";

// ─── Props passed from the top-level PersonalLibraryView to every child ────

export interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
}

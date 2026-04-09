"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { setPendingPrompt } from "@/lib/pending-prompt";

interface UsePromptButtonProps {
  id: string;
  title: string;
  prompt: string;
  category: string;
}

export function UsePromptButton({ id, title, prompt, category }: UsePromptButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    setPendingPrompt({
      id,
      title,
      prompt,
      category,
      is_template: false,
      source: "prompts-library",
    });
    router.push("/?ref=prompts-library");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 min-h-[44px] rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors cursor-pointer"
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      השתמש ב-Peroot
    </button>
  );
}

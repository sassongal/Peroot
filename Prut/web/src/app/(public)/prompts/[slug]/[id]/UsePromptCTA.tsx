"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setPendingPrompt } from "@/lib/pending-prompt";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  title: string;
  previewText: string;
  slug: string;
}

/**
 * Bottom-of-page CTA that stores the prompt in sessionStorage before
 * navigating, so HomeClient can pre-fill the input automatically.
 * Works for both guests (previewText only, full text loaded after login)
 * and logged-in users (same flow; UsePromptButton in PromptBodyGate
 * handles the full-text path after the prompt loads in the header).
 */
export function UsePromptCTA({ id, title, previewText, slug }: Props) {
  const router = useRouter();

  const handleClick = () => {
    setPendingPrompt({ id, title, prompt: previewText, category: slug, source: "prompts-library" });
    router.push("/?ref=library-prompt");
  };

  return (
    <Button size="lg" onClick={handleClick} className="text-sm">
      <Zap className="w-4 h-4" />
      שדרגו פרומפט זה ב-Peroot
    </Button>
  );
}

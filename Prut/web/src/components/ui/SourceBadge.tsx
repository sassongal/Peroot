"use client";

import { Globe, Puzzle, FileText, Link2, ImageIcon, Bot, Shield, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptSource } from "@/lib/prompt-entity/types";

interface SourceBadgeProps {
  source: PromptSource | string;
  className?: string;
}

const SOURCE_CONFIG: Record<string, { icon: typeof Globe; label: string }> = {
  web: { icon: Globe, label: "אתר" },
  extension: { icon: Puzzle, label: "תוסף" },
  api: { icon: Bot, label: "API" },
  cron: { icon: Bot, label: "אוטומטי" },
  admin: { icon: Shield, label: "אדמין" },
  shared: { icon: Link2, label: "שיתוף" },
  file: { icon: FileText, label: "קובץ" },
  link: { icon: Link2, label: "לינק" },
  image: { icon: ImageIcon, label: "תמונה" },
  unknown: { icon: HelpCircle, label: "לא ידוע" },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
        "text-(--text-muted) bg-(--glass-bg) border border-(--glass-border)",
        className
      )}
      title={`מקור: ${config.label}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

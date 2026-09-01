"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyText } from "@/lib/clipboard";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        if (!(await copyText(text))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-zinc-100 text-zinc-600"
      aria-label={label ?? "העתק"}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? "הועתק" : (label ?? "העתק")}</span>
    </button>
  );
}

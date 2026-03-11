"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { ChatGPTIcon, ClaudeIcon, GeminiIcon } from "@/components/ui/AIPlatformIcons";

export function SharePageClient({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt + "\n\n- נוצר עם Peroot | peroot.space");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenIn = async (url: string) => {
    await navigator.clipboard.writeText(prompt);
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 bg-white/2 border-t border-white/5 flex flex-col gap-3">
      <div className="flex items-center gap-2 justify-center">
        <button
          onClick={() => handleOpenIn("https://chat.openai.com/")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/3 hover:bg-[#10a37f]/10 hover:border-[#10a37f]/30 text-slate-300 hover:text-[#10a37f] text-xs transition-all cursor-pointer"
        >
          <ChatGPTIcon className="w-3.5 h-3.5" />
          <span>ChatGPT</span>
        </button>
        <button
          onClick={() => handleOpenIn("https://claude.ai/new")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/3 hover:bg-[#d97706]/10 hover:border-[#d97706]/30 text-slate-300 hover:text-[#d97706] text-xs transition-all cursor-pointer"
        >
          <ClaudeIcon className="w-3.5 h-3.5" />
          <span>Claude</span>
        </button>
        <button
          onClick={() => handleOpenIn("https://gemini.google.com/")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/3 hover:bg-[#4285f4]/10 hover:border-[#4285f4]/30 text-slate-300 hover:text-[#4285f4] text-xs transition-all cursor-pointer"
        >
          <GeminiIcon className="w-3.5 h-3.5" />
          <span>Gemini</span>
        </button>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 justify-center px-6 py-2.5 rounded-lg accent-gradient text-black font-medium text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer mx-auto"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "הועתק!" : "העתק פרומפט"}
      </button>
    </div>
  );
}

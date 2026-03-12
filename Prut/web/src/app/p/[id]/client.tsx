"use client";

import { Copy, Check, Share2, Link } from "lucide-react";
import { useState } from "react";
import { ChatGPTIcon, ClaudeIcon, GeminiIcon, WhatsAppIcon, TelegramIcon } from "@/components/ui/AIPlatformIcons";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SharePageClient({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt + "\n\n- נוצר עם Peroot | peroot.space");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(pageUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleOpenIn = async (url: string) => {
    await navigator.clipboard.writeText(prompt);
    window.open(url, "_blank");
  };

  const whatsappMessage = encodeURIComponent("בדוק את הפרומפט הזה: " + pageUrl);
  const twitterMessage = encodeURIComponent("בדוק את הפרומפט הזה שנוצר עם Peroot");
  const telegramText = encodeURIComponent(prompt.slice(0, 200) + (prompt.length > 200 ? '...' : '') + "\n\n- נוצר עם Peroot | peroot.space");

  return (
    <div className="p-4 bg-white/2 border-t border-white/5 flex flex-col gap-4">
      {/* AI Platform buttons */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-xs text-slate-500 ms-1">פתח ב:</span>
        <button
          onClick={() => handleOpenIn("https://chat.openai.com/")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-[#10a37f]/10 hover:border-[#10a37f]/30 text-slate-300 hover:text-[#10a37f] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <ChatGPTIcon className="w-3.5 h-3.5" />
          <span>ChatGPT</span>
        </button>
        <button
          onClick={() => handleOpenIn("https://claude.ai/new")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-[#d97706]/10 hover:border-[#d97706]/30 text-slate-300 hover:text-[#d97706] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <ClaudeIcon className="w-3.5 h-3.5" />
          <span>Claude</span>
        </button>
        <button
          onClick={() => handleOpenIn("https://gemini.google.com/")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-[#4285f4]/10 hover:border-[#4285f4]/30 text-slate-300 hover:text-[#4285f4] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <GeminiIcon className="w-3.5 h-3.5" />
          <span>Gemini</span>
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-xs text-slate-500 ms-1">שתף:</span>

        {/* WhatsApp - shares page URL with Hebrew intro */}
        <button
          onClick={() => window.open(`https://wa.me/?text=${whatsappMessage}`, "_blank")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-[#25d366]/10 hover:border-[#25d366]/30 text-slate-300 hover:text-[#25d366] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>

        {/* Twitter/X */}
        <button
          onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${twitterMessage}`, "_blank")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <XIcon className="w-3.5 h-3.5" />
          <span>Twitter / X</span>
        </button>

        {/* Telegram */}
        <button
          onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${telegramText}`, "_blank")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-[#0088cc]/10 hover:border-[#0088cc]/30 text-slate-300 hover:text-[#0088cc] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <TelegramIcon className="w-3.5 h-3.5" />
          <span>Telegram</span>
        </button>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-300 hover:text-amber-400 text-xs transition-all cursor-pointer min-h-[44px]"
        >
          {linkCopied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Link className="w-3.5 h-3.5" />}
          <span>{linkCopied ? "הקישור הועתק!" : "העתק קישור"}</span>
        </button>

        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={() => navigator.share({ title: 'פרומפט מ-Peroot', text: prompt.slice(0, 200), url: pageUrl })}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 hover:bg-white/10 text-slate-300 text-xs transition-all cursor-pointer min-h-[44px]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>עוד...</span>
          </button>
        )}
      </div>

      {/* Copy prompt button */}
      <button
        onClick={handleCopyPrompt}
        className="flex items-center gap-2 justify-center px-6 py-2.5 rounded-lg accent-gradient text-black font-medium text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer mx-auto min-h-[44px]"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "הועתק!" : "העתק פרומפט"}
      </button>
    </div>
  );
}

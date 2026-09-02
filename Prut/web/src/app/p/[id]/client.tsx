"use client";

import { Copy, Check, Share2, Link } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { SendToModelBar } from "@/components/features/prompt-improver/SendToModelBar";
import {
  ChatGPTIcon,
  ClaudeIcon,
  GeminiIcon,
  WhatsAppIcon,
  TelegramIcon,
} from "@/components/ui/AIPlatformIcons";

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
  // Lazy initializers - no cascading setState on mount. SSR gets empty
  // string / false, client rehydrates synchronously on first render.
  const [pageUrl] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.href : "",
  );
  const [canShare] = useState<boolean>(() => typeof window !== "undefined" && !!navigator?.share);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt + "\n\n- נוצר עם Peroot | www.peroot.space");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("ההעתקה נכשלה. סמנו את הטקסט והעתיקו ידנית.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("העתקת הקישור נכשלה.");
    }
  };

  const handleOpenIn = async (url: string) => {
    // Best-effort copy, but ALWAYS open the LLM tab - a clipboard rejection must
    // not block the primary action of the public share page.
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      /* clipboard blocked - still open the tab below */
    }
    window.open(url, "_blank");
  };

  const whatsappMessage = useMemo(
    () => encodeURIComponent("בדוק את הפרומפט הזה: " + pageUrl),
    [pageUrl],
  );
  const twitterMessage = encodeURIComponent("בדוק את הפרומפט הזה שנוצר עם Peroot");
  const telegramText = useMemo(
    () =>
      encodeURIComponent(
        prompt.slice(0, 200) +
          (prompt.length > 200 ? "..." : "") +
          "\n\n- נוצר עם Peroot | www.peroot.space",
      ),
    [prompt],
  );

  return (
    <div className="p-4 bg-(--glass-bg) border-t border-(--glass-border) flex flex-col gap-4">
      {/* שגר למודל — prefilled handoff, the same component the app uses */}
      <SendToModelBar prompt={prompt} from="share_page" className="items-center" />

      {/* Share buttons */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-xs text-(--text-muted) ms-1">שתף:</span>

        {/* WhatsApp - shares page URL with Hebrew intro */}
        <button
          onClick={() => window.open(`https://wa.me/?text=${whatsappMessage}`, "_blank")}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-(--glass-border) bg-(--glass-bg) hover:bg-[#25d366]/10 hover:border-[#25d366]/30 text-(--text-secondary) hover:text-[#25d366] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>

        {/* Twitter/X */}
        <button
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${twitterMessage}`,
              "_blank",
            )
          }
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-(--glass-border) bg-(--glass-bg) hover:bg-(--glass-bg) hover:border-(--glass-border) text-(--text-secondary) hover:text-(--text-primary) text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <XIcon className="w-3.5 h-3.5" />
          <span>Twitter / X</span>
        </button>

        {/* Telegram */}
        <button
          onClick={() =>
            window.open(
              `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${telegramText}`,
              "_blank",
            )
          }
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-(--glass-border) bg-(--glass-bg) hover:bg-[#0088cc]/10 hover:border-[#0088cc]/30 text-(--text-secondary) hover:text-[#0088cc] text-xs transition-all cursor-pointer min-h-[44px]"
        >
          <TelegramIcon className="w-3.5 h-3.5" />
          <span>Telegram</span>
        </button>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-(--glass-border) bg-(--glass-bg) hover:bg-amber-500/10 hover:border-amber-500/30 text-(--text-secondary) hover:text-amber-400 text-xs transition-all cursor-pointer min-h-[44px]"
        >
          {linkCopied ? (
            <Check className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Link className="w-3.5 h-3.5" />
          )}
          <span>{linkCopied ? "הקישור הועתק!" : "העתק קישור"}</span>
        </button>

        {canShare && (
          <button
            onClick={() =>
              navigator.share({
                title: "פרומפט מ-Peroot",
                text: prompt.slice(0, 200),
                url: pageUrl,
              })
            }
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-(--glass-border) bg-(--glass-bg) hover:bg-(--glass-bg) text-(--text-secondary) text-xs transition-all cursor-pointer min-h-[44px]"
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

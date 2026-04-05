"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Gift, Check, Copy, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Floating share CTA popup shown after a successful enhancement.
 * Only shows to authenticated users, and at most 1 in 3 enhancements
 * (tracked via sessionStorage counter).
 * Renders as a fixed-position popup at the bottom-start corner.
 */
export function ReferralShareCTA({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Increment the enhancement counter
    const key = "peroot_enhance_count";
    const count = parseInt(sessionStorage.getItem(key) || "0", 10) + 1;
    sessionStorage.setItem(key, String(count));

    // Show on 1st enhance (most exciting moment), then 5th, 10th, 15th, etc.
    const shouldShow = count === 1 || (count >= 5 && count % 5 === 0);
    if (shouldShow) {
      // Delay appearance slightly so it doesn't distract from the result
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Cleanup copied timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleCopyLink = useCallback(async () => {
    try {
      let link = referralLink;
      if (!link) {
        const res = await fetch("/api/referral");
        if (!res.ok) return;
        const data = await res.json();
        const siteUrl = window.location.origin;
        link = `${siteUrl}/?ref=${data.code}`;
        setReferralLink(link);
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("קישור ההזמנה הועתק!");
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("שגיאה בהעתקת הקישור");
    }
  }, [referralLink]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[72px] md:bottom-6 start-6 z-50 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500"
      dir="rtl"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900/95 backdrop-blur-sm border border-amber-500/20 shadow-xl shadow-black/30">
        <Gift className="w-5 h-5 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-300/90 font-medium">אהבת? שתף עם חברים</p>
          <p className="text-[11px] text-slate-500">קבל קרדיטים בונוס על כל חבר שנרשם</p>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "הועתק!" : "העתק"}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

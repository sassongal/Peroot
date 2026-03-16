"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Subtle share CTA shown after a successful enhancement.
 * Only shows to authenticated users, and at most 1 in 3 enhancements
 * (tracked via sessionStorage counter).
 */
export function ReferralShareCTA({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Increment the enhancement counter
    const key = "peroot_enhance_count";
    const count = parseInt(sessionStorage.getItem(key) || "0", 10) + 1;
    sessionStorage.setItem(key, String(count));

    // Show every 3rd enhancement (1st, 4th, 7th, etc.)
    if (count % 3 === 1) {
      setVisible(true);
    }
  }, [isAuthenticated]);

  const handleCopyLink = useCallback(async () => {
    try {
      // Fetch referral code if not yet loaded
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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("שגיאה בהעתקת הקישור");
    }
  }, [referralLink]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 animate-in fade-in slide-in-from-bottom-2 duration-500"
      dir="rtl"
    >
      <div className="flex items-center gap-2 text-sm text-amber-300/80">
        <Gift className="w-4 h-4 shrink-0 text-amber-400" />
        <span>אהבת? שתף עם חברים וקבל קרדיטים בונוס</span>
      </div>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "הועתק!" : "העתק קישור"}
      </button>
    </div>
  );
}

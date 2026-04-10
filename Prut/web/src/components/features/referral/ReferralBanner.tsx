"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Check, Copy, X } from "lucide-react";
import { toast } from "sonner";

const DISMISSED_KEY = "peroot_referral_banner_dismissed";

/**
 * One-time dismissible referral banner shown after a user's first signup.
 * Stored in localStorage so it doesn't reappear after dismissal.
 */
export function ReferralBanner({ isNewUser }: { isNewUser: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isNewUser) return;
    // Don't show if previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;
    queueMicrotask(() => setVisible(true));
  }, [isNewUser]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  }, []);

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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("שגיאה בהעתקת הקישור");
    }
  }, [referralLink]);

  if (!visible) return null;

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 animate-in fade-in slide-in-from-top-4 duration-500"
      dir="rtl"
    >
      <Gift className="w-5 h-5 shrink-0 text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">
          הזמן חברים וקבל 5 קרדיטים על כל חבר שנרשם!
        </p>
      </div>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "הועתק!" : "העתק קישור הזמנה"}
      </button>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
        aria-label="סגור"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

"use client";

import { Check, Copy, Gift, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export interface ReferralInfo {
  code: string;
  uses: number;
  maxUses: number;
  creditsPerReferral: number;
  totalReferrals: number;
}

interface SettingsReferralSectionProps {
  referral: ReferralInfo | null;
  referralLoaded: boolean;
  referralCopied: boolean;
  onReferralCopied: (v: boolean) => void;
  redeemCode: string;
  setRedeemCode: (v: string) => void;
  isRedeeming: boolean;
  setIsRedeeming: (v: boolean) => void;
}

export function SettingsReferralSection({
  referral,
  referralLoaded,
  referralCopied,
  onReferralCopied,
  redeemCode,
  setRedeemCode,
  isRedeeming,
  setIsRedeeming,
}: SettingsReferralSectionProps) {
  return (
    <section className="space-y-6 animate-in fade-in duration-300" aria-labelledby="settings-referral-heading">
      <header className="space-y-1">
        <h2 id="settings-referral-heading" className="text-xl font-bold">
          הזמן חברים
        </h2>
        <p className="text-sm text-slate-500">שתף את הקוד שלך וקבלו שניכם 5 קרדיטים בונוס</p>
      </header>

      <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
        <h3 className="font-semibold text-amber-400 flex items-center gap-2">
          <Gift className="w-4 h-4" />
          איך זה עובד?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span className="text-slate-300">שתף את הקוד שלך עם חבר</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span className="text-slate-300">החבר נרשם ומזין את הקוד</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span className="text-slate-300">שניכם מקבלים 5 קרדיטים!</span>
          </div>
        </div>
      </div>

      {referral ? (
        <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            הקוד שלך
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 bg-black/30 rounded-lg border border-white/10 font-mono text-lg text-amber-300 text-center tracking-wider">
              {referral.code}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(referral.code);
                onReferralCopied(true);
                setTimeout(() => onReferralCopied(false), 2000);
                toast.success("הועתק ללוח");
              }}
              className="shrink-0 p-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
            >
              {referralCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {referral.uses} / {referral.maxUses} הזמנות נוצלו
            </span>
            <span>{referral.uses * referral.creditsPerReferral} קרדיטים הורווחו</span>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`הצטרף ל-Peroot - מחולל פרומפטים בעברית! השתמש בקוד ${referral.code} וקבל 5 קרדיטים בונוס: https://www.peroot.space`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm font-medium transition-colors border border-green-600/20"
            >
              שתף בוואטסאפ
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `הצטרף ל-Peroot! השתמש בקוד ${referral.code} וקבל 5 קרדיטים בונוס: https://www.peroot.space`
                );
                toast.success("הועתק ללוח");
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-white/10"
            >
              <Copy className="w-3.5 h-3.5" />
              העתק הודעה
            </button>
          </div>
        </div>
      ) : referralLoaded ? (
        <div className="p-5 bg-white/5 rounded-xl border border-white/10 text-center text-slate-400 text-sm">
          מערכת ההפניות תהיה זמינה בקרוב
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      )}

      <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-3">
        <h3 className="font-semibold text-white text-sm">קיבלת קוד מחבר?</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="הזן קוד הפניה"
            dir="ltr"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={async () => {
              if (!redeemCode.trim()) return;
              setIsRedeeming(true);
              try {
                const res = await fetch("/api/referral", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: redeemCode.trim() }),
                });
                const data = await res.json();
                if (res.ok && data.success) {
                  toast.success(`קיבלת ${data.creditsAwarded} קרדיטים!`);
                  setRedeemCode("");
                } else {
                  toast.error(data.error || "שגיאה במימוש הקוד");
                }
              } catch {
                toast.error("שגיאה במימוש הקוד");
              } finally {
                setIsRedeeming(false);
              }
            }}
            disabled={isRedeeming || !redeemCode.trim()}
            className="shrink-0 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-lg text-sm transition-colors disabled:opacity-50 border border-amber-500/30"
          >
            {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "מימוש"}
          </button>
        </div>
      </div>
    </section>
  );
}

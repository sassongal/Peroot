"use client";

import { Check, Copy, Gift, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { creditsPhrase } from "@/lib/quota-policy";
import { cn } from "@/lib/utils";
import { formatDateHe } from "@/lib/dates/format";

/** "יום אחד" / "יומיים" / "שבוע" / "N ימים": the number never appears as a bare digit in copy. */
function daysPhrase(n: number): string {
  if (n === 1) return "יום אחד";
  if (n === 2) return "יומיים";
  if (n === 7) return "שבוע";
  if (n === 14) return "שבועיים";
  return `${n} ימים`;
}

const SITE_URL = "https://www.peroot.space";

/**
 * The share message carries the full deep link, not the bare code.
 *
 * It used to send the code and the homepage separately, so the recipient had
 * to notice a code, sign up, find Settings and paste it. `?ref=` is captured by
 * the proxy into a cookie and redeemed automatically at signup, so the link
 * does all of that by itself. Every abandoned step was a referral lost.
 */
type ShareLanguage = "hebrew" | "english" | "arabic" | "russian";

/**
 * The invitation follows the inviter's own output language (spec C.10): a
 * Russian writer forwards a Russian line, and the link also presets that
 * language for the friend (`?lang=`), so the first enhancement is already
 * in the language they share.
 */
export function shareMessage(code: string, language: ShareLanguage = "hebrew"): string {
  const link =
    language === "hebrew"
      ? `${SITE_URL}/?ref=${code}`
      : `${SITE_URL}/?ref=${code}&lang=${language === "english" ? "en" : language === "arabic" ? "ar" : "ru"}`;
  switch (language) {
    case "english":
      return `Join me on Peroot, the AI prompt generator from Israel: ${link}`;
    case "arabic":
      return `انضم إليّ في Peroot، مولّد البرومبتات بالذكاء الاصطناعي من إسرائيل: ${link}`;
    case "russian":
      return `Присоединяйтесь ко мне в Peroot, генераторе промптов с ИИ из Израиля: ${link}`;
    default:
      return `הצטרף לפירוט, מחולל הפרומפטים בעברית: ${link}`;
  }
}

interface ReferralInfo {
  code: string;
  uses: number;
  maxUses: number;
  totalReferrals: number;
  /** Referred users who have made at least one enhancement. */
  activeReferrals: number;
  bonusPerReferral: number;
  bonusDays: number;
  grantOn: "activation" | "signup";
  /** The caller's own bonus bucket (0 when expired). */
  bonusCredits: number;
  bonusExpiresAt: string | null;
}

interface SettingsReferralSectionProps {
  referral: ReferralInfo | null;
  /** The inviter's preferred output language; the invitation is written in it. */
  language?: ShareLanguage;
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
  language = "hebrew",
  referralLoaded,
  referralCopied,
  onReferralCopied,
  redeemCode,
  setRedeemCode,
  isRedeeming,
  setIsRedeeming,
}: SettingsReferralSectionProps) {
  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-referral-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-referral-heading" className="text-xl font-bold">
          הזמנת חברים
        </h2>
        <p className="text-sm text-(--text-muted)">
          {referral
            ? `כל חבר שמצטרף ${referral.grantOn === "activation" ? "ומשפר פרומפט ראשון" : ""} מזכה אותך ב${creditsPhrase(referral.bonusPerReferral)} לשימוש תוך ${daysPhrase(referral.bonusDays)}`
            : "שתף את הקישור שלך והבא חברים לפירוט"}
        </p>
      </header>

      <div className="p-5 bg-(--glass-bg) border border-(--glass-border) rounded-2xl space-y-3">
        <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" aria-hidden="true" />
          איך זה עובד
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
              1
            </span>
            <span className="text-(--text-secondary)">שתף את הקישור שלך עם חבר</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <span className="text-(--text-secondary)">החבר נכנס דרך הקישור ונרשם</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <span className="text-(--text-secondary)">
              {referral
                ? `${referral.grantOn === "activation" ? "אחרי השיפור הראשון שלו" : "ברגע ההרשמה"} מגיעים אליך ${creditsPhrase(referral.bonusPerReferral)} בונוס`
                : "ההצטרפות נרשמת על שמך"}
            </span>
          </div>
        </div>
      </div>

      {referral ? (
        <div className="p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-4">
          <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" aria-hidden="true" />
            הקוד שלכם
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 px-4 min-h-[48px] flex items-center justify-center bg-(--surface-panel) rounded-xl border border-(--glass-border) font-mono text-lg text-(--text-primary) tracking-wider select-all"
              dir="ltr"
            >
              {referral.code}
            </div>
            <button
              type="button"
              onClick={() => {
                void copyText(referral.code).then((ok) => {
                  if (!ok) {
                    toast.error("ההעתקה נחסמה, סמנו והעתיקו ידנית");
                    return;
                  }
                  onReferralCopied(true);
                  setTimeout(() => onReferralCopied(false), 2000);
                  toast.success("הועתק ללוח");
                });
              }}
              className="cursor-pointer shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-500/30 transition-colors"
              aria-label={referralCopied ? "הקוד הועתק" : "העתק קוד"}
            >
              {referralCopied ? (
                <Check className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Copy className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-(--text-muted)">
            <span>
              <span className="font-mono">{referral.uses}</span> מתוך{" "}
              <span className="font-mono">{referral.maxUses}</span> הזמנות נוצלו
            </span>
            <span>
              <span className="font-mono">{referral.totalReferrals}</span> הצטרפו,{" "}
              <span className="font-mono">{referral.activeReferrals}</span> כבר פעילים
            </span>
          </div>
          {referral.bonusCredits > 0 && referral.bonusExpiresAt && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <Gift className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                יש לך {creditsPhrase(referral.bonusCredits)} בונוס לשימוש עד{" "}
                {formatDateHe(referral.bonusExpiresAt)}. הם נשרפים אחרי המכסה היומית.
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage(referral.code, language))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-bold transition-colors"
            >
              שיתוף בוואטסאפ
            </a>
            <button
              type="button"
              onClick={() => {
                void copyText(shareMessage(referral.code, language)).then((ok) => {
                  if (!ok) {
                    toast.error("ההעתקה נחסמה, סמנו והעתיקו ידנית");
                    return;
                  }
                  toast.success("הועתק ללוח");
                });
              }}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 bg-(--surface-panel) hover:border-amber-500/40 text-(--text-primary) rounded-xl text-sm font-medium transition-colors border border-(--glass-border)"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              העתקת ההודעה
            </button>
          </div>
        </div>
      ) : referralLoaded ? (
        <div className="p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) text-center text-(--text-muted) text-sm">
          לא הצלחנו לטעון את קוד ההזמנה. רעננו את הדף ונסו שוב.
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      )}

      <div className="p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) text-sm">קיבלתם קוד מחבר?</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="קוד ההזמנה"
            aria-label="קוד הזמנה"
            dir="ltr"
            autoComplete="off"
            className="flex-1 min-w-0 bg-(--surface-panel) border border-(--glass-border) rounded-xl px-3 min-h-[44px] text-(--text-primary) font-mono text-sm placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-colors"
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
                  toast.success(`קיבלתם ${creditsPhrase(Number(data.creditsAwarded) || 0)}`);
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
            className={cn(
              "cursor-pointer shrink-0 px-4 min-h-[44px] font-medium rounded-xl text-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/30",
            )}
          >
            {isRedeeming ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              "מימוש"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

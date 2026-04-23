"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Mail,
  Send,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  X,
  Eye,
  Clock,
  Layers,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment = "all" | "pro" | "free" | "inactive";

interface Campaign {
  id: string;
  user_id: string;
  action: string;
  details: {
    subject?: string;
    segment?: string;
    sent_count?: number;
    failed_count?: number;
    total_recipients?: number;
    timestamp?: string;
  } | null;
  created_at: string;
}

interface SegmentCounts {
  all: number;
  pro: number;
  free: number;
  inactive: number;
}

interface Summary {
  totalEmailsSent: number;
  campaignsThisMonth: number;
}

interface CampaignsData {
  campaigns: Campaign[];
  segmentCounts: SegmentCounts;
  summary: Summary;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  totalRecipients: number;
  message?: string;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEGMENT_OPTIONS: { value: Segment; label: string; he: string }[] = [
  { value: "all", label: "All Users", he: "כל המשתמשים" },
  { value: "pro", label: "Pro", he: "מנויי Pro" },
  { value: "free", label: "Free", he: "משתמשים חינמיים" },
  { value: "inactive", label: "Inactive (30d+)", he: "לא פעילים 30+ ימים" },
];

function fmtCount(n: number) {
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const colorMap = {
  blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
};

type ColorKey = keyof typeof colorMap;

function SummaryCard({
  label,
  sublabel,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  sublabel: string;
  value: string;
  icon: React.ElementType;
  color: ColorKey;
  loading: boolean;
}) {
  return (
    <div className="group p-8 rounded-[40px] bg-zinc-950 border border-white/5 flex flex-col gap-5 transition-all duration-700 hover:border-white/10 hover:shadow-2xl">
      <div className={cn("p-4 rounded-2xl border w-fit shadow-2xl", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        {loading ? (
          <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <div className="text-4xl font-black text-white tracking-tighter leading-none tabular-nums transition-transform duration-700 group-hover:scale-110 group-hover:-translate-x-1 origin-right">
            {value}
          </div>
        )}
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{label}</div>
        <div className="text-[9px] text-zinc-800 font-bold">{sublabel}</div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  color,
  title,
  sub,
}: {
  icon: React.ElementType;
  color: ColorKey;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-xl border", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{sub}</p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">{label}</span>
      <span className={cn("text-sm font-black truncate max-w-[280px]", highlight ? "text-blue-400" : "text-zinc-300")}>
        {value}
      </span>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function EmailCampaignsTab() {
  const [data, setData] = useState<CampaignsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [showPreview, setShowPreview] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/email-campaigns"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CampaignsData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Email Campaigns Tab] fetch error:", err);
      setFetchError("שגיאה בטעינת הקמפיינים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleSend() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(getApiPath("/api/admin/email-campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, htmlContent, segment }),
      });
      const json: SendResult = await res.json();
      setSendResult(json);
      if (json.success) {
        fetchCampaigns();
      }
    } catch (err) {
      logger.error("[Email Campaigns Tab] send error:", err);
      setSendResult({ success: false, sent: 0, failed: 0, totalRecipients: 0, error: "שגיאת רשת" });
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  }

  const selectedSegmentInfo = SEGMENT_OPTIONS.find((s) => s.value === segment)!;
  const recipientCount = data?.segmentCounts?.[segment] ?? 0;
  const canSend = subject.trim().length > 0 && htmlContent.trim().length > 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Mail className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Email Campaign Engine</span>
          </div>
          <h2 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Email Campaigns
          </h2>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            שליחת קמפיינים ממוקדים למשתמשים לפי סגמנט. מנוהל דרך Resend.
          </p>
        </div>
        <button
          onClick={fetchCampaigns}
          disabled={loading}
          className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Fetch Error */}
      {fetchError && (
        <div className="flex items-center gap-4 p-6 rounded-[28px] bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-rose-400 font-bold text-sm">{fetchError}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-2">
        <SummaryCard
          label="Total Emails Sent"
          sublabel="סה״כ מיילים שנשלחו"
          value={data ? fmtCount(data.summary.totalEmailsSent) : "-"}
          icon={Send}
          color="blue"
          loading={loading}
        />
        <SummaryCard
          label="Campaigns This Month"
          sublabel="קמפיינים החודש"
          value={data ? fmtCount(data.summary.campaignsThisMonth) : "-"}
          icon={Mail}
          color="purple"
          loading={loading}
        />
        <SummaryCard
          label="Active Segments"
          sublabel="סגמנטים זמינים"
          value={String(SEGMENT_OPTIONS.length)}
          icon={Layers}
          color="emerald"
          loading={false}
        />
      </div>

      {/* Segment Stats */}
      <div className="px-2 space-y-4">
        <SectionTitle icon={Users} color="emerald" title="Segment Overview" sub="סטטיסטיקות לפי סגמנט" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SEGMENT_OPTIONS.map((seg) => {
            const count = data?.segmentCounts?.[seg.value] ?? 0;
            const isSelected = segment === seg.value;
            return (
              <button
                key={seg.value}
                onClick={() => setSegment(seg.value)}
                className={cn(
                  "p-6 rounded-[28px] border text-right transition-all duration-300 active:scale-95",
                  isSelected
                    ? "bg-blue-600 border-blue-500 shadow-2xl shadow-blue-600/20"
                    : "bg-zinc-950/60 border-white/5 hover:border-white/10"
                )}
              >
                <div className={cn("text-2xl font-black tabular-nums", isSelected ? "text-white" : "text-zinc-300")}>
                  {loading ? <div className="h-7 w-12 rounded-lg bg-white/10 animate-pulse" /> : fmtCount(count)}
                </div>
                <div className={cn("text-[10px] font-black uppercase tracking-widest mt-1", isSelected ? "text-blue-200" : "text-zinc-600")}>
                  {seg.label}
                </div>
                <div className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-blue-300" : "text-zinc-800")}>
                  {seg.he}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign Composer */}
      <div className="px-2 space-y-4">
        <SectionTitle icon={Mail} color="blue" title="Campaign Composer" sub="כתיבה ושליחת קמפיין חדש" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Composer panel */}
          <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-8 space-y-6 shadow-2xl">
            {/* Subject */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="כותרת המייל..."
                maxLength={200}
                className="w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-5 py-3.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            {/* Segment selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">Target Segment</label>
              <div className="relative">
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as Segment)}
                  className="w-full appearance-none bg-zinc-900 border border-white/5 text-white rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:border-blue-500/40 transition-colors cursor-pointer pr-10"
                >
                  {SEGMENT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label} - {s.he}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
              </div>
              <div className="text-[9px] font-bold text-zinc-700">
                {loading ? "טוען נמענים..." : `${fmtCount(recipientCount)} נמענים בסגמנט זה`}
              </div>
            </div>

            {/* HTML Content */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">Email Content (HTML)</label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder={"<h1>שלום!</h1>\n<p>תוכן המייל כאן...</p>"}
                rows={12}
                className="w-full bg-zinc-900 border border-white/5 text-zinc-300 rounded-2xl px-5 py-4 text-sm font-mono placeholder:text-zinc-800 focus:outline-none focus:border-blue-500/40 transition-colors resize-none leading-relaxed"
                dir="ltr"
              />
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                onClick={() => setShowPreview((v) => !v)}
                disabled={htmlContent.trim().length === 0}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30",
                  showPreview
                    ? "bg-white/10 border border-white/10 text-white"
                    : "bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white"
                )}
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "הסתר תצוגה מקדימה" : "תצוגה מקדימה"}
              </button>

              <button
                onClick={() => { setSendResult(null); setShowConfirm(true); }}
                disabled={!canSend || sending}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-40 shadow-2xl shadow-blue-600/20"
              >
                <Send className="w-4 h-4" />
                שלח קמפיין
              </button>
            </div>

            {/* Send result feedback */}
            {sendResult && (
              <div
                className={cn(
                  "flex items-start gap-3 p-5 rounded-2xl border text-sm font-bold",
                  sendResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}
              >
                {sendResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  {sendResult.success ? (
                    <>
                      <p>נשלח בהצלחה ל-{fmtCount(sendResult.sent)} נמענים</p>
                      {sendResult.failed > 0 && (
                        <p className="text-amber-400 text-[10px] font-bold">{sendResult.failed} שליחות נכשלו</p>
                      )}
                      {sendResult.message && (
                        <p className="text-[10px] font-bold opacity-70">{sendResult.message}</p>
                      )}
                    </>
                  ) : (
                    <p>{sendResult.error || "שגיאה בשליחת הקמפיין"}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-zinc-600" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Email Preview</span>
              </div>
              {subject && (
                <span className="text-xs font-bold text-zinc-500 truncate max-w-[200px]">{subject}</span>
              )}
            </div>

            {showPreview && htmlContent.trim().length > 0 ? (
              <div className="flex-1 p-4">
                <div className="rounded-2xl bg-white overflow-auto h-full min-h-[400px]">
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#111;}</style></head><body>${htmlContent}</body></html>`}
                    className="w-full h-full min-h-[400px] border-0"
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
                <div className="p-5 rounded-full bg-zinc-900 border border-white/5">
                  <Mail className="w-8 h-8 text-zinc-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-700 font-black text-sm uppercase tracking-wider">
                    {htmlContent.trim().length === 0 ? "כתוב תוכן לקמפיין" : "לחץ תצוגה מקדימה"}
                  </p>
                  <p className="text-zinc-800 font-bold text-[10px]">
                    {htmlContent.trim().length === 0 ? "התצוגה תופיע כאן" : "Preview is hidden"}
                  </p>
                </div>
              </div>
            )}

            {/* Recipient info footer */}
            <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-700" />
                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-wider">{selectedSegmentInfo.label}</span>
              </div>
              <span className="text-[9px] font-black text-zinc-600 tabular-nums">
                {loading ? "..." : fmtCount(recipientCount)} נמענים
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="px-2 space-y-4">
        <SectionTitle icon={Clock} color="purple" title="Recent Campaigns" sub="קמפיינים שנשלחו לאחרונה" />

        <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-10 h-10 animate-spin text-purple-500/20" />
            </div>
          ) : (data?.campaigns ?? []).length === 0 ? (
            <div className="py-24 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]">
              No campaigns sent yet
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5">
                {["נושא", "סגמנט", "נשלח", "נכשל", "תאריך"].map((h) => (
                  <div
                    key={h}
                    className={cn(
                      "text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]",
                      h === "נושא" ? "col-span-4" : h === "תאריך" ? "col-span-3" : "col-span-2 text-center"
                    )}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {(data?.campaigns ?? []).map((c) => {
                const d = c.details ?? {};
                const subjectText = d.subject ?? "-";
                const seg = d.segment ?? "-";
                const sent = d.sent_count ?? 0;
                const failed = d.failed_count ?? 0;
                const segInfo = SEGMENT_OPTIONS.find((s) => s.value === seg);

                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-white/2 transition-all duration-300 group"
                  >
                    <div className="col-span-4 font-bold text-zinc-300 text-sm truncate">{subjectText}</div>
                    <div className="col-span-2 flex justify-center">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                        {segInfo?.label ?? seg}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-emerald-400 font-black text-sm tabular-nums">{fmtCount(sent)}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={cn("font-black text-sm tabular-nums", failed > 0 ? "text-rose-400" : "text-zinc-700")}>
                        {failed > 0 ? fmtCount(failed) : "-"}
                      </span>
                    </div>
                    <div className="col-span-2 text-zinc-600 font-bold text-[10px] text-left">{fmtDate(c.created_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Global Email Logs ── */}
      <GlobalEmailLogs />

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !sending && setShowConfirm(false)}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-[36px] bg-zinc-950 border border-white/10 p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300"
            dir="rtl"
          >
            {!sending && (
              <button
                onClick={() => setShowConfirm(false)}
                className="absolute top-6 left-6 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex justify-center">
              <div className="p-5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Send className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">אישור שליחת קמפיין</h2>
              <p className="text-zinc-500 font-medium text-sm">אתה עומד לשלוח מייל לסגמנט מוגדר. פעולה זו אינה הפיכה.</p>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-white/5 p-5 space-y-3">
              <DetailRow label="נושא" value={subject} />
              <DetailRow label="סגמנט" value={selectedSegmentInfo.label} />
              <DetailRow label="נמענים משוערים" value={fmtCount(recipientCount)} highlight />
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-400 font-bold text-xs">
                הודעה זו תישלח לכל {fmtCount(recipientCount)} המשתמשים בסגמנט &quot;{selectedSegmentInfo.he}&quot;.
                ודא שהתוכן נכון לפני האישור.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="px-6 py-3 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all disabled:opacity-40"
              >
                ביטול
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-60 shadow-2xl shadow-blue-600/20"
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />שולח...</>
                ) : (
                  <><Send className="w-4 h-4" />אשר ושלח</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Global Email Logs Sub-Component ──────────────────────────────────────────

interface EmailLog {
  id: string;
  user_id: string | null;
  email_to: string;
  source: string;
  email_type: string;
  subject: string | null;
  status: string;
  created_at: string;
}

function GlobalEmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search.trim()) params.set("search", search.trim());
      if (sourceFilter) params.set("source", sourceFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(getApiPath(`/api/admin/email-logs?${params}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      if (data.filters) {
        setSources(data.filters.sources ?? []);
        setTypes(data.filters.types ?? []);
      }
    } catch (err) {
      logger.error("[GlobalEmailLogs] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceFilter, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusColor = (s: string) => {
    if (s === "sent" || s === "delivered") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (s === "failed" || s === "bounced") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">לוג אימיילים</h3>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{total} emails total</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 rounded-xl bg-white/3 border border-white/5 text-zinc-600 hover:text-white transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="חפש לפי אימייל..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-sm text-white placeholder:text-zinc-700 focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500/30"
        />
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-sm text-zinc-400"
        >
          <option value="">כל המקורות</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-sm text-zinc-400"
        >
          <option value="">כל הסוגים</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-[32px] border border-white/5 bg-zinc-950/80 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500/20" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
            No emails found
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/2 transition-all text-sm">
                <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0", statusColor(log.status))}>
                  {log.status}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-300 truncate">{log.email_to}</span>
                    <span className="text-[9px] text-zinc-700 font-mono shrink-0">{log.source}</span>
                  </div>
                  {log.subject && (
                    <p className="text-xs text-zinc-600 truncate mt-0.5">{log.subject}</p>
                  )}
                </div>
                <span className="text-[9px] text-zinc-600 font-mono shrink-0">{log.email_type}</span>
                <span className="text-[9px] text-zinc-700 font-bold shrink-0 whitespace-nowrap">{fmtTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-white/3 border border-white/5 text-zinc-500 text-xs font-bold disabled:opacity-30 hover:text-white transition-all"
          >
            הקודם
          </button>
          <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl bg-white/3 border border-white/5 text-zinc-500 text-xs font-bold disabled:opacity-30 hover:text-white transition-all"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

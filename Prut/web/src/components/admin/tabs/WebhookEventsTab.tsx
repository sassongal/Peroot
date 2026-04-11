"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface WebhookEvent {
  id: string;
  event_name: string;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

interface WebhookEventsResponse {
  events: WebhookEvent[];
  limit: number;
  status: string;
}

type StatusFilter = "all" | "processed" | "failed";

/**
 * Admin tab for browsing webhook_events. Closes the visibility gap that
 * made failed LemonSqueezy webhooks invisible. See plan T4 — Admin Reality.
 */
export default function WebhookEventsTab() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${getApiPath("/api/admin/webhooks")}?status=${statusFilter}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch webhook events");
      const json: WebhookEventsResponse = await res.json();
      setEvents(json.events);
    } catch (err) {
      logger.error("[WebhookEventsTab]", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const failedCount = events.filter(e => !e.processed || e.processing_error).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary)">Webhook Events</h2>
          <p className="text-sm text-(--text-muted) mt-1">
            מעקב אחר אירועי webhook נכנסים מ-LemonSqueezy ושירותי תשלום אחרים
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          רענן
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(["all", "processed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              statusFilter === f
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "text-(--text-muted) border-white/10 hover:text-(--text-primary)"
            )}
          >
            {f === "all" ? "הכל" : f === "processed" ? "עובד" : "נכשל"}
          </button>
        ))}
      </div>

      {/* Failed-count alert */}
      {failedCount > 0 && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-200">
            <strong>{failedCount}</strong> אירועים נכשלים בחלון הזמן הזה. בדוק את הפרטים למטה כדי לאתר ולתקן.
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-right px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">סטטוס</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">שם אירוע</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">תאריך</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">שגיאה</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-(--text-muted)">
                  טוען...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-(--text-muted)">
                  אין אירועים בחלון הזמן הזה
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const isFailed = !evt.processed || !!evt.processing_error;
                return (
                  <tr
                    key={evt.id}
                    className={cn(
                      "border-t border-white/5",
                      isFailed && "bg-red-500/3"
                    )}
                  >
                    <td className="px-4 py-3">
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1.5 text-red-400">
                          <XCircle className="w-4 h-4" />
                          נכשל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          עובד
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--text-primary)">
                      {evt.event_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-(--text-muted)">
                      {new Date(evt.created_at).toLocaleString("he-IL")}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-300/80 max-w-md truncate" title={evt.processing_error ?? ""}>
                      {evt.processing_error || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-(--text-muted) text-center">
        מציג עד 100 אירועים אחרונים. ל-debug עמוק, חפש לפי <code>event_name</code> ב-Supabase.
      </div>
    </div>
  );
}

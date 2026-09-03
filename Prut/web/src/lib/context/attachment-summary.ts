import type { ContextAttachment } from "./types";

export type AttachmentState = "idle" | "loading" | "error" | "ready";

export interface AttachmentSummary {
  total: number;
  loading: number;
  ready: number;
  error: number;
  /** The one state the tools button shows: loading beats error beats ready. */
  state: AttachmentState;
  /** Hebrew line for the button's title and screen readers. */
  label: string;
}

/**
 * One summary of the attached context for every surface that reports it.
 *
 * Owner ask (2026-09-02): the upload state belongs on the tools button, where
 * the gold dot already draws the eye, not in a status line under the input.
 * The input and the chips both read this so they cannot disagree.
 */
export function summarizeAttachments(attachments: readonly ContextAttachment[]): AttachmentSummary {
  const total = attachments.length;
  const loading = attachments.filter((a) => a.status === "loading").length;
  const error = attachments.filter((a) => a.status === "error").length;
  const ready = attachments.filter((a) => a.status === "ready").length;
  const state: AttachmentState =
    total === 0 ? "idle" : loading > 0 ? "loading" : error > 0 ? "error" : "ready";
  const label =
    state === "idle"
      ? ""
      : state === "loading"
        ? loading === 1
          ? "מעלה קובץ אחד..."
          : `מעלה ${loading} קבצים...`
        : state === "error"
          ? error === 1
            ? "העלאה אחת נכשלה"
            : `${error} העלאות נכשלו`
          : ready === 1
            ? "קובץ אחד מצורף ומוכן"
            : `${ready} קבצים מצורפים ומוכנים`;
  return { total, loading, ready, error, state, label };
}

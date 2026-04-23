import { google } from "googleapis";

export const GSC_SITE_URL =
  process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? "https://www.peroot.space";

export function getGscAuth() {
  // Accept either env name — GOOGLE_APPLICATION_CREDENTIALS_JSON is the
  // existing Vercel convention here; GOOGLE_SERVICE_ACCOUNT_KEY is the
  // name used in earlier docs/scripts. Prefer the former.
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ??
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY invalid JSON");
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/indexing",
    ],
  });
}

export function getGscClient() {
  return google.searchconsole({ version: "v1", auth: getGscAuth() });
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export type GscRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

export function formatRow(r: GscRow, keyIndex = 0) {
  return {
    key: r.keys?.[keyIndex] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr != null ? parseFloat((r.ctr * 100).toFixed(1)) : 0,
    position: r.position != null ? parseFloat(r.position.toFixed(1)) : 0,
  };
}

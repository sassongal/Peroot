import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOAuthClient, OAUTH_SCOPE } from "@/lib/connect/oauth";

export const metadata: Metadata = {
  title: "אישור חיבור — Peroot Connect",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * GET /oauth/authorize — the OAuth 2.1 consent page (Hebrew, cookie-authed).
 * Validates the request, then renders an approve/deny form that posts to
 * /api/oauth/authorize (same-origin form → normal CSRF protection applies).
 * An unrecognized client or redirect_uri gets an error card, NEVER a redirect.
 */

function ErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/6 bg-white/3 backdrop-blur-2xl p-7 text-center">
        <h1 className="text-lg font-bold text-red-400 mb-2">{title}</h1>
        <p className="text-sm text-white/60">{detail}</p>
      </div>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const clientId = str(sp.client_id);
  const redirectUri = str(sp.redirect_uri);
  const responseType = str(sp.response_type);
  const codeChallenge = str(sp.code_challenge);
  const codeChallengeMethod = str(sp.code_challenge_method) || "S256";
  const state = str(sp.state);
  const scope = str(sp.scope) || OAUTH_SCOPE;

  if (!clientId || !redirectUri) {
    return <ErrorCard title="בקשה לא תקינה" detail="חסרים client_id או redirect_uri." />;
  }
  const client = await getOAuthClient(clientId);
  if (!client) {
    return <ErrorCard title="לקוח לא מוכר" detail="ה-client_id לא רשום ב-Peroot Connect." />;
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return (
      <ErrorCard title="כתובת חזרה לא מאושרת" detail="ה-redirect_uri אינו ברשימה שנרשמה ללקוח." />
    );
  }
  if (responseType !== "code" || !codeChallenge || codeChallengeMethod !== "S256") {
    return (
      <ErrorCard
        title="בקשה לא נתמכת"
        detail="נדרש response_type=code עם PKCE (code_challenge, S256)."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const here = `/oauth/authorize?${new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    ).toString()}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  return (
    <main className="min-h-screen bg-[#050505] font-sans flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/6 blur-[160px] rounded-full" />
      </div>
      <div className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/6 bg-linear-to-b from-white/5 to-white/2 backdrop-blur-2xl p-7 shadow-[0_16px_80px_rgba(0,0,0,0.6)]">
        <p className="text-[11px] tracking-widest text-amber-400/80 mb-2">PEROOT CONNECT</p>
        <h1 className="text-xl font-bold text-white mb-4">בקשת חיבור לחשבון שלך</h1>
        <p className="text-sm text-white/70 leading-relaxed mb-5">
          <span className="font-semibold text-white">{client.client_name}</span> מבקש הרשאה לפעול
          בשמך ב-Peroot: שדרוג פרומפטים (בכפוף למכסה שלך), חיפוש ושמירה בספרייה האישית, ותבניות
          מהספרייה הציבורית.
        </p>
        <p className="text-xs text-white/40 mb-6">
          מחובר כ-{user.email} · אפשר לנתק בכל רגע מהגדרות → Connect.
        </p>
        <form method="POST" action="/api/oauth/authorize" className="flex gap-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="scope" value={scope} />
          <button
            type="submit"
            name="decision"
            value="approve"
            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 text-sm transition-colors"
          >
            אישור החיבור
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 py-2.5 text-sm transition-colors"
          >
            ביטול
          </button>
        </form>
      </div>
    </main>
  );
}

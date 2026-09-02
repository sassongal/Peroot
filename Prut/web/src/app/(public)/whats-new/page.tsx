import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { createAnonClient } from "@/lib/supabase/anon";
import { PageHeading } from "@/components/ui/PageHeading";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { formatDateHe } from "@/lib/dates/format";
import { logger } from "@/lib/logger";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "מה חדש בפירוט: יומן השינויים",
  description: "כל מה שהשתנה בפירוט, מהחדש לישן: שפות פלט חדשות, מנועים, ספרייה ותכונות.",
  alternates: { canonical: "/whats-new" },
  openGraph: {
    title: "מה חדש בפירוט",
    description: "כל מה שהשתנה בפירוט, מהחדש לישן.",
    url: "/whats-new",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
};

interface Note {
  id: string;
  title: string;
  body: string;
  href: string | null;
  href_label: string | null;
  lang: "he" | "en" | "ar" | "ru";
  starts_at: string;
}

async function loadNotes(): Promise<Note[]> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, href, href_label, lang, starts_at")
      .order("starts_at", { ascending: false })
      .limit(50);
    if (error) {
      logger.error("[whats-new] load failed", error);
      return [];
    }
    return (data ?? []) as Note[];
  } catch (err) {
    logger.error("[whats-new] load threw", err);
    return [];
  }
}

/**
 * The public change log: every live note from the announcements table,
 * newest first. The home page shows one line; this is where "מה עוד חדש"
 * leads.
 */
export default async function WhatsNewPage() {
  const notes = await loadNotes();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "מה חדש", url: "/whats-new" },
        ])}
      />
      <main
        className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 lg:p-24"
        dir="rtl"
      >
        <div className="max-w-3xl mx-auto space-y-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors py-2 -my-2"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            חזרה לדף הבית
          </Link>

          <PageHeading
            title="מה חדש"
            highlight="בפירוט"
            subtitle="כל מה שהשתנה, מהחדש לישן."
            badge="יומן שינויים"
            badgeIcon={<Megaphone className="w-3.5 h-3.5" aria-hidden="true" />}
            align="start"
          />

          {notes.length === 0 ? (
            <p className="text-(--text-muted)">עדיין אין הודעות. בקרוב.</p>
          ) : (
            <ol className="space-y-6">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-5"
                  dir={note.lang === "en" || note.lang === "ru" ? "ltr" : "rtl"}
                  lang={note.lang}
                >
                  <time
                    dateTime={note.starts_at}
                    className="text-[11px] font-mono text-(--text-muted)"
                  >
                    {formatDateHe(note.starts_at)}
                  </time>
                  <h2 className="text-lg font-bold text-(--text-primary) mt-1">{note.title}</h2>
                  {note.body ? (
                    <p className="text-(--text-secondary) leading-relaxed mt-2">{note.body}</p>
                  ) : null}
                  {note.href && note.href !== "/whats-new" ? (
                    <Link
                      href={note.href}
                      className="inline-block mt-3 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {note.href_label || "לפרטים"}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqSchema } from "@/lib/schema";
import { LANDINGS, LANGUAGE_ALTERNATES, type LandingLocale } from "@/lib/landing/language-landings";
import { getQuotaPolicy } from "@/lib/quota-server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

/**
 * One landing page for one language (languages spec B7). The page is in the
 * visitor's language; the CTA lands on the home page with the output
 * language preset. Server component: the free-plan line reads the live
 * quota policy so no number lives in the copy.
 */
export async function LanguageLanding({ locale }: { locale: LandingLocale }) {
  const c = LANDINGS[locale];
  const quota = await getQuotaPolicy();
  const Arrow = c.dir === "rtl" ? ArrowLeft : ArrowRight;
  const appHref = `/?lang=${locale}`;

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: c.title,
    description: c.description,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Peroot", url: SITE_URL },
  };

  return (
    <>
      <JsonLd data={webPage} />
      <JsonLd data={{ ...faqSchema(c.faq), inLanguage: locale }} />
      <main
        className="min-h-screen bg-background text-foreground font-sans"
        dir={c.dir}
        lang={locale}
      >
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 space-y-20">
          {/* Language switcher */}
          <nav aria-label="Language" className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(LANGUAGE_ALTERNATES) as Array<keyof typeof LANGUAGE_ALTERNATES>)
              .filter((k) => k !== "x-default")
              .map((k) => {
                const code = k === "he-IL" ? "he" : k;
                const active = code === locale;
                return (
                  <Link
                    key={k}
                    href={LANGUAGE_ALTERNATES[k]}
                    hrefLang={code}
                    lang={code}
                    dir={code === "he" || code === "ar" ? "rtl" : "ltr"}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40"
                        : "px-3 py-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) border border-transparent hover:border-(--glass-border)"
                    }
                  >
                    {c.switcher[code]}
                  </Link>
                );
              })}
          </nav>

          {/* Hero */}
          <section className="space-y-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {c.eyebrow}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-(--text-primary)">
              {c.heading} <span className="text-amber-500">{c.headingHighlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-(--text-secondary) max-w-3xl leading-relaxed">
              {c.subheading}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={appHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors min-h-[48px]"
              >
                {c.cta}
                <Arrow className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center px-6 py-3 rounded-xl border border-(--glass-border) text-(--text-primary) hover:bg-(--glass-bg) transition-colors min-h-[48px]"
              >
                {c.ctaSecondary}
              </a>
            </div>
            <p className="text-sm text-(--text-muted)">
              {c.freePlanLine(quota.freeDaily, quota.guestDaily)}
            </p>
            <p className="text-sm text-(--text-muted) border-s-2 border-amber-500/40 ps-3">
              {c.hebrewUiNote}
            </p>
          </section>

          {/* Steps */}
          <section id="how" className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-bold text-(--text-primary)">{c.stepsTitle}</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {c.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-5"
                >
                  <span className="text-xs font-mono text-amber-500">0{i + 1}</span>
                  <h3 className="text-lg font-semibold text-(--text-primary) mt-1">{step.title}</h3>
                  <p className="text-(--text-secondary) mt-2 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Example */}
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-(--text-primary)">
              {c.exampleTitle}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-5">
                <p className="text-(--text-secondary) italic">{c.exampleBefore}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-1">
                {c.exampleAfterLines.map((line) =>
                  line.startsWith("## ") ? (
                    <p
                      key={line}
                      className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-2"
                    >
                      {line.slice(3)}
                    </p>
                  ) : (
                    <p key={line} className="text-sm text-(--text-primary) leading-relaxed">
                      {line}
                    </p>
                  ),
                )}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-bold text-(--text-primary)">
              {c.featuresTitle}
            </h2>
            <ul className="grid gap-6 md:grid-cols-2">
              {c.features.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="shrink-0 mt-1 flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15">
                    <Check className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-(--text-primary)">{f.title}</h3>
                    <p className="text-(--text-secondary) mt-1 leading-relaxed">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-(--text-primary)">{c.faqTitle}</h2>
            <div className="divide-y divide-(--glass-border) border-y border-(--glass-border)">
              {c.faq.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="cursor-pointer font-semibold text-(--text-primary) list-none flex items-center justify-between gap-4">
                    {item.question}
                    <span className="text-(--text-muted) group-open:rotate-45 transition-transform motion-reduce:transition-none">
                      +
                    </span>
                  </summary>
                  <p className="text-(--text-secondary) mt-3 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Closing CTA */}
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-(--text-primary)">{c.cta}</h2>
            <p className="text-(--text-muted)">
              {c.freePlanLine(quota.freeDaily, quota.guestDaily)}
            </p>
            <Link
              href={appHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors min-h-[48px]"
            >
              {c.cta}
              <Arrow className="w-4 h-4" aria-hidden="true" />
            </Link>
            <p className="text-sm">
              <Link
                href="/"
                lang="he"
                className="text-(--text-muted) hover:text-(--text-primary) underline"
              >
                {c.hebrewSiteLink}
              </Link>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

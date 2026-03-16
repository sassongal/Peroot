import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharePageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('shared_prompts')
    .select('prompt, category')
    .eq('id', id)
    .single();

  const title = data
    ? `פרומפט משותף - ${data.category}`
    : 'פרומפט משותף';

  const description = data?.prompt?.slice(0, 160) || 'פרומפט שנוצר עם Peroot';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://peroot.space';

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/p/${id}`,
      siteName: 'Peroot',
      locale: 'he_IL',
      type: 'article',
    },
    alternates: {
      canonical: `/p/${id}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function SharedPromptPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: prompt, error } = await supabase
    .from('shared_prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !prompt) {
    notFound();
  }

  // Increment views (fire and forget) via atomic RPC
  void Promise.resolve(supabase.rpc('increment_shared_prompt_views', { prompt_id: id }))
    .catch((err: unknown) => console.error('Failed to increment views:', err));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: `פרומפט - ${prompt.category}`,
            description: prompt.prompt?.slice(0, 160),
            url: `${siteUrl}/p/${id}`,
            inLanguage: "he",
            creator: { "@type": "Organization", name: "Peroot", url: siteUrl },
          }),
        }}
      />
      <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לפירוט</span>
        </Link>

        <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full">
                {prompt.category}
              </span>
              <span className="text-[10px] text-slate-600">
                {prompt.views || 0} צפיות
              </span>
            </div>
            <span className="text-[10px] text-slate-600">
              נוצר עם Peroot
            </span>
          </div>

          {prompt.original_input && (
            <div className="px-6 pt-4">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">הפרומפט המקורי</div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm text-slate-400">
                {prompt.original_input}
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-3">הפרומפט המשודרג</div>
            <div className="p-4 rounded-lg bg-black/40 border border-white/5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">
              {prompt.prompt}
            </div>
          </div>

          <SharePageClient prompt={prompt.prompt} />
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-500 mb-4">רוצים ליצור פרומפטים כאלה?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
          >
            <Wand2 className="w-4 h-4" />
            נסו את Peroot בחינם
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

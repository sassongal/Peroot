import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { ContactForm } from "@/components/ui/ContactForm";

export const metadata: Metadata = {
  title: "צור קשר | Peroot",
  description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
    url: "/contact",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors mb-8">
          <ArrowRight className="w-4 h-4" />
          חזרה לדף הבית
        </Link>

        <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">צור קשר</h1>

        <p className="text-lg text-slate-300 leading-relaxed">
          יש לכם שאלה, הצעה או דיווח על באג? נשמח לשמוע!
        </p>

        <ContactForm />

        <div className="text-center pt-4">
          <p className="text-sm text-slate-500 mb-2">או שלחו מייל ישירות:</p>
          <a
            href="mailto:gal@joya-tech.net"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Mail className="w-4 h-4" />
            gal@joya-tech.net
          </a>
        </div>
      </div>
    </main>
  );
}

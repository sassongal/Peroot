"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/context/I18nContext";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useI18n();
  const isHe = t.locale === "he";

  return (
    <footer className="w-full border-t border-white/5 bg-black/50 backdrop-blur-md z-30 relative" dir={isHe ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">

        {/* Brand & Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-lg font-serif font-bold text-white tracking-wide">Peroot</span>
          <p className="text-sm text-slate-400">
            {isHe
              ? `© ${currentYear} כל הזכויות שמורות ל-JoyaTech.`
              : `© ${currentYear} All rights reserved by JoyaTech.`}
          </p>
        </div>

        {/* Links */}
        <nav aria-label={isHe ? "ניווט תחתון" : "Footer navigation"} className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-sm text-slate-400">
          <Link href="/blog" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "בלוג" : "Blog"}
          </Link>
          <Link href="/pricing" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "מחירים" : "Pricing"}
          </Link>
          <Link href="/terms" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "תנאי שימוש" : "Terms of Use"}
          </Link>
          <Link href="/privacy" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "מדיניות פרטיות" : "Privacy Policy"}
          </Link>
          <Link href="/accessibility" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "הצהרת נגישות" : "Accessibility"}
          </Link>
          <a href="mailto:gal@joya-tech.net" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "צור קשר" : "Contact"}
          </a>
          <span className="border-l border-white/10 h-5 mx-1 hidden md:block" />
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}

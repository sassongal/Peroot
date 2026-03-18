"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/context/I18nContext";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useI18n();
  const isHe = t.locale === "he";

  return (
    <footer
      className="w-full backdrop-blur-md z-30 relative transition-colors duration-200"
      style={{
        background: "var(--surface-footer)",
        borderTop: "1px solid var(--border-footer)",
      }}
      dir={isHe ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">

        {/* Brand & Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/peroot_logo_pack/logo_dark_240.png"
              alt=""
              width={240}
              height={240}
              className="block dark:hidden h-6 w-auto"
            />
            <Image
              src="/images/peroot_logo_pack/logo_dark_footer_2x.png"
              alt=""
              width={160}
              height={160}
              className="hidden dark:block h-6 w-auto"
            />
            <span className="font-black tracking-wider text-[#1B2141] dark:text-[#C8E8EE]">Peroot</span>
          </Link>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isHe
              ? `© ${currentYear} כל הזכויות שמורות ל-JoyaTech.`
              : `© ${currentYear} All rights reserved by JoyaTech.`}
          </p>
        </div>

        {/* Links */}
        <nav aria-label={isHe ? "ניווט תחתון" : "Footer navigation"} className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/prompts" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "ספריית פרומפטים" : "Prompt Library"}
          </Link>
          <Link href="/guide" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "מדריך" : "Guide"}
          </Link>
          <Link href="/examples" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "דוגמאות" : "Examples"}
          </Link>
          <Link href="/about" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "אודות" : "About"}
          </Link>
          <Link href="/features" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "מה עושים פה?" : "Features"}
          </Link>
          <Link href="/extension" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "תוסף Chrome" : "Chrome Extension"}
          </Link>
          <Link href="/blog" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "בלוג" : "Blog"}
          </Link>
          <Link href="/pricing" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            {isHe ? "מחירים" : "Pricing"}
          </Link>
          <Link href="/terms" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "תנאי שימוש" : "Terms of Use"}
          </Link>
          <Link href="/privacy" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "מדיניות פרטיות" : "Privacy Policy"}
          </Link>
          <Link href="/accessibility" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "הצהרת נגישות" : "Accessibility"}
          </Link>
          <Link href="/contact" className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            {isHe ? "צור קשר" : "Contact"}
          </Link>
          <a
            href="https://www.facebook.com/profile.php?id=61579689932777"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[44px] min-w-[44px] px-1 flex items-center justify-center"
            aria-label="Facebook"
            title="Peroot on Facebook"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
            </svg>
          </a>
          <span className="border-l border-black/10 dark:border-white/10 h-5 mx-1 hidden md:block" />
          <LanguageSwitcher />
        </nav>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/context/I18nContext";

// U3.5: the footer was 19 flat links in one row. Four named groups scan in
// one glance; labels follow the locked vocabulary (U3.3/U3.4): the public
// catalogue is "ספריית פרומפטים", /features is "יכולות" everywhere.
const LINK_GROUPS: Array<{
  titleHe: string;
  titleEn: string;
  links: Array<{ href: string; he: string; en: string }>;
}> = [
  {
    titleHe: "המוצר",
    titleEn: "Product",
    links: [
      { href: "/prompts", he: "ספריית פרומפטים", en: "Prompt Library" },
      { href: "/templates", he: "תבניות", en: "Templates" },
      { href: "/features", he: "יכולות", en: "Features" },
      { href: "/extension", he: "תוסף Chrome", en: "Chrome Extension" },
      { href: "/pricing", he: "מחירים", en: "Pricing" },
    ],
  },
  {
    titleHe: "ללמוד",
    titleEn: "Learn",
    links: [
      { href: "/guide", he: "מדריך הפרומפטים", en: "Prompt Guide" },
      { href: "/guides", he: "מדריכי פלטפורמות", en: "Platform Guides" },
      { href: "/examples", he: "דוגמאות", en: "Examples" },
      { href: "/blog", he: "בלוג", en: "Blog" },
    ],
  },
  {
    titleHe: "חיבורים",
    titleEn: "Connect",
    links: [
      { href: "/connect", he: "Peroot Connect", en: "Peroot Connect" },
      { href: "/teachers", he: "למורים", en: "For Teachers" },
      { href: "/about", he: "אודות", en: "About" },
      { href: "/contact", he: "צור קשר", en: "Contact" },
    ],
  },
  {
    titleHe: "משפטי",
    titleEn: "Legal",
    links: [
      { href: "/terms", he: "תנאי שימוש", en: "Terms of Use" },
      { href: "/privacy", he: "מדיניות פרטיות", en: "Privacy Policy" },
      { href: "/accessibility", he: "הצהרת נגישות", en: "Accessibility" },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useI18n();
  const isHe = t.locale === "he";
  // The mobile tab bar exists only on the app route; give the footer room
  // there so its last row isn't buried under the fixed bar (U5.5).
  const onAppRoute = usePathname() === "/";

  return (
    <footer
      className="w-full backdrop-blur-md z-30 relative transition-colors duration-200"
      style={{
        background: "var(--surface-footer)",
        borderTop: "1px solid var(--border-footer)",
      }}
      dir={isHe ? "rtl" : "ltr"}
    >
      <div
        className={
          onAppRoute
            ? "max-w-7xl mx-auto px-6 py-10 md:py-12 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-12"
            : "max-w-7xl mx-auto px-6 py-10 md:py-12"
        }
      >
        {/* Link groups */}
        <nav
          aria-label={isHe ? "ניווט תחתון" : "Footer navigation"}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10"
        >
          {LINK_GROUPS.map((group) => (
            <div key={group.titleEn} className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {isHe ? group.titleHe : group.titleEn}
              </span>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors min-h-[44px] flex items-center"
                  suppressHydrationWarning
                >
                  {isHe ? link.he : link.en}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Brand row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/peroot_logo_pack/logo_dark_240.png"
                alt=""
                width={24}
                height={24}
                className="block dark:hidden h-6 w-6"
              />
              <Image
                src="/images/peroot_logo_pack/logo_dark_footer_2x.png"
                alt=""
                width={24}
                height={24}
                className="hidden dark:block h-6 w-6"
              />
              <span className="font-black tracking-wider text-[#1B2141] dark:text-[#C8E8EE]">
                Peroot
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isHe
                ? `© ${currentYear} כל הזכויות שמורות ל-JoyaTech.`
                : `© ${currentYear} All rights reserved by JoyaTech.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=61579689932777"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Facebook"
              title="Peroot on Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <span className="border-l border-black/10 dark:border-white/10 h-5 mx-1 hidden md:block" />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/5 bg-black/50 backdrop-blur-md z-30 relative" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        
        {/* Brand & Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-lg font-serif font-bold text-white tracking-wide">Peroot</span>
          <p className="text-sm text-slate-400">
            © {currentYear} כל הזכויות שמורות ל-JoyaTech.
          </p>
        </div>

        {/* Links */}
        <nav aria-label="ניווט תחתון" className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-slate-400">
          <Link href="/blog" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            בלוג
          </Link>
          <Link href="/pricing" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center">
            מחירים
          </Link>
          <Link href="/terms" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            תנאי שימוש
          </Link>
          <Link href="/privacy" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            מדיניות פרטיות
          </Link>
          <Link href="/accessibility" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            הצהרת נגישות
          </Link>
          <a href="mailto:gal@joya-tech.net" className="cursor-pointer hover:text-amber-400 hover:underline transition-colors min-h-[44px] px-1 flex items-center" suppressHydrationWarning>
            צור קשר
          </a>
        </nav>
      </div>
    </footer>
  );
}

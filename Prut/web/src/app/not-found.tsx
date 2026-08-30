import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-(--surface-body) text-(--text-secondary) p-4"
      dir="rtl"
    >
      <div className="text-center max-w-md">
        {/* Brand mark */}
        <div className="flex justify-center mb-2">
          <Image
            src="/images/peroot_logo_pack/logo_dark_240.png"
            alt="Peroot"
            width={240}
            height={240}
            className="block dark:hidden h-12 w-auto opacity-90"
          />
          <Image
            src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
            alt="Peroot"
            width={240}
            height={240}
            className="hidden dark:block h-12 w-auto opacity-90"
          />
        </div>
        {/* 404 Number */}
        <div className="text-[120px] md:text-[180px] font-bold leading-none bg-linear-to-b from-(--text-primary) to-(--text-muted) bg-clip-text text-transparent">
          404
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-serif font-bold mt-4 mb-2 text-(--text-primary)">
          הדף לא נמצא
        </h1>
        <p className="text-(--text-muted) mb-8">מצטערים, הדף שחיפשת לא קיים או שהועבר למקום אחר.</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-(--text-primary) text-(--surface-body) font-bold rounded-xl hover:opacity-80 transition-colors"
          >
            חזרה לדף הבית
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-(--glass-border) text-(--text-primary) font-bold rounded-xl hover:bg-(--glass-bg) transition-colors"
          >
            התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}

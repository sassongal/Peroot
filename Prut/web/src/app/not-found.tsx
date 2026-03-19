import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-body)] text-[var(--text-secondary)] p-4" dir="rtl">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="text-[120px] md:text-[180px] font-bold leading-none bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-muted)] bg-clip-text text-transparent">
          404
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-serif font-bold mt-4 mb-2 text-[var(--text-primary)]">
          הדף לא נמצא
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          מצטערים, הדף שחיפשת לא קיים או שהועבר למקום אחר.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-[var(--text-primary)] text-[var(--surface-body)] font-bold rounded-xl hover:opacity-80 transition-colors"
          >
            חזרה לדף הבית
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-[var(--glass-border)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-[var(--glass-bg)] transition-colors"
          >
            התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}

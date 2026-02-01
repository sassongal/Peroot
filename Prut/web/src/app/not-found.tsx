import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-slate-200 p-4" dir="rtl">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="text-[120px] md:text-[180px] font-bold leading-none bg-gradient-to-b from-white to-slate-600 bg-clip-text text-transparent">
          404
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-serif font-bold mt-4 mb-2">
          הדף לא נמצא
        </h1>
        <p className="text-slate-400 mb-8">
          מצטערים, הדף שחיפשת לא קיים או שהועבר למקום אחר.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            חזרה לדף הבית
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
          >
            התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}

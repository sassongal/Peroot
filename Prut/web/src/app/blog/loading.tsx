export default function BlogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6" dir="rtl">
      <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

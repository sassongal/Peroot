export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <span className="sr-only">טוען…</span>
    </div>
  );
}


export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-100">לוח בקרה</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
           <div className="text-slate-400 text-sm">משתמשים רשומים</div>
           <div className="text-3xl font-bold text-white mt-2">--</div>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
           <div className="text-slate-400 text-sm">שימושים החודש</div>
           <div className="text-3xl font-bold text-white mt-2">--</div>
        </div>
        <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/50">
           <div className="text-slate-400 text-sm">מצב מערכת</div>
           <div className="text-3xl font-bold text-emerald-400 mt-2">תקין</div>
        </div>
      </div>
    </div>
  );
}

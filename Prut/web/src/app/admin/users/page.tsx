"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  Shield, 
  Ban, 
  Mail,
  Calendar,
  Crown,
  UserPlus,
  RefreshCw,
  Clock,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role: string | null;
  is_banned: boolean;
  credits_balance: number;
}

import { useI18n } from "@/context/I18nContext";

export default function UsersPage() {
  const t = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'admin' | 'active' | 'banned'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      // Get profiles and roles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      // Merge data
      const mergedUsers = profiles.map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.id)?.role || 'user'
      }));

      setUsers(mergedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t.admin.users.toasts.load_error);
    } finally {
      setLoading(false);
    }
  }

  async function syncWithAuth() {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-users', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(t.admin.users.toasts.sync_success.replace('{count}', data.synced.toString()));
        loadUsers();
      } else {
        toast.error(t.admin.users.toasts.sync_error);
      }
    } catch {
      toast.error(t.admin.users.toasts.comm_error);
    } finally {
      setIsSyncing(false);
    }
  }

  async function toggleAdmin(userId: string, currentRole: string | null) {
    const isNowAdmin = currentRole === 'admin';
    const actionText = isNowAdmin ? t.admin.users.toasts.action_remove : t.admin.users.toasts.action_add;
    
    if (!confirm(t.admin.users.toasts.admin_confirm.replace('{action}', actionText))) return;

    try {
       if (isNowAdmin) {
          const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
          if (error) throw error;
       } else {
          const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
          if (error) throw error;
       }
       toast.success(t.admin.users.toasts.update_success);
       loadUsers();
    } catch (err) {
       console.error(err);
       toast.error(t.admin.users.toasts.update_error);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(search.toLowerCase()) || 
                         user.id.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'admin') return user.role === 'admin';
    if (filter === 'banned') return user.is_banned;
    if (filter === 'active') return user.last_sign_in_at && new Date(user.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none" dir="rtl">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                   <Shield className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Identity Access Management</span>
             </div>
             <h1 className="text-6xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
                Nexus Users
             </h1>
             <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
                {t.admin.users.title_desc}
             </p>
          </div>

          <div className="flex gap-4">
             <button 
                onClick={syncWithAuth}
                disabled={isSyncing}
                className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl"
             >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Syncing Pipeline...' : 'Refetch Data'}
             </button>
             <button className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-3">
                <UserPlus className="w-4 h-4" />
                Provision User
             </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-col lg:flex-row gap-6 p-1 bg-zinc-950/50 rounded-[32px] border border-white/5 mx-2">
           <div className="flex-1 relative group">
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.admin.users.search_placeholder}
                className="w-full pr-16 pl-6 py-5 bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-700 font-bold"
              />
           </div>

           <div className="flex p-2 gap-2">
             {(['all', 'admin', 'active', 'banned'] as const).map((f) => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={cn(
                   "px-6 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3",
                   filter === f
                     ? 'bg-blue-600 text-white shadow-3xl shadow-blue-600/20'
                     : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
                 )}
               >
                 {t.admin.users.filters[f]}
               </button>
             ))}
           </div>
        </div>

        {/* User Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
          <SimpleStat label={t.admin.users.stats.total} value={users.length} icon={Users} color="blue" />
          <SimpleStat label={t.admin.users.stats.admins} value={users.filter(u => u.role === 'admin').length} icon={Crown} color="purple" />
          <SimpleStat label={t.admin.users.stats.active} value={users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length} icon={Zap} color="emerald" />
          <SimpleStat label={t.admin.users.stats.credits} value={users.reduce((acc, curr) => acc + (curr.credits_balance || 0), 0)} icon={Clock} color="amber" />
        </div>

        {/* Unified Identity Table */}
        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-3xl mx-2">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full border-collapse border-none">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.users.table.identity}</th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.users.table.access}</th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.users.table.telemetry}</th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.users.table.credits}</th>
                  <th className="px-10 py-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">{t.admin.users.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                   <tr>
                     <td colSpan={5} className="px-10 py-40 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-500/20" />
                          <span className="text-zinc-700 font-black uppercase tracking-[0.4em] text-[10px]">{t.admin.users.table.loading}</span>
                        </div>
                     </td>
                   </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-40 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]">{t.admin.users.table.empty}</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-all duration-500 overflow-hidden relative">
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 font-black group-hover:scale-110 group-hover:bg-zinc-800 transition-all duration-700 shadow-2xl">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            {user.last_sign_in_at && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-zinc-950 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xl font-bold text-white tracking-tight">{user.email}</span>
                            <span className="text-[9px] text-zinc-700 font-black uppercase tracking-tighter">ID: {user.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex items-center gap-3">
                            <span className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                user.role === 'admin' 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' 
                                    : 'bg-white/5 border-white/5 text-zinc-500'
                            )}>
                                {user.role?.toUpperCase() || 'USER'}
                            </span>
                            {user.is_banned && (
                                <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">Banned</span>
                            )}
                         </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                              <Calendar className="w-3.5 h-3.5 text-zinc-700" />
                              {new Date(user.created_at).toLocaleDateString(t.locale === 'he' ? 'he-IL' : 'en-US')}
                           </div>
                           <span className="text-[9px] text-zinc-700 font-black uppercase">Initial Join</span>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2">
                           <Zap className="w-4 h-4 text-amber-500" />
                           <span className="text-lg font-black text-white">{user.credits_balance || 0}</span>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex items-center justify-center gap-3">
                            <button 
                                onClick={() => toggleAdmin(user.id, user.role)}
                                className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-500 scale-90 group-hover:scale-100"
                                title={user.role === 'admin' ? "Remove Admin" : "Grant Admin"}
                            >
                                <Crown className="w-5 h-5" />
                            </button>
                            <button className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-white hover:bg-zinc-800 transition-all duration-500 scale-90 group-hover:scale-100">
                                <Mail className="w-5 h-5" />
                            </button>
                            <button className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all duration-500 scale-90 group-hover:scale-100">
                                <Ban className="w-5 h-5" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SimpleStat({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500",
  };

  return (
    <div className="group p-8 rounded-[40px] bg-zinc-950 border border-white/5 flex flex-col gap-6 transition-all duration-700 hover:border-white/10 hover:shadow-3xl">
       <div className="flex justify-between items-start">
          <div className={cn("p-4 rounded-2xl border transition-all duration-700 group-hover:text-white shadow-2xl", colors[color])}>
             <Icon className="w-6 h-6" />
          </div>
          <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[8px] font-black text-zinc-700 tracking-[0.2em] uppercase">Identity</div>
       </div>
       <div className="space-y-1">
          <div className="text-4xl font-black text-white tracking-tighter transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2 origin-right leading-none">{value}</div>
          <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{label}</div>
       </div>
    </div>
  );
}

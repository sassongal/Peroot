"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  Shield, 
  Ban, 
  CheckCircle, 
  Mail,
  Calendar,
  MoreVertical,
  UserX,
  Crown
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role?: string;
  is_banned?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'active' | 'banned'>('all');

  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      // Get all users with their roles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get roles for all users
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const usersWithRoles = (profiles || []).map(user => ({
        ...user,
        role: roles?.find(r => r.user_id === user.id)?.role || 'user',
        is_banned: false // Can extend with banned users table
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('User role updated');
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  }

  async function sendEmailToUser(userId: string) {
    toast.info('Email notification feature coming soon');
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.id.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filter) {
      case 'admin':
        return user.role === 'admin';
      case 'active':
        return user.last_sign_in_at && 
          new Date(user.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      case 'banned':
        return user.is_banned;
      default:
        return true;
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">ניהול משתמשים</h1>
            <p className="text-slate-400">נהל משתמשים, הרשאות ותפקידים</p>
          </div>
          
          <button
            onClick={async () => {
              const res = await fetch('/api/admin/sync-users', { method: 'POST' });
              const data = await res.json();
              if (data.success) {
                toast.success(`סונכרנו ${data.synced} משתמשים`);
                loadUsers();
              } else {
                toast.error('שגיאה בסנכרון משתמשים');
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            סנכרן משתמשים מ-Auth
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי אימייל או ID..."
              className="w-full pr-12 pl-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'admin', 'active', 'banned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-3 rounded-xl transition-all ${
                  filter === f
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {f === 'all' ? 'הכל' : f === 'admin' ? 'מנהלים' : f === 'active' ? 'פעילים' : 'חסומים'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="סה״כ משתמשים" value={users.length} />
          <StatCard label="מנהלים" value={users.filter(u => u.role === 'admin').length} />
          <StatCard label="פעילים (שבוע)" value={users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} />
          <StatCard label="חסומים" value={users.filter(u => u.is_banned).length} />
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold">משתמש</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">תפקיד</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">הצטרפות</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">כניסה אחרונה</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      טוען משתמשים...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      לא נמצאו משתמשים
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {user.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <div className="text-xs text-slate-500">{user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role || 'user'} onChange={(role) => updateUserRole(user.id, role)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.created_at).toLocaleDateString('he-IL')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-400">
                          {user.last_sign_in_at 
                            ? new Date(user.last_sign_in_at).toLocaleDateString('he-IL')
                            : 'אף פעם'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendEmailToUser(user.id)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="שלח אימייל"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                            title="חסום משתמש"
                          >
                            <Ban className="w-4 h-4" />
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function RoleBadge({ role, onChange }: { role: string; onChange: (role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const roleConfig = {
    admin: { label: 'מנהל', color: 'from-red-500 to-pink-500', icon: Crown },
    moderator: { label: 'מפקח', color: 'from-blue-500 to-cyan-500', icon: Shield },
    user: { label: 'משתמש', color: 'from-slate-500 to-slate-600', icon: CheckCircle },
  };

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.color} text-white text-sm font-medium`}
      >
        <Icon className="w-4 h-4" />
        {config.label}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 bg-black border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl">
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 transition-colors w-full text-right"
              >
                <cfg.icon className="w-4 h-4" />
                {cfg.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

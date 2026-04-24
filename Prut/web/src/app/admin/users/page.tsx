"use client";

import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Search,
  Shield,
  Mail,
  Calendar,
  Crown,
  Download,
  RefreshCw,
  Clock,
  Users,
  Zap,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";
import { logger } from "@/lib/logger";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role: string | null;
  is_banned: boolean;
  credits_balance: number;
  // enriched
  plan_tier?: string;
  customer_name?: string | null;
  tags?: string[];
  // real activity (from /api/admin/users enrichment)
  prompt_count?: number;
  last_prompt_at?: string | null;
  last_activity_at?: string | null;
}

export default function UsersPage() {
  const t = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "active" | "banned" | "churn">("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadUsers(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search: re-fetch from Supabase whenever the search term changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadUsers(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadUsers(searchTerm = "") {
    setLoading(true);
    try {
      const url = new URL(getApiPath("/api/admin/users"), window.location.origin);
      if (searchTerm.trim()) {
        url.searchParams.set("search", searchTerm.trim());
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: User[] = await res.json();
      setUsers(data);
    } catch (error) {
      logger.error("Failed to load users:", error);
      toast.error(t.admin.users.toasts.load_error);
    } finally {
      setLoading(false);
    }
  }

  async function syncWithAuth() {
    setIsSyncing(true);
    try {
      const res = await fetch(getApiPath("/api/admin/sync-users"), {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t.admin.users.toasts.sync_success.replace("{count}", data.synced.toString()));
        loadUsers(search);
      } else {
        toast.error(t.admin.users.toasts.sync_error);
      }
    } catch {
      toast.error(t.admin.users.toasts.comm_error);
    } finally {
      setIsSyncing(false);
    }
  }

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAllVisible(visibleIds: string[]) {
    setSelected((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  async function runBulk(action: "ban" | "unban" | "grant_admin" | "revoke_admin") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const labels: Record<string, string> = {
      ban: "לחסום",
      unban: "לשחרר חסימה של",
      grant_admin: "להפוך למנהלים את",
      revoke_admin: "לבטל הרשאת מנהל של",
    };
    if (!confirm(`${labels[action]} ${ids.length} משתמשים?`)) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      // Sequential to avoid hammering — there's no bulk endpoint and the list
      // is usually small (a handful of rows).
      for (const id of ids) {
        try {
          const res = await fetch(getApiPath(`/api/admin/users/${id}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) toast.success(`הצליח על ${ok} משתמשים${fail > 0 ? ` · נכשל על ${fail}` : ""}`);
      if (ok === 0 && fail > 0) toast.error(`נכשל על כל ${fail} המשתמשים`);
      setSelected(new Set());
      loadUsers(search);
    } finally {
      setBulkBusy(false);
    }
  }

  async function toggleAdmin(userId: string, currentRole: string | null) {
    const isNowAdmin = currentRole === "admin";
    const actionText = isNowAdmin
      ? t.admin.users.toasts.action_remove
      : t.admin.users.toasts.action_add;

    if (!confirm(t.admin.users.toasts.admin_confirm.replace("{action}", actionText))) return;

    try {
      const action = isNowAdmin ? "revoke_admin" : "grant_admin";
      const res = await fetch(getApiPath(`/api/admin/users/${userId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success(t.admin.users.toasts.update_success);
      loadUsers();
    } catch (err) {
      logger.error(err);
      toast.error(t.admin.users.toasts.update_error);
    }
  }

  // Server-side search handles email/name/id filtering; apply only role/status filters client-side
  const filteredUsers = users.filter((user) => {
    if (filter === "admin") return user.role === "admin";
    if (filter === "banned") return user.is_banned;
    if (filter === "active") {
      const activeAt = user.last_activity_at ?? user.last_prompt_at ?? user.last_sign_in_at;
      return !!activeAt && new Date(activeAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    if (filter === "churn") return user.tags?.includes("churn");
    return true;
  });

  function exportUsers() {
    if (users.length === 0) {
      toast.error("No users to export");
      return;
    }

    const BOM = "\uFEFF";
    const headers = "אימייל,שם,מנוי,תפקיד,קרדיטים,סטטוס,תאריך הצטרפות,כניסה אחרונה\n";
    const rows = users
      .map((u) => {
        const cols = [
          u.email,
          u.customer_name ?? "",
          u.plan_tier ?? "free",
          u.role ?? "user",
          String(u.credits_balance ?? 0),
          u.is_banned ? "חסום" : "פעיל",
          new Date(u.created_at).toLocaleDateString("he-IL"),
          u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("he-IL") : "",
        ];
        return cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
      })
      .join("\n");

    const blob = new Blob([BOM + headers + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peroot_users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${users.length} users`);
  }

  function lastActiveLabel(lastSignIn: string | null | undefined) {
    if (!lastSignIn) return "Never";
    const diff = Date.now() - new Date(lastSignIn).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(lastSignIn).toLocaleDateString("en-US");
  }

  function tierColor(tier: string | undefined) {
    if (!tier) return "bg-white/5 border-white/5 text-zinc-600";
    const t = tier.toLowerCase();
    if (t.includes("pro") || t.includes("premium"))
      return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    return "bg-white/5 border-white/5 text-zinc-500";
  }

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
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
                Identity Access Management
              </span>
            </div>
            <h1 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
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
              {isSyncing ? "Syncing Pipeline..." : "Refetch Data"}
            </button>
            <button
              onClick={exportUsers}
              className="px-6 py-3 rounded-2xl bg-white/3 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-3"
            >
              <Download className="w-4 h-4" />
              Export Users
            </button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-col lg:flex-row gap-6 p-1 bg-zinc-950/50 rounded-[32px] border border-white/5 mx-2">
          <div className="flex-1 relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש לפי אימייל, שם או ID..."
              className="w-full pr-16 pl-6 py-5 bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-700 font-bold"
            />
          </div>

          <div className="flex p-2 gap-2">
            {(["all", "admin", "active", "banned", "churn"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-6 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3",
                  filter === f
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20"
                    : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5",
                )}
              >
                {t.admin.users.filters[f]}
              </button>
            ))}
          </div>
        </div>

        {/* User Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
          <SimpleStat
            label={t.admin.users.stats.total}
            value={users.length}
            icon={Users}
            color="blue"
          />
          <SimpleStat
            label={t.admin.users.stats.admins}
            value={users.filter((u) => u.role === "admin").length}
            icon={Crown}
            color="purple"
          />
          <SimpleStat
            label={t.admin.users.stats.active}
            value={
              users.filter((u) => {
                const activeAt = u.last_activity_at ?? u.last_prompt_at ?? u.last_sign_in_at;
                return (
                  !!activeAt && new Date(activeAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );
              }).length
            }
            icon={Zap}
            color="emerald"
          />
          <SimpleStat
            label={t.admin.users.stats.credits}
            value={users.reduce((acc, curr) => acc + (curr.credits_balance || 0), 0)}
            icon={Clock}
            color="amber"
          />
        </div>

        {/* Bulk Actions Toolbar */}
        {selected.size > 0 && (
          <div className="mx-2 flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-3xl bg-blue-500/5 border border-blue-500/20 sticky top-4 z-30 backdrop-blur-xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
              <span className="text-blue-300">{selected.size} נבחרו</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                נקה
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => runBulk("ban")}
                disabled={bulkBusy}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
              >
                חסום
              </button>
              <button
                onClick={() => runBulk("unban")}
                disabled={bulkBusy}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
              >
                בטל חסימה
              </button>
              <button
                onClick={() => runBulk("grant_admin")}
                disabled={bulkBusy}
                className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
              >
                הפוך למנהל
              </button>
              <button
                onClick={() => runBulk("revoke_admin")}
                disabled={bulkBusy}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
              >
                בטל מנהל
              </button>
            </div>
          </div>
        )}

        {/* Unified Identity Table */}
        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl mx-2">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full border-collapse border-none">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-8 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.id))
                      }
                      onChange={() => toggleSelectAllVisible(filteredUsers.map((u) => u.id))}
                      className="accent-blue-500 w-4 h-4 cursor-pointer"
                      aria-label="Select all visible"
                    />
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    {t.admin.users.table.identity}
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    Tier
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    {t.admin.users.table.access}
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    Last Active
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    {t.admin.users.table.credits}
                  </th>
                  <th className="px-10 py-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                    {t.admin.users.table.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-10 py-40 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <RefreshCw className="w-12 h-12 animate-spin text-blue-500/20" />
                        <span className="text-zinc-700 font-black uppercase tracking-[0.4em] text-[10px]">
                          {t.admin.users.table.loading}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-10 py-40 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]"
                    >
                      {t.admin.users.table.empty}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-white/2 transition-all duration-500 overflow-hidden relative cursor-pointer"
                    >
                      {/* Select */}
                      <td
                        className="px-6 py-7 text-center w-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="accent-blue-500 w-4 h-4 cursor-pointer"
                          aria-label={`Select ${user.email}`}
                        />
                      </td>
                      {/* Identity */}
                      <td className="px-10 py-7">
                        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 font-black group-hover:scale-110 group-hover:bg-zinc-800 transition-all duration-700 shadow-2xl">
                              {user.email?.[0]?.toUpperCase() || "U"}
                            </div>
                            {(user.last_activity_at ??
                              user.last_prompt_at ??
                              user.last_sign_in_at) && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-zinc-950 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xl font-bold text-white tracking-tight">
                              {user.customer_name || user.email}
                            </span>
                            {user.customer_name && (
                              <span className="text-xs text-zinc-500 font-medium">
                                {user.email}
                              </span>
                            )}
                            <span className="text-[9px] text-zinc-700 font-black uppercase tracking-tighter">
                              ID: {user.id.slice(0, 16)}…
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Tier */}
                      <td className="px-10 py-7">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                              tierColor(user.plan_tier),
                            )}
                          >
                            {user.plan_tier?.toUpperCase() || "FREE"}
                          </span>
                          {user.tags?.includes("churn") && (
                            <span className="px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest">
                              Churn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Access / Role */}
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                              user.role === "admin"
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                : "bg-white/5 border-white/5 text-zinc-500",
                            )}
                          >
                            {user.role?.toUpperCase() || "USER"}
                          </span>
                          {user.is_banned && (
                            <span className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest">
                              Banned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Active — prefer real prompt activity over login */}
                      <td className="px-10 py-7">
                        <div className="flex flex-col gap-1">
                          <div
                            className="flex items-center gap-2 text-emerald-300 font-bold text-sm"
                            title="פעילות אמיתית אחרונה (פרומפט / כניסה)"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-500/70" />
                            {lastActiveLabel(
                              user.last_activity_at ?? user.last_prompt_at ?? user.last_sign_in_at,
                            )}
                          </div>
                          <div
                            className="flex items-center gap-2 text-zinc-500 font-bold text-xs"
                            title="סה״כ פרומפטים שהורצו"
                          >
                            <span className="text-zinc-700">•</span>
                            <span>{user.prompt_count ?? 0} פרומפטים</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600 font-bold text-xs">
                            <Calendar className="w-3 h-3 text-zinc-800" />
                            {new Date(user.created_at).toLocaleDateString("en-US")}
                          </div>
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-lg font-black text-white">
                            {user.credits_balance || 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-10 py-7">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAdmin(user.id, user.role);
                            }}
                            className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all duration-500 scale-90 group-hover:scale-100"
                            title={user.role === "admin" ? "Remove Admin" : "Grant Admin"}
                          >
                            <Crown className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open("mailto:" + user.email);
                            }}
                            className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-white hover:bg-zinc-800 transition-all duration-500 scale-90 group-hover:scale-100"
                            title={`Send email to ${user.email}`}
                          >
                            <Mail className="w-5 h-5" />
                          </button>
                          <Link
                            href={`/admin/users/${user.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 bg-zinc-900 border border-white/5 text-zinc-600 rounded-2xl hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all duration-500 scale-90 group-hover:scale-100"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </Link>
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

function SimpleStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500",
  };

  return (
    <div className="group p-8 rounded-[40px] bg-zinc-950 border border-white/5 flex flex-col gap-6 transition-all duration-700 hover:border-white/10 hover:shadow-2xl">
      <div className="flex justify-between items-start">
        <div
          className={cn(
            "p-4 rounded-2xl border transition-all duration-700 group-hover:text-white shadow-2xl",
            colors[color],
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[8px] font-black text-zinc-700 tracking-[0.2em] uppercase">
          Identity
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2 origin-right leading-none">
          {value}
        </div>
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </div>
  );
}

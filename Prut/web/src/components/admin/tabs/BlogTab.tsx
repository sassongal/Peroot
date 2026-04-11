"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getApiPath } from "@/lib/api-path";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: "draft" | "published";
  category: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export function BlogTab() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/blog"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BlogPost[] = await res.json();
      setPosts(data);
    } catch {
      toast.error("שגיאה בטעינת מאמרים");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function deletePost(id: string) {
    if (!confirm("למחוק את המאמר?")) return;
    try {
      const res = await fetch(getApiPath("/api/admin/blog"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("המאמר נמחק");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("שגיאה במחיקה");
    }
  }

  async function toggleStatus(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    const updates: Record<string, unknown> = { id: post.id, status: newStatus };
    if (newStatus === "published" && !post.published_at) {
      updates.published_at = new Date().toISOString();
    }

    try {
      const res = await fetch(getApiPath("/api/admin/blog"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updatedPost: BlogPost = await res.json();
      toast.success(newStatus === "published" ? "המאמר פורסם" : "המאמר הועבר לטיוטה");
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updatedPost : p)));
    } catch {
      toast.error("שגיאה בעדכון סטטוס");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-500">טוען מאמרים...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">בלוג</h2>
          <p className="text-sm text-slate-500 mt-1">{posts.length} מאמרים</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          מאמר חדש
        </Link>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/2 hover:bg-white/4 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    post.status === "published"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {post.status === "published" ? "מפורסם" : "טיוטה"}
                </span>
                {post.category && (
                  <span className="text-[10px] text-slate-600">{post.category}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white truncate">{post.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {post.slug} · {new Date(post.created_at).toLocaleDateString("he-IL")}
              </p>
            </div>

            <div className="flex items-center gap-1 ms-4">
              <button
                onClick={() => toggleStatus(post)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title={post.status === "published" ? "העבר לטיוטה" : "פרסם"}
              >
                {post.status === "published" ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <Link
                href={`/admin/blog/${post.id}`}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => deletePost(post.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg mb-2">אין מאמרים עדיין</p>
            <Link
              href="/admin/blog/new"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              צור את המאמר הראשון &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

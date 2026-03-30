"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Save, Eye, Globe } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface BlogPostForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  category: string;
  tags: string[];
  thumbnail_url: string;
  status: "draft" | "published";
  read_time: string;
  author: string;
}

const EMPTY_FORM: BlogPostForm = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  meta_title: "",
  meta_description: "",
  category: "מדריכים",
  tags: [],
  thumbnail_url: "",
  status: "draft",
  read_time: "",
  author: "Peroot",
};

function slugify(text: string): string {
  return text
    .replace(/[^\u0590-\u05FF\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
}

export default function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<BlogPostForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (!isNew) loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPost() {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("מאמר לא נמצא");
      router.push("/admin/blog");
      return;
    }

    setForm({
      title: data.title ?? "",
      slug: data.slug ?? "",
      content: data.content ?? "",
      excerpt: data.excerpt ?? "",
      meta_title: data.meta_title ?? "",
      meta_description: data.meta_description ?? "",
      category: data.category ?? "מדריכים",
      tags: data.tags ?? [],
      thumbnail_url: data.thumbnail_url ?? "",
      status: data.status ?? "draft",
      read_time: data.read_time ?? "",
      author: data.author ?? "Peroot",
    });
    setTagsInput((data.tags ?? []).join(", "));
    setLoading(false);
  }

  function updateField<K extends keyof BlogPostForm>(key: K, value: BlogPostForm[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-generate slug from title for new posts
      if (key === "title" && isNew && !prev.slug) {
        updated.slug = slugify(value as string);
      }
      return updated;
    });
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("כותרת ו-slug הם שדות חובה");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (isNew) {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          ...payload,
          published_at: payload.status === "published" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) {
        toast.error("שגיאה ביצירה: " + error.message);
      } else {
        toast.success("המאמר נוצר בהצלחה");
        router.push(`/admin/blog/${data.id}`);
      }
    } else {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          published_at:
            payload.status === "published" && !form.read_time
              ? new Date().toISOString()
              : undefined,
        })
        .eq("id", id);

      if (error) {
        toast.error("שגיאה בשמירה: " + error.message);
      } else {
        toast.success("המאמר עודכן");
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-500">טוען...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div dir="rtl" className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/blog"
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black text-white">
            {isNew ? "מאמר חדש" : "עריכת מאמר"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && form.status === "published" && (
            <Link
              href={`/blog/${form.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              צפייה
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">כותרת</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none text-lg"
              placeholder="כותרת המאמר"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">תוכן (HTML)</label>
            <textarea
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none font-mono text-sm min-h-[400px] resize-y"
              placeholder="<h2>כותרת</h2><p>תוכן המאמר...</p>"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">תקציר</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none text-sm min-h-[80px] resize-y"
              placeholder="תקציר קצר למאמר (מוצג בכרטיס הבלוג)"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              פרסום
            </h3>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value as "draft" | "published")}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
            >
              <option value="draft">טיוטה</option>
              <option value="published">מפורסם</option>
            </select>
          </div>

          {/* Slug */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <label className="block text-xs font-bold text-slate-400">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none"
              placeholder="my-post-slug"
              dir="ltr"
            />
          </div>

          {/* Category */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <label className="block text-xs font-bold text-slate-400">קטגוריה</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              placeholder="מדריכים"
            />
          </div>

          {/* Tags */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <label className="block text-xs font-bold text-slate-400">תגיות (מופרדות בפסיק)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              placeholder="AI, פרומפטים, ChatGPT"
            />
          </div>

          {/* Read Time */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <label className="block text-xs font-bold text-slate-400">זמן קריאה</label>
            <input
              type="text"
              value={form.read_time}
              onChange={(e) => updateField("read_time", e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              placeholder="5 דקות קריאה"
            />
          </div>

          {/* Thumbnail URL */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <label className="block text-xs font-bold text-slate-400">תמונה ראשית (URL)</label>
            <input
              type="text"
              value={form.thumbnail_url}
              onChange={(e) => updateField("thumbnail_url", e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
              placeholder="https://..."
              dir="ltr"
            />
          </div>

          {/* SEO */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <h3 className="text-xs font-bold text-slate-400">SEO</h3>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Meta Title</label>
              <input
                type="text"
                value={form.meta_title}
                onChange={(e) => updateField("meta_title", e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                placeholder="כותרת לגוגל"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Meta Description</label>
              <textarea
                value={form.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none min-h-[60px] resize-y"
                placeholder="תיאור לגוגל"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}

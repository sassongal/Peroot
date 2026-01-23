"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { Edit2, Save, X, History, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Prompt {
  id: string;
  prompt_key: string;
  prompt_content: string;
  version: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface PromptVersion {
  id: string;
  version: number;
  prompt_content: string;
  created_at: string;
}

export default function PromptsAdminPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [versions, setVersions] = useState<Record<string, PromptVersion[]>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadPrompts();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadPrompts() {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_key');

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(promptId: string) {
    try {
      const { data, error } = await supabase
        .from('ai_prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(prev => ({ ...prev, [promptId]: data || [] }));
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  }

  function startEdit(prompt: Prompt) {
    setEditingId(prompt.id);
    setEditContent(prompt.prompt_content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function savePrompt(id: string) {
    if (!user) {
      toast.error('You must be logged in to edit prompts');
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ 
          prompt_content: editContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Prompt updated! New version created.');
      setEditingId(null);
      setEditContent("");
      loadPrompts();
      
      // Invalidate cache
      await fetch('/api/prompts/sync', { method: 'POST' });
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save prompt');
    }
  }

  async function rollbackToVersion(promptId: string, versionContent: string) {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!confirm('Rollback to this version?')) return;

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ 
          prompt_content: versionContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      toast.success('Rolled back to selected version');
      loadPrompts();
      
      await fetch('/api/prompts/sync', { method: 'POST' });
    } catch (error) {
      console.error('Failed to rollback:', error);
      toast.error('Failed to rollback');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Unauthorized</h1>
          <p className="text-slate-400">You must be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">ניהול פרומפטים</h1>
            <p className="text-slate-400">עדכן פרומפטים בלי deployment מחדש</p>
          </div>
        </div>

        <div className="space-y-6">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="glass-card rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{prompt.prompt_key}</h3>
                  <p className="text-xs text-slate-500">
                    Version {prompt.version} • Updated {new Date(prompt.updated_at).toLocaleString('he-IL')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {editingId === prompt.id ? (
                    <>
                      <button
                        onClick={() => savePrompt(prompt.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        שמור
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        ביטול
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(prompt)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        ערוך
                      </button>
                      <button
                        onClick={() => {
                          if (versions[prompt.id]) {
                            setVersions(prev => {
                              const next = { ...prev };
                              delete next[prompt.id];
                              return next;
                            });
                          } else {
                            loadVersions(prompt.id);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4" />
                        היסטוריה
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === prompt.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-96 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-white resize-none focus:outline-none focus:border-white/20"
                  dir="ltr"
                />
              ) : (
                <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap" dir="ltr">
                  {prompt.prompt_content}
                </pre>
              )}

              {versions[prompt.id] && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold mb-3">גרסאות קודמות</h4>
                  <div className="space-y-2">
                    {versions[prompt.id].map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between bg-black/20 rounded-lg p-3"
                      >
                        <div className="text-xs text-slate-400">
                          Version {version.version} • {new Date(version.created_at).toLocaleString('he-IL')}
                        </div>
                        <button
                          onClick={() => rollbackToVersion(prompt.id, version.prompt_content)}
                          className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                        >
                          שחזר
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Edit2, 
  Save, 
  X, 
  History as HistoryIcon, 
  Search, 
  RefreshCw, 
  FileText,
  Clock,
  RotateCcw,
  Zap,
  Cpu
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";

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

import { useI18n } from "@/context/I18nContext";
import { User } from "@supabase/supabase-js";

export default function PromptsAdminPage() {
  const t = useI18n();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [versions, setVersions] = useState<Record<string, PromptVersion[]>>({});
  const [openVersions, setOpenVersions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadPrompts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadPrompts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('prompt_key');

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      toast.error(t.admin.prompts.toasts.load_error);
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
      toast.error(t.admin.prompts.toasts.login_required);
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

      toast.success(t.admin.prompts.toasts.update_success);
      setEditingId(null);
      setEditContent("");
      loadPrompts();
      
      // Invalidate cache
      await fetch(getApiPath('/api/prompts/sync'), { method: 'POST' });

      // Log action
      await supabase.from('activity_logs').insert({
        action: `Prmpt Upd: ${prompts.find(p => p.id === id)?.prompt_key}`,
        entity_type: 'prompt',
        entity_id: id,
        user_id: user.id,
        details: { content: editContent.substring(0, 100) + '...' }
      });

    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(t.admin.prompts.toasts.update_error);
    }
  }

  async function rollbackToVersion(promptId: string, versionContent: string, versionNum: number) {
    if (!user) return;

    if (!confirm(t.admin.prompts.toasts.rollback_confirm.replace('{version}', versionNum.toString()))) return;

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ 
          prompt_content: versionContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId);

      if (error) throw error;

      toast.success(t.admin.prompts.toasts.rollback_success);
      loadPrompts();
      
      await fetch(getApiPath('/api/prompts/sync'), { method: 'POST' });

      // Log action
      await supabase.from('activity_logs').insert({
        action: `Prmpt Rollback: v${versionNum}`,
        entity_type: 'prompt',
        entity_id: promptId,
        user_id: user.id
      });
    } catch (error) {
      console.error('Failed to rollback:', error);
      toast.error(t.admin.prompts.toasts.rollback_error);
    }
  }

  const filteredPrompts = prompts.filter(p => 
    p.prompt_key.toLowerCase().includes(search.toLowerCase()) ||
    p.prompt_content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[32px] border border-white/5">
          <div className="space-y-2">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">
               System Prompts
            </h1>
            <p className="text-zinc-500 font-medium tracking-wide">{t.admin.prompts.title_desc}</p>
          </div>
          <div className="flex gap-4">
             <Link href="/admin/engines" className="px-6 py-3 bg-white/[0.03] border border-white/5 text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 rounded-2xl hover:bg-white/5 transition-all">
                <Cpu className="w-4 h-4" />
                Logic Engines
             </Link>
          </div>
        </div>

        {/* Search & Stats */}
        <div className="flex flex-col lg:flex-row gap-6">
           <div className="flex-1 relative group">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.admin.prompts.search_placeholder}
                className="w-full pr-14 pl-6 py-5 bg-zinc-950 border border-white/5 rounded-[24px] text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/30 transition-all font-bold"
              />
           </div>
           
           <div className="flex gap-4">
              <div className="px-8 py-5 bg-zinc-950 border border-white/5 rounded-[24px] flex items-center gap-4">
                 <Zap className="w-6 h-6 text-blue-500" />
                 <div>
                    <div className="text-2xl font-black text-white leading-none">{prompts.length}</div>
                    <div className="text-[9px] uppercase font-black text-zinc-600 tracking-widest mt-1">Modules</div>
                 </div>
              </div>
              <button 
                onClick={loadPrompts}
                className="p-5 bg-zinc-950 border border-white/5 rounded-[24px] hover:bg-white/[0.03] transition-all active:scale-95 group"
              >
                 <RefreshCw className={cn("w-6 h-6 text-zinc-600 group-hover:text-white", loading && "animate-spin")} />
              </button>
           </div>
        </div>

        {loading ? (
           <div className="py-40 flex flex-col items-center justify-center gap-6">
              <RefreshCw className="w-12 h-12 animate-spin text-blue-500/20" />
              <span className="text-zinc-700 font-black uppercase tracking-[0.4em] text-[10px]">Synchronizing...</span>
           </div>
        ) : (
          <div className="space-y-8">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="group relative rounded-[40px] border border-white/5 bg-zinc-950 p-1 transition-all duration-700 hover:border-white/10 hover:shadow-3xl"
              >
                <div className="bg-zinc-950 rounded-[38px] p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                    <div className="flex items-center gap-6">
                       <div className="p-5 rounded-[24px] bg-zinc-900 border border-white/5 shadow-2xl group-hover:scale-110 transition-transform">
                          <FileText className="w-8 h-8 text-blue-500" />
                       </div>
                       <div className="space-y-1">
                         <h3 className="text-3xl font-black text-white tracking-tighter">{prompt.prompt_key}</h3>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase border border-blue-500/10">
                               v{prompt.version}
                            </div>
                            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest flex items-center gap-2">
                               <Clock className="w-3.5 h-3.5" />
                               {new Date(prompt.updated_at).toLocaleString(t.locale === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                         </div>
                       </div>
                    </div>

                    <div className="flex gap-3">
                      {editingId === prompt.id ? (
                        <>
                          <button
                            onClick={() => savePrompt(prompt.id)}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-900/20 transition-all active:scale-95"
                          >
                            <Save className="w-4 h-4" />
                            {t.admin.prompts.save_changes}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-8 py-3 bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                          >
                            <X className="w-4 h-4" />
                            {t.admin.prompts.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(prompt)}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t.admin.prompts.edit_model}
                          </button>
                          <button
                            onClick={() => {
                              if (openVersions[prompt.id]) {
                                setOpenVersions(prev => ({ ...prev, [prompt.id]: false }));
                              } else {
                                loadVersions(prompt.id);
                                setOpenVersions(prev => ({ ...prev, [prompt.id]: true }));
                              }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5",
                                openVersions[prompt.id] 
                                    ? "bg-blue-600 text-white shadow-3xl shadow-blue-600/20" 
                                    : "bg-white/[0.03] text-zinc-500 hover:text-white"
                            )}
                          >
                            <HistoryIcon className="w-4 h-4" />
                            {t.admin.prompts.history}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId === prompt.id ? (
                    <div className="relative animate-in zoom-in-95 duration-500">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full h-[600px] bg-zinc-950 border border-white/5 rounded-[32px] p-10 text-base font-mono text-emerald-500/90 resize-none focus:outline-none focus:border-blue-500/30 leading-relaxed shadow-inner"
                          dir="ltr"
                        />
                        <div className="absolute top-6 right-8 text-[9px] font-black text-zinc-700 bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5">
                            LIVE LOGIC EDITOR
                        </div>
                    </div>
                  ) : (
                    <div className="relative group/content bg-zinc-900/50 rounded-[32px] border border-white/5 p-1">
                        <pre className="bg-zinc-950/80 rounded-[30px] p-10 text-xs font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed custom-scrollbar">
                          {prompt.prompt_content}
                        </pre>
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none rounded-b-[32px]" />
                    </div>
                  )}

                  {openVersions[prompt.id] && (
                    <div className="mt-10 pt-10 border-t border-white/5 space-y-4 animate-in slide-in-from-top-6 duration-700">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                               <HistoryIcon className="w-5 h-5" />
                            </div>
                            <h4 className="text-xl font-black text-white tracking-tight">Version Archive</h4>
                         </div>
                         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Global Backup Stream</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {versions[prompt.id]?.map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-[24px] p-6 transition-all group/version"
                          >
                            <div className="flex items-center gap-8">
                                <div className="text-lg font-black text-zinc-700 w-12">v{version.version}</div>
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                   {new Date(version.created_at).toLocaleString(t.locale === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}
                                </div>
                            </div>
                            <button
                              onClick={() => rollbackToVersion(prompt.id, version.prompt_content, version.version)}
                              className="flex items-center gap-3 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all scale-0 group-hover/version:scale-100 shadow-2xl"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Restore Pipeline
                            </button>
                          </div>
                        ))}
                        {(!versions[prompt.id] || versions[prompt.id].length === 0) && (
                            <div className="text-center py-20 text-zinc-800 font-black uppercase tracking-[0.3em] text-[9px]">Archived data is unavailable for this module</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

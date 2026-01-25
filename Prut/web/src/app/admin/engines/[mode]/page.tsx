"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Save, 
  ArrowLeft, 
  Play, 
  RefreshCw, 
  Terminal, 
  Cpu, 
  Shield, 
  Variable, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Wand2,
  Settings,
  Database,
  LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EngineConfig {
  id: string;
  mode: string;
  name: string;
  description: string;
  system_prompt_template: string;
  user_prompt_template: string;
  default_params: Record<string, unknown>;
}

export default function EngineEditorPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = use(params);
  const router = useRouter();
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Test Playground State
  const [testInput, setTestInput] = useState("עיצוב לוגו לחברת סטארטאפ בתחום הסייבר");
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [debugPrompts, setDebugPrompts] = useState<{ system?: string; user?: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prompt_engines")
        .select("*")
        .eq("mode", mode)
        .single();
      
      if (error || !data) {
        toast.error("Subsystem not found");
        router.push("/admin/engines");
        return;
      }
      setConfig(data);
      setLoading(false);
    };
    fetchConfig();
  }, [mode, router]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from("prompt_engines")
        .update({
          system_prompt_template: config.system_prompt_template,
          user_prompt_template: config.user_prompt_template,
          description: config.description,
          name: config.name,
          updated_at: new Date().toISOString()
        })
        .eq("id", config.id);

      if (error) throw error;

      // Invalidate logic cache
      await fetch('/api/prompts/sync', { method: 'POST' });

      toast.success("Logic Core Synchronized");

      await supabase.from('activity_logs').insert({
        action: `עדכון ליבת מנוע: ${config.mode}`,
        entity_type: 'engine',
        entity_id: config.id,
        details: { mode: config.mode }
      });

    } catch (e) {
      toast.error("Synchronization failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    setTesting(true);
    setTestOutput("");
    try {
      const res = await fetch("/api/admin/test-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: testInput,
          mode: config.mode,
          customSystemPrompt: config.system_prompt_template,
          customUserPrompt: config.user_prompt_template
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestOutput(data.output);
        setDebugPrompts(data.debug);
        toast.success("Simulation Complete");
      } else {
         setTestOutput(data.error || "Simulation Error");
      }
    } catch (e) {
      setTestOutput("Fatal simulation error");
    }
    setTesting(false);
  };

  const extractVars = (str: string) => {
      const matches = str.match(/\{\{\s*(\w+)\s*\}\}/g);
      return Array.from(new Set(matches?.map(m => m.replace(/\{\{\s*|\s*\}\}/g, '')) || []));
  };

  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black">
          <Cpu className="w-12 h-12 text-blue-500 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Accessing Logic Core...</span>
      </div>
  );
  if (!config) return null;

  const systemVars = extractVars(config.system_prompt_template);
  const userVars = extractVars(config.user_prompt_template);

  return (
    <div className="min-h-screen space-y-10 animate-in fade-in duration-1000 pb-20 select-none pb-40" dir="rtl">
      
      {/* Nexus Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 bg-zinc-950/50 p-8 rounded-[40px] border border-white/5">
        <div className="flex items-center gap-8">
           <Link href="/admin/engines" className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all active:scale-90">
             <ArrowLeft className="w-6 h-6 rtl-flip" />
           </Link>
           <div className="space-y-2">
              <div className="flex items-center gap-3">
                 <Cpu className="w-4 h-4 text-emerald-500" />
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Logic Hub v2.1</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">
                {config.name}
              </h1>
              <div className="text-xs font-mono text-zinc-600 uppercase">SYSTEM_NODE_{config.mode.toUpperCase()}</div>
           </div>
        </div>

        <div className="flex gap-4">
           <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
           >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>Sync Core</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Editor Area */}
        <div className="xl:col-span-7 space-y-10">
           
           {/* General Config */}
           <div className="p-8 rounded-[32px] border border-white/5 bg-zinc-950/30 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <Settings className="w-4 h-4 text-zinc-500" />
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Metadata</span>
              </div>
              <div className="space-y-4">
                 <label className="block text-[10px] font-black text-zinc-700 uppercase tracking-widest mr-2">Subsystem Description</label>
                 <input 
                   value={config.description}
                   onChange={e => setConfig({...config, description: e.target.value})}
                   className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-5 text-zinc-300 font-bold focus:border-white/10 outline-none transition-all"
                   placeholder="Enter engine description..."
                 />
              </div>
           </div>

           {/* System Prompt Module */}
           <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                 <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Master Instructions (System)</span>
                 </div>
                 <div className="flex gap-2">
                    {systemVars.map(v => (
                       <span key={v} className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 uppercase">
                          {v}
                       </span>
                    ))}
                 </div>
              </div>
              <div className="relative group">
                 <textarea
                   value={config.system_prompt_template}
                   onChange={e => setConfig({...config, system_prompt_template: e.target.value})}
                   className="w-full min-h-[400px] bg-zinc-950 border border-white/5 rounded-[40px] p-10 font-mono text-sm text-zinc-400 focus:text-white focus:border-purple-500/30 outline-none leading-relaxed resize-none shadow-inner transition-all duration-700"
                   dir="ltr"
                 />
                 <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-500 hover:text-white transition-all"><Copy className="w-4 h-4" /></button>
                 </div>
              </div>
           </div>

           {/* User Prompt Module */}
           <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                 <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Entry Vector (User)</span>
                 </div>
                 <div className="flex gap-2">
                    {userVars.map(v => (
                       <span key={v} className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase">
                          {v}
                       </span>
                    ))}
                 </div>
              </div>
              <textarea
                value={config.user_prompt_template}
                onChange={e => setConfig({...config, user_prompt_template: e.target.value})}
                className="w-full min-h-[120px] bg-zinc-950 border border-white/5 rounded-[32px] p-8 font-mono text-sm text-zinc-400 focus:text-white focus:border-blue-500/30 outline-none resize-none transition-all duration-700"
                dir="ltr"
              />
           </div>
        </div>

        {/* Intelligence Playground */}
        <div className="xl:col-span-5 space-y-10">
           <div className="p-10 rounded-[40px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl sticky top-10 space-y-10 shadow-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
              
              <div className="flex items-center justify-between relative">
                 <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-zinc-900 border border-white/5">
                       <Play className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white tracking-tight">Simulator</h3>
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Real-time inference test</p>
                    </div>
                 </div>
                 <button 
                    onClick={handleTest}
                    disabled={testing}
                    className="p-5 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
                 >
                    {testing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mr-2">Simulation Input</label>
                    <textarea 
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        className="w-full h-32 bg-zinc-900/50 border border-white/5 rounded-3xl p-6 text-sm text-zinc-300 focus:border-blue-500/20 outline-none resize-none transition-all"
                        dir="rtl"
                        placeholder="Enter test prompt..."
                    />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mr-2">Neural Output</label>
                    <div className="w-full min-h-[300px] max-h-[500px] bg-black/80 border border-white/5 rounded-3xl p-8 font-mono text-xs text-zinc-500 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner" dir="ltr">
                        {testOutput ? (
                           <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-zinc-300">
                              {testOutput}
                           </div>
                        ) : (
                           <span className="opacity-20 italic">Awaiting simulation run...</span>
                        )}
                    </div>
                 </div>

                 {debugPrompts && (
                    <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                       <DebugModule label="SYS_PRMT" lines={debugPrompts.system?.length || 0} />
                       <DebugModule label="USR_PRMT" lines={debugPrompts.user?.length || 0} />
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function DebugModule({ label, lines }: { label: string; lines: number }) {
   return (
      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center justify-between">
         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
         <span className="text-[10px] font-black text-blue-500">{lines} BYTES</span>
      </div>
   );
}


"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, ArrowLeft, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CapabilityMode } from "@/lib/capability-mode";

interface EngineConfig {
  id: string;
  mode: string;
  name: string;
  description: string;
  system_prompt_template: string;
  user_prompt_template: string;
  default_params: any;
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

  useEffect(() => {
    const fetchConfig = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prompt_engines")
        .select("*")
        .eq("mode", mode)
        .single();
      
      if (error || !data) {
        toast.error("מנוע לא נמצא");
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

    if (error) {
      toast.error("שגיאה בשמירה");
    } else {
      toast.success("נשמר בהצלחה");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!config) return;
    setTesting(true);
    setTestOutput("");
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: testInput,
          tone: "Professional",
          category: "General",
          capability_mode: config.mode
        })
      });
      const data = await res.json();
      if (data.great_prompt) {
        setTestOutput(data.great_prompt);
      } else {
         setTestOutput(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setTestOutput("Error: " + (e as Error).message);
    }
    setTesting(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!config) return null;

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/engines" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
             <h1 className="text-2xl font-bold flex items-center gap-3">
               {config.name}
               <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                 {config.mode}
               </span>
             </h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>שמור שינויים</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Editor Column */}
        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
            
            <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 space-y-2">
                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">תיאור המנוע</label>
                <input 
                  value={config.description}
                  onChange={e => setConfig({...config, description: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-300 placeholder:text-slate-600"
                />
            </div>

            <div className="flex flex-col gap-2 flex-1">
                <label className="text-xs text-purple-400 uppercase font-bold tracking-wider flex justify-between">
                    <span>System Prompt Template</span>
                    <span className="text-[10px] opacity-70">תומך ב- {'{{tone}}, {{category}}'}</span>
                </label>
                <textarea
                  value={config.system_prompt_template}
                  onChange={e => setConfig({...config, system_prompt_template: e.target.value})}
                  className="w-full flex-1 min-h-[300px] bg-zinc-950/80 border border-white/10 rounded-xl p-4 font-mono text-sm text-emerald-300 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none leading-relaxed resize-none"
                  dir="ltr"
                />
            </div>

            <div className="flex flex-col gap-2 h-[150px]">
                <label className="text-xs text-blue-400 uppercase font-bold tracking-wider flex justify-between">
                   <span>User Prompt Template</span>
                   <span className="text-[10px] opacity-70">תומך ב- {'{{input}}'}</span>
                </label>
                <textarea
                  value={config.user_prompt_template}
                  onChange={e => setConfig({...config, user_prompt_template: e.target.value})}
                  className="w-full h-full bg-zinc-950/80 border border-white/10 rounded-xl p-4 font-mono text-sm text-blue-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none resize-none"
                  dir="ltr"
                />
            </div>
        </div>

        {/* Playground Column */}
        <div className="flex flex-col gap-4 bg-zinc-900/30 border-r border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-yellow-400" />
                <h3 className="font-bold text-slate-200">Test Playground</h3>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs text-slate-500">קלט לבדיקה (User Input)</label>
                <textarea 
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:border-yellow-500/30 outline-none resize-none"
                    dir="rtl"
                />
            </div>

            <button
                onClick={handleTest}
                disabled={testing}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-bold transition-all"
            >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>הרץ בדיקה</span>
            </button>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                 <label className="text-xs text-slate-500">פלט המנוע (Output)</label>
                 <div className="flex-1 bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-y-auto whitespace-pre-wrap" dir="ltr">
                     {testOutput || <span className="text-slate-700 italic">התוצאה תופיע כאן...</span>}
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
}

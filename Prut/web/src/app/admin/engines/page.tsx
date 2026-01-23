
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Zap, Search, Image as ImageIcon, Bot } from "lucide-react";
import Link from "next/link";
import { CapabilityMode } from "@/lib/capability-mode";

interface EngineRow {
  id: string;
  mode: string;
  name: string;
  description: string;
  is_active: boolean;
  updated_at: string;
}

const MODE_ICONS: Record<string, any> = {
  [CapabilityMode.STANDARD]: Zap,
  [CapabilityMode.DEEP_RESEARCH]: Search,
  [CapabilityMode.IMAGE_GENERATION]: ImageIcon,
  [CapabilityMode.AGENT_BUILDER]: Bot,
};

export default function EnginesListPage() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngines = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prompt_engines")
        .select("*")
        .order("mode");
      
      if (!error && data) {
        setEngines(data);
      }
      setLoading(false);
    };
    fetchEngines();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">מנועי פרומפט</h2>
          <p className="text-slate-400 mt-2">נהל את הלוגיקה וההנחיות של כל מנוע במערכת</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {engines.map((engine) => {
          const Icon = MODE_ICONS[engine.mode] || Zap;
          return (
            <Link 
              key={engine.id} 
              href={`/admin/engines/${engine.mode}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-900 transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-900/20"
            >
              <div className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-zinc-800 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors">
                      {engine.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${engine.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                      {engine.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                    {engine.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>עודכן: {new Date(engine.updated_at).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

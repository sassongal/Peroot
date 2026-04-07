"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { Sparkles, BookOpen, AlertTriangle, CheckCircle2, Image as ImageIcon, Video, FileText, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface SkillExample {
  concept: string;
  output: string;
  category?: string;
}

interface SkillMistake {
  bad: string;
  good: string;
  why: string;
}

interface PlatformSkill {
  platform: string;
  name: string;
  examples: SkillExample[];
  mistakes?: SkillMistake[];
  scoringCriteria?: string[];
}

interface SkillSummary {
  type: 'image' | 'video' | 'text';
  platform: string;
  name: string;
  exampleCount: number;
  mistakeCount: number;
  scoringCount: number;
  skill: PlatformSkill;
}

interface SkillsResponse {
  skills: SkillSummary[];
  stats: {
    totalSkills: number;
    totalExamples: number;
    totalMistakes: number;
    totalScoring: number;
    byType: { image: number; video: number; text: number };
  };
}

type FilterType = 'all' | 'image' | 'video' | 'text';

export default function SkillsPage() {
  const [data, setData] = useState<SkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSkill, setSelectedSkill] = useState<SkillSummary | null>(null);
  const [section, setSection] = useState<'examples' | 'mistakes' | 'scoring'>('examples');
  const [expandedExample, setExpandedExample] = useState<number | null>(0);

  useEffect(() => {
    fetch('/api/admin/skills')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
          if (data.skills?.length > 0) setSelectedSkill(data.skills[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredSkills = data?.skills.filter(s => filter === 'all' || s.type === filter) || [];

  const typeIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-3.5 h-3.5" />;
    if (type === 'video') return <Video className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  const typeColor = (type: string) => {
    if (type === 'image') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (type === 'video') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500/40" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-32 text-red-400">Error: {error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">
              Skills Library
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">מאגר הסקילס של המנועים</h1>
          <p className="text-white/60 text-sm max-w-2xl">
            סקילים הם תבניות למידה מודולריות שמזריקות דוגמאות איכותיות, טעויות נפוצות וקריטריוני איכות למנועי ה-AI. מאגר לקריאה בלבד - לעריכה דרשו שינוי בקוד.
          </p>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">סה״כ סקילים</div>
              <div className="text-2xl font-black text-white">{data.stats.totalSkills}</div>
              <div className="text-xs text-white/50 mt-1">
                {data.stats.byType.image} תמונה · {data.stats.byType.video} וידאו · {data.stats.byType.text} טקסט
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">דוגמאות</div>
              <div className="text-2xl font-black text-emerald-300">{data.stats.totalExamples}</div>
            </div>
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">טעויות נפוצות</div>
              <div className="text-2xl font-black text-red-300">{data.stats.totalMistakes}</div>
            </div>
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">קריטריונים</div>
              <div className="text-2xl font-black text-amber-300">{data.stats.totalScoring}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'text', 'image', 'video'] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                filter === t
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
              )}
            >
              {t === 'all' ? 'הכל' : t === 'image' ? 'תמונה' : t === 'video' ? 'וידאו' : 'טקסט'}
            </button>
          ))}
        </div>

        {/* Main content — skill list + detail */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Skill list */}
          <div className="space-y-2">
            {filteredSkills.map(s => (
              <button
                key={`${s.type}-${s.platform}`}
                onClick={() => setSelectedSkill(s)}
                className={cn(
                  "w-full text-right p-3 rounded-xl border transition-all",
                  selectedSkill?.platform === s.platform && selectedSkill?.type === s.type
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border", typeColor(s.type))}>
                    {typeIcon(s.type)}
                    {s.type}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 flex gap-3">
                  <span>{s.exampleCount} דוגמאות</span>
                  <span>{s.mistakeCount} טעויות</span>
                  <span>{s.scoringCount} קריטריונים</span>
                </div>
              </button>
            ))}
          </div>

          {/* Skill detail */}
          {selectedSkill && (
            <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white">{selectedSkill.name}</h2>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">
                    platform: <span className="text-amber-400 font-mono">{selectedSkill.platform}</span>
                  </div>
                </div>
                <span className={cn("flex items-center gap-1.5 px-2 py-1 rounded border text-xs", typeColor(selectedSkill.type))}>
                  {typeIcon(selectedSkill.type)}
                  {selectedSkill.type}
                </span>
              </div>

              {/* Section tabs */}
              <div className="flex gap-2">
                {([
                  { id: 'examples' as const, label: 'דוגמאות', count: selectedSkill.exampleCount, icon: BookOpen, color: 'emerald' },
                  { id: 'mistakes' as const, label: 'טעויות', count: selectedSkill.mistakeCount, icon: AlertTriangle, color: 'red' },
                  { id: 'scoring' as const, label: 'קריטריונים', count: selectedSkill.scoringCount, icon: CheckCircle2, color: 'amber' },
                ]).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSection(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        section === tab.id
                          ? `bg-${tab.color}-500/20 text-${tab.color}-300 border border-${tab.color}-500/40`
                          : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              {/* Section content */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {section === 'examples' && selectedSkill.skill.examples.map((ex, i) => {
                  const isExpanded = expandedExample === i;
                  return (
                    <div key={i} className="rounded-lg bg-black/30 border border-white/5">
                      <button
                        onClick={() => setExpandedExample(isExpanded ? null : i)}
                        className="w-full text-right p-3 flex items-start gap-2"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 text-right">
                          <div className="text-xs font-bold text-white/80">דוגמה {i + 1}: {ex.concept}</div>
                          {ex.category && (
                            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 font-mono">{ex.category}</span>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-white/5">
                          <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1 pt-2">Output:</div>
                          <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono bg-black/50 p-3 rounded border border-white/5 max-h-96 overflow-y-auto leading-relaxed">
                            {ex.output}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}

                {section === 'mistakes' && selectedSkill.skill.mistakes?.map((m, i) => (
                  <div key={i} className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 space-y-2">
                    <div>
                      <div className="text-[10px] font-bold text-red-400 uppercase mb-1">❌ לא טוב</div>
                      <div className="text-xs text-white/70 font-mono">{m.bad}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">✓ טוב</div>
                      <div className="text-xs text-white/70 font-mono">{m.good}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">למה</div>
                      <div className="text-xs text-white/60">{m.why}</div>
                    </div>
                  </div>
                ))}

                {section === 'scoring' && selectedSkill.skill.scoringCriteria?.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="text-xs text-white/80">{c}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

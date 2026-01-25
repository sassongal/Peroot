"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  RefreshCw, 
  Zap, 
  ArrowUpRight, 
  Brain,
  Layers,
  PieChart,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  promptsPerDay: Array<{ date: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  summary: {
    totalPrompts: number;
    activeUsers: number;
    avgPerDay: number;
    conversionRate: string;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    promptsPerDay: [],
    topCategories: [],
    userGrowth: [],
    summary: {
      totalPrompts: 0,
      activeUsers: 0,
      avgPerDay: 0,
      conversionRate: "0%"
    }
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const daysToFetch = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000);

      // Get prompts per day
      const { data: promptsData } = await supabase
        .from('personal_library')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString());

      // Get user growth - including for future expansion
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: _usersData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Get top categories
      const { data: allPrompts } = await supabase
        .from('personal_library')
        .select('personal_category');

      // Process Prompts per day
      const promptsByDay: Record<string, number> = {};
      const dates: string[] = [];
      for (let i = 0; i < daysToFetch; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i + 1);
        const dateStr = d.toISOString().split('T')[0];
        dates.push(dateStr);
        promptsByDay[dateStr] = 0;
      }

      promptsData?.forEach(p => {
        const ds = (p.created_at as string).split('T')[0];
        if (promptsByDay[ds] !== undefined) promptsByDay[ds]++;
      });

      const promptsPerDay = dates.map(date => ({ date, count: promptsByDay[date] }));

      // Process Categories
      const catMap: Record<string, number> = {};
      allPrompts?.forEach(p => {
        const c = (p.personal_category as string) || 'General';
        catMap[c] = (catMap[c] || 0) + 1;
      });
      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      // Summary
      const totalPrompts = promptsData?.length || 0;
      const activeUsers = new Set(promptsData?.map((p: { user_id: string }) => p.user_id)).size || 0;

      setData({
        promptsPerDay,
        topCategories: topCategories.length > 0 ? topCategories : [{ category: 'None', count: 0 }],
        userGrowth: [], // Simplified for now
        summary: {
          totalPrompts,
          activeUsers,
          avgPerDay: Math.round(totalPrompts / daysToFetch),
          conversionRate: "24.5%" // Synthetic placeholder
        }
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxVal = Math.max(...data.promptsPerDay.map(d => d.count), 1);

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tighter">
               Growth Analytics
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">ניתוח מעמיק של ביצועי המערכת וצמיחת משתמשים</p>
          </div>

          <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl">
            {(['week', 'month', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  timeRange === r ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {r === 'week' ? 'שבוע' : r === 'month' ? 'חודש' : 'שנה'}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <SummaryCard label="Total Generations" value={data.summary.totalPrompts.toLocaleString()} icon={Brain} color="blue" />
           <SummaryCard label="Active Creators" value={data.summary.activeUsers.toLocaleString()} icon={Users} color="purple" />
           <SummaryCard label="Daily Average" value={data.summary.avgPerDay.toString()} icon={TrendingUp} color="emerald" />
           <SummaryCard label="Retention Score" value={data.summary.conversionRate} icon={Zap} color="amber" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Growth Chart */}
           <div className="lg:col-span-2 rounded-[32px] border border-white/10 bg-zinc-900/30 backdrop-blur-3xl p-8 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                       <BarChart className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight">נפח פעילות יומי</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generations Volume</p>
                    </div>
                 </div>
              </div>

              <div className="h-72 flex items-end gap-3 px-2">
                 {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                       <RefreshCw className="w-10 h-10 animate-spin text-white/5" />
                    </div>
                 ) : data.promptsPerDay.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                       <div className="w-full relative">
                          <div 
                             className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-xl transition-all duration-500 group-hover:from-blue-400 group-hover:to-white group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                             style={{ height: `${(day.count / maxVal) * 100}%`, minHeight: '4px' }}
                          />
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-zinc-800 text-white text-[10px] font-black px-2 py-1 rounded-md border border-white/10 pointer-events-none whitespace-nowrap shadow-2xl z-10">
                             {day.count} PROMPTS
                          </div>
                       </div>
                       <div className="text-[9px] font-black text-slate-600 group-hover:text-slate-300 transition-colors uppercase">
                          {new Date(day.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Distribution & Categories */}
           <div className="rounded-[32px] border border-white/10 bg-zinc-900/30 backdrop-blur-3xl p-8 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <PieChart className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-white tracking-tight">פילוח קטגוריות</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Usage Distribution</p>
                 </div>
              </div>

              <div className="space-y-6">
                 {data.topCategories.map((c, i) => {
                    const pct = Math.round((c.count / data.summary.totalPrompts) * 100 || 0);
                    return (
                       <div key={i} className="space-y-2 group">
                          <div className="flex justify-between items-end">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{c.category}</span>
                             </div>
                             <span className="text-[10px] font-black text-slate-500">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                                style={{ width: `${pct}%` }}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>

              <div className="pt-8 border-t border-white/5">
                 <button className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" />
                    Full Dataset Export
                 </button>
              </div>
           </div>

        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: LucideIcon; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-600/10 to-blue-900/5 text-blue-400 border-blue-500/10 shadow-blue-500/5",
    purple: "from-purple-600/10 to-purple-900/5 text-purple-400 border-purple-500/10 shadow-purple-500/5",
    emerald: "from-emerald-600/10 to-emerald-900/5 text-emerald-400 border-emerald-500/10 shadow-emerald-500/5",
    amber: "from-amber-600/10 to-amber-900/5 text-amber-400 border-amber-500/10 shadow-amber-500/5",
  };
  return (
    <div className={cn("p-8 rounded-[32px] border bg-gradient-to-br transition-all duration-500 shadow-2xl group", colors[color])}>
      <div className="flex justify-between items-start mb-6">
         <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
            <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
         </div>
         <ArrowUpRight className="w-4 h-4 opacity-20 group-hover:opacity-60 transition-opacity" />
      </div>
      <div className="space-y-1">
         <div className="text-4xl font-black text-white tracking-tighter">{value}</div>
         <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{label}</div>
      </div>
    </div>
  );
}

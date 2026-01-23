"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { BarChart, TrendingUp, Clock, Users } from "lucide-react";

interface AnalyticsData {
  promptsPerDay: Array<{ date: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  userGrowth: Array<{ date: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    promptsPerDay: [],
    topCategories: [],
    userGrowth: []
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const supabase = createClient();

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  async function loadAnalytics() {
    try {
      const daysToFetch = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const startDate = new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000);

      // Get prompts per day
      const { data: promptsData } = await supabase
        .from('personal_library')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Group by day
      const promptsByDay: Record<string, number> = {};
      const dates: string[] = [];
      
      for (let i = 0; i < daysToFetch; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push(dateStr);
        promptsByDay[dateStr] = 0;
      }

      promptsData?.forEach(p => {
        const dateStr = p.created_at.split('T')[0];
        if (promptsByDay[dateStr] !== undefined) {
          promptsByDay[dateStr]++;
        }
      });

      const promptsPerDay = dates.map(date => ({
        date,
        count: promptsByDay[date] || 0
      }));

      // Get top categories (from personal_library use_case or category field)
      const { data: allPrompts } = await supabase
        .from('personal_library')
        .select('personal_category');

      const categoryCounts: Record<string, number> = {};
      allPrompts?.forEach(p => {
        const cat = p.personal_category || 'כללי';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      // Get user growth
      const { data: usersData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      const usersByDay: Record<string, number> = {};
      dates.forEach(date => { usersByDay[date] = 0; });

      usersData?.forEach(u => {
        const dateStr = u.created_at.split('T')[0];
        if (usersByDay[dateStr] !== undefined) {
          usersByDay[dateStr]++;
        }
      });

      const userGrowth = dates.map(date => ({
        date,
        count: usersByDay[date] || 0
      }));

      setData({
        promptsPerDay,
        topCategories: topCategories.length > 0 ? topCategories : [
          { category: 'אין נתונים', count: 0 }
        ],
        userGrowth
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  const maxPrompts = Math.max(...data.promptsPerDay.map(d => d.count));

  return (
    <AdminLayout>
      <div className="space-y-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">סטטיסטיקות ואנליטיקס</h1>
            <p className="text-slate-400">מעקב אחר שימוש במערכת</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === 'week' ? 'שבוע' : range === 'month' ? 'חודש' : 'שנה'}
              </button>
            ))}
          </div>
        </div>

        {/* Prompts Per Day Chart */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold">פרומפטים ליום</h2>
          </div>

          <div className="h-64 flex items-end gap-2">
            {data.promptsPerDay.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative group">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-300"
                    style={{ height: `${(day.count / maxPrompts) * 100}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-xs whitespace-nowrap">
                    {day.count} פרומפטים
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(day.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold">קטגוריות מובילות</h2>
            </div>

            <div className="space-y-3">
              {data.topCategories.map((category, index) => {
                const maxCount = data.topCategories[0].count;
                const percentage = (category.count / maxCount) * 100;
                
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{category.category}</span>
                      <span className="text-sm font-medium">{category.count}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Growth */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">משתמשים חדשים</h2>
            </div>

            <div className="space-y-2">
              {data.userGrowth.map((day, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm">
                      {new Date(day.date).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-green-400">+{day.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

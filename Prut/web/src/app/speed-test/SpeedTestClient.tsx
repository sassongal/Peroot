"use client";

import { useState, useCallback } from "react";
import { Loader2, Gauge, Eye, Shield, Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface SpeedResult {
  url: string;
  fetchTime: string;
  strategy: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  coreWebVitals: Record<string, string>;
  coreWebVitalsScores: Record<string, number | null>;
  opportunities: { title: string; description: string; savings?: string }[];
}

function ScoreCircle({ score, label, icon: Icon }: { score: number; label: string; icon: React.ElementType }) {
  const color =
    score >= 90 ? "text-green-500 border-green-500/30" :
    score >= 50 ? "text-amber-500 border-amber-500/30" :
    "text-red-500 border-red-500/30";

  const bgColor =
    score >= 90 ? "bg-green-500/10" :
    score >= 50 ? "bg-amber-500/10" :
    "bg-red-500/10";

  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${color} ${bgColor}`}>
      <div className={`relative w-20 h-20 flex items-center justify-center rounded-full border-4 ${color}`}>
        <span className="text-2xl font-bold">{score}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="w-4 h-4" />
        {label}
      </div>
    </div>
  );
}

function MetricRow({ label, value, score }: { label: string; value: string; score?: number | null }) {
  const StatusIcon = score === null || score === undefined ? AlertTriangle :
    score >= 0.9 ? CheckCircle :
    score >= 0.5 ? AlertTriangle : XCircle;

  const statusColor = score === null || score === undefined ? "text-[var(--text-muted)]" :
    score >= 0.9 ? "text-green-500" :
    score >= 0.5 ? "text-amber-500" : "text-red-500";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--glass-border)]">
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <span className="text-sm font-mono font-medium">{value}</span>
    </div>
  );
}

export function SpeedTestClient() {
  const [url, setUrl] = useState("https://peroot.space");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    // Auto-prefix https:// if user omitted the scheme
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/speed-test?url=${encodeURIComponent(normalized)}&strategy=${strategy}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to run speed test");
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [url, strategy]);

  const metricLabels: Record<string, string> = {
    lcp: "Largest Contentful Paint (LCP)",
    fcp: "First Contentful Paint (FCP)",
    cls: "Cumulative Layout Shift (CLS)",
    si: "Speed Index",
    tbt: "Total Blocking Time (TBT)",
    tti: "Time to Interactive (TTI)",
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#E17100]/50 font-mono text-sm"
          onKeyDown={(e) => e.key === "Enter" && !loading && runTest()}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setStrategy(strategy === "mobile" ? "desktop" : "mobile")}
            className="px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm hover:bg-[var(--glass-bg-hover)] transition-colors"
            title={`החלף ל-${strategy === "mobile" ? "Desktop" : "Mobile"}`}
          >
            {strategy === "mobile" ? "Mobile" : "Desktop"}
          </button>
          <button
            onClick={runTest}
            disabled={loading || !url.trim()}
            className="px-6 py-3 rounded-xl bg-[#E17100] text-white font-medium text-sm hover:bg-[#c96300] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                בודק...
              </>
            ) : (
              "בדוק מהירות"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-[var(--text-muted)]">
          <Loader2 className="w-10 h-10 animate-spin text-[#E17100]" />
          <p>מריץ בדיקת מהירות... (עד 90 שניות)</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCircle score={result.scores.performance} label="ביצועים" icon={Gauge} />
            <ScoreCircle score={result.scores.accessibility} label="נגישות" icon={Eye} />
            <ScoreCircle score={result.scores.bestPractices} label="Best Practices" icon={Shield} />
            <ScoreCircle score={result.scores.seo} label="SEO" icon={Search} />
          </div>

          {/* Core Web Vitals */}
          <div className="p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <h2 className="text-lg font-semibold mb-3">Core Web Vitals</h2>
            {Object.entries(metricLabels).map(([key, label]) => (
              <MetricRow
                key={key}
                label={label}
                value={result.coreWebVitals[key] || "N/A"}
                score={result.coreWebVitalsScores[key]}
              />
            ))}
          </div>

          {/* Opportunities */}
          {result.opportunities.length > 0 && (
            <div className="p-5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <h2 className="text-lg font-semibold mb-3">הזדמנויות לשיפור</h2>
              <div className="space-y-3">
                {result.opportunities.map((opp, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{opp.title}</span>
                      {opp.savings && (
                        <span className="mr-2 text-amber-500 font-mono text-xs">({opp.savings})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-[var(--text-muted)] text-center">
            {result.strategy === "mobile" ? "Mobile" : "Desktop"} &middot; {new Date(result.fetchTime).toLocaleString("he-IL")}
          </p>
        </div>
      )}
    </div>
  );
}

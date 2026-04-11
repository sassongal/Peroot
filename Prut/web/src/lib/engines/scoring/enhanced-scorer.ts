/**
 * Enhanced Prompt Scorer — delegates dimension logic to prompt-dimensions.ts
 * and builds UX summary (Hebrew strengths / weaknesses without tip duplication).
 */

import { CapabilityMode } from '../../capability-mode';
import {
  scoreEnhancedTextDimensions,
  scoreEnhancedVisualDimensions,
  scoreEnhancedResearchDimensions,
  scoreEnhancedAgentDimensions,
  enhancedTotalFromChunks,
  weaknessSummaryLineHe,
  strengthSummaryLineHe,
  DIMENSION_LABEL_HE,
  detectPromptDomain,
  type DimensionScoreChunk,
  type PromptDomain,
} from './prompt-dimensions';

export interface DimensionResult {
  dimension: string;
  score: number;
  maxScore: number;
  tip: string;
  matched: string[];
  missing: string[];
}

export interface EnhancedScore {
  total: number;
  level: 'low' | 'medium' | 'high' | 'elite';
  label: string;
  breakdown: DimensionResult[];
  topWeaknesses: string[];
  estimatedImpact: string;
  strengths: string[];
  domain: PromptDomain;
}

function chunksToBreakdown(chunks: DimensionScoreChunk[]): DimensionResult[] {
  return chunks.map((c) => ({
    dimension: c.key,
    score: c.score,
    maxScore: c.maxPoints,
    tip: c.tipHe,
    matched: c.matched,
    missing: c.missing,
  }));
}

export class EnhancedScorer {
  static score(text: string, mode: CapabilityMode = CapabilityMode.STANDARD, domain?: PromptDomain): EnhancedScore {
    const trimmed = (text || '').trim();
    const detectedDomain = domain ?? detectPromptDomain(trimmed);
    if (!trimmed) {
      return {
        total: 0,
        level: 'low',
        label: 'ריק',
        breakdown: [],
        topWeaknesses: ['הפרומפט ריק — התחל לתאר את המטרה'],
        estimatedImpact: 'הוסף משפט או שניים על מה להשיג',
        strengths: [],
        domain: detectedDomain,
      };
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isVisual = mode === CapabilityMode.IMAGE_GENERATION || mode === CapabilityMode.VIDEO_GENERATION;
    const isVideo = mode === CapabilityMode.VIDEO_GENERATION;

    const chunks = isVisual
      ? scoreEnhancedVisualDimensions(trimmed, wordCount, isVideo)
      : mode === CapabilityMode.DEEP_RESEARCH
      ? scoreEnhancedResearchDimensions(trimmed, wordCount)
      : mode === CapabilityMode.AGENT_BUILDER
      ? scoreEnhancedAgentDimensions(trimmed, wordCount)
      : scoreEnhancedTextDimensions(trimmed, wordCount, detectedDomain);

    const breakdown = chunksToBreakdown(chunks);
    const total = enhancedTotalFromChunks(chunks);

    let level: EnhancedScore['level'];
    let label: string;
    if (total >= 90) {
      level = 'elite';
      label = 'מצוין';
    } else if (total >= 70) {
      level = 'high';
      label = 'חזק';
    } else if (total >= 40) {
      level = 'medium';
      label = 'בינוני';
    } else {
      level = 'low';
      label = 'חלש';
    }

    const withGap = chunks.map((c) => ({
      chunk: c,
      gap: c.maxPoints - c.score,
      pct: c.maxPoints > 0 ? c.score / c.maxPoints : 0,
    }));
    const sortedByGap = [...withGap].sort((a, b) => b.gap - a.gap);

    const topWeaknesses = sortedByGap
      .filter((d) => d.pct < 0.7 && d.gap >= 4)
      .slice(0, 3)
      .map((d) => weaknessSummaryLineHe(d.chunk));

    const strengths = chunks
      .map((c) => ({ chunk: c, pct: c.maxPoints > 0 ? c.score / c.maxPoints : 0 }))
      .filter((d) => d.pct >= 0.8 && d.chunk.score >= 5)
      .sort((a, b) => b.chunk.score - a.chunk.score)
      .slice(0, 3)
      .map((d) => strengthSummaryLineHe(d.chunk));

    const topGap = sortedByGap[0];
    let estimatedImpact: string;
    if (topGap && topGap.gap >= 4) {
      const lab = DIMENSION_LABEL_HE[topGap.chunk.key] ?? topGap.chunk.key;
      estimatedImpact = `השפעה גבוהה: ${lab} — עד +${topGap.gap} נקודות אם תסגור את הפער`;
    } else {
      estimatedImpact = 'הפרומפט מאוזן — שיפורים קטנים בלבד';
    }

    return {
      total,
      level,
      label,
      breakdown,
      topWeaknesses,
      estimatedImpact,
      strengths,
      domain: detectedDomain,
    };
  }
}

export function generateImprovementPlan(score: EnhancedScore, _text: string): string[] {
  const suggestions: string[] = [];
  const sortedByGap = [...score.breakdown]
    .map((d) => ({ ...d, gap: d.maxScore - d.score, pct: d.maxScore > 0 ? d.score / d.maxScore : 0 }))
    .filter((d) => d.gap >= 3)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  for (const d of sortedByGap) {
    const missingStr = d.missing.length > 0 ? ` (חסר: ${d.missing[0]})` : '';
    suggestions.push(`${d.tip}${missingStr} — פוטנציאל +${d.gap} נקודות`);
  }

  const clarityDim = score.breakdown.find((d) => d.dimension === 'clarity');
  if (clarityDim && clarityDim.missing.some((m) => m.includes('hedge'))) {
    suggestions.unshift('הסר מילים מחמיקות ("אולי", "נסה", "ייתכן") והשתמש בצורת ציווי ברורה');
  }

  const frameworkDim = score.breakdown.find((d) => d.dimension === 'framework');
  if (frameworkDim && frameworkDim.score < 4) {
    suggestions.push('הוסף מסגרת: כותרות בעברית (תפקיד, משימה, פורמט) או מילות CO-STAR באנגלית');
  }

  return suggestions.slice(0, 5);
}

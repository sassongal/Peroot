import type { PlanTier } from '@/lib/context/engine/types';

export interface ContextPlanLimits {
  perAttachment: number;
  total: number;
  maxFiles: number;
  maxUrls: number;
  maxImages: number;
  extractionsPerDay: number;
  jinaFallback: boolean;
  deepImageOcr: boolean;
}

export const PLAN_CONTEXT_LIMITS: Record<PlanTier, ContextPlanLimits> = {
  free: {
    perAttachment: 3_000,
    total: 8_000,
    maxFiles: 1,
    maxUrls: 1,
    maxImages: 1,
    extractionsPerDay: 5,
    jinaFallback: false,
    deepImageOcr: false,
  },
  pro: {
    perAttachment: 12_000,
    total: 40_000,
    maxFiles: 5,
    maxUrls: 5,
    maxImages: 5,
    extractionsPerDay: 100,
    jinaFallback: true,
    deepImageOcr: true,
  },
} as const;

export function getContextLimits(tier: PlanTier): ContextPlanLimits {
  return PLAN_CONTEXT_LIMITS[tier];
}

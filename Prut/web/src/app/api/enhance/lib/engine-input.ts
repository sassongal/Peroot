import type { EngineInput } from "@/lib/engines";
import type { CapabilityMode } from "@/lib/capability-mode";

interface HistoryRow {
  title?: string | null;
  prompt?: string | null;
  enhanced_prompt?: string | null;
}

interface PersonalityData {
  style_tokens?: string[] | null;
  personality_brief?: string | null;
  preferred_format?: string | null;
}

export interface BuildEngineInputParams {
  prompt: string;
  tone: string;
  category: string;
  mode: CapabilityMode;
  modeParams?: Record<string, string>;
  previousResult?: string;
  refinementInstruction?: string;
  answers?: Record<string, string>;
  userId: string | undefined;
  isGuest: boolean;
  isRefinement: boolean;
  historyRes: { data: HistoryRow[] | null };
  personalityRes: { data: PersonalityData | null };
  iteration?: number;
  context?: EngineInput['context'];
  targetModel?: EngineInput['targetModel'];
}

export function buildEngineInput(params: BuildEngineInputParams): EngineInput {
  const {
    prompt,
    tone,
    category,
    mode,
    modeParams,
    previousResult,
    refinementInstruction,
    answers,
    userId,
    isGuest,
    isRefinement,
    historyRes,
    personalityRes,
    iteration,
    context,
    targetModel,
  } = params;

  let userHistory: { title: string; prompt: string; enhanced?: string }[] = [];
  let userPersonality: { tokens: string[]; brief?: string; format?: string } | undefined = undefined;

  if (userId && !isGuest && !isRefinement) {
    if (historyRes.data) {
      const rawRows = historyRes.data as Array<{ title?: string | null; prompt?: string | null; enhanced_prompt?: string | null }>;
      userHistory = rawRows
        .filter(r => r.prompt && r.prompt.trim().length > 0)
        .map(r => ({
          title: r.title || '',
          prompt: r.prompt as string,
          ...(r.enhanced_prompt ? { enhanced: r.enhanced_prompt } : {}),
        }));
    }

    if (personalityRes.data) {
      userPersonality = {
        tokens: personalityRes.data.style_tokens || [],
        brief: personalityRes.data.personality_brief ?? undefined,
        format: personalityRes.data.preferred_format ?? undefined,
      };
    }
  }

  return {
    prompt,
    tone,
    category,
    mode,
    modeParams,
    previousResult,
    refinementInstruction,
    answers,
    userHistory,
    userPersonality,
    iteration,
    context,
    targetModel: targetModel || 'general',
  };
}

export type PromptUsage = {
  copies?: number;
  saves?: number;
  refinements?: number;
};

export interface Question {
  id: number;
  question: string;
  description: string;
  examples: string[];
}

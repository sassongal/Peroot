/**
 * Prompt strength scoring utility.
 * Calculates a 0-100 quality score based on prompt structure heuristics.
 */

import type { LibraryPrompt, PersonalPrompt } from "./types";

interface StrengthBreakdown {
  score: number;
  length: number;
  variables: number;
  qualityChecks: number;
  useCase: number;
  outputFormat: number;
  structure: number;
  roleDefinition: number;
  constraints: number;
}

/**
 * Calculate prompt strength score (0-100).
 * Works for both LibraryPrompt and PersonalPrompt.
 */
export function calculatePromptStrength(
  prompt: LibraryPrompt | PersonalPrompt
): StrengthBreakdown {
  const text = prompt.prompt || "";

  // Length score (20pts) — longer prompts tend to be more detailed
  const charCount = text.length;
  const length = charCount >= 500 ? 20 : charCount >= 200 ? 15 : charCount >= 100 ? 10 : charCount >= 50 ? 5 : 2;

  // Variables (15pts) — parameterized prompts are more reusable
  const varCount = "variables" in prompt
    ? (prompt as LibraryPrompt).variables.length
    : (text.match(/\{\{[^}]+\}\}/g) || []).length;
  const variables = varCount >= 3 ? 15 : varCount >= 1 ? 10 : 0;

  // Quality checks (10pts) — library prompts with quality criteria
  const qcCount = "quality_checks" in prompt ? (prompt as LibraryPrompt).quality_checks.length : 0;
  const qualityChecks = qcCount >= 3 ? 10 : qcCount >= 1 ? 5 : 0;

  // Use case (10pts) — has a described use case
  const useCaseText = prompt.use_case || "";
  const useCase = useCaseText.length >= 20 ? 10 : useCaseText.length >= 5 ? 5 : 0;

  // Output format (10pts) — has output format specification
  const outputFormatText = "output_format" in prompt ? (prompt as LibraryPrompt).output_format : "";
  const outputFormat = outputFormatText && outputFormatText.length > 0 ? 10 : 0;

  // Structure markers (15pts) — numbered lists, headers, sections
  const hasNumberedList = /\d+[.)]\s/.test(text);
  const hasBullets = /[-•*]\s/.test(text);
  const hasHeaders = /[#]+\s|^[\u0590-\u05FF].*:$/m.test(text);
  const hasSections = (text.match(/\n\n/g) || []).length >= 2;
  const structureScore = (hasNumberedList ? 5 : 0) + (hasBullets ? 3 : 0) + (hasHeaders ? 4 : 0) + (hasSections ? 3 : 0);
  const structure = Math.min(15, structureScore);

  // Role definition (10pts) — "act as", "you are", "אתה"
  const hasRole = /act as|you are|your role|אתה |את |הנך /i.test(text);
  const roleDefinition = hasRole ? 10 : 0;

  // Constraints (10pts) — "do not", "must", "avoid", "אל ", "חובה"
  const hasConstraints = /do not|don't|must |avoid |never |אל |חובה|אסור|הקפד/i.test(text);
  const constraints = hasConstraints ? 10 : 0;

  const score = length + variables + qualityChecks + useCase + outputFormat + structure + roleDefinition + constraints;

  return {
    score: Math.min(100, score),
    length,
    variables,
    qualityChecks,
    useCase,
    outputFormat,
    structure,
    roleDefinition,
    constraints,
  };
}

/**
 * Get strength label and color class based on score.
 */
export function getStrengthInfo(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: "חזק", colorClass: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
  if (score >= 50) return { label: "סביר", colorClass: "text-amber-400 bg-amber-500/15 border-amber-500/30" };
  return { label: "בסיסי", colorClass: "text-red-400 bg-red-500/15 border-red-500/30" };
}

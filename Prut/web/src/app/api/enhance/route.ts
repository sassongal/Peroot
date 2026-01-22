import { generateObject } from "ai";
import { generateSystemPrompt } from "@/lib/prompt-engine";
import { gemini, groqLlama, AI_PROVIDERS } from "@/lib/ai/models";
import { z } from "zod";

export const maxDuration = 30;

const RequestSchema = z.object({
  prompt: z.string(),
  tone: z.string().default("Professional"),
  category: z.string().default("General"),
  previousResult: z.string().optional(),
  refinementInstruction: z.string().optional(),
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
  })).optional(),
  answers: z.record(z.string()).optional(),
});

// Rich Question Schema
const QuestionSchema = z.object({
  id: z.number().optional(),
  question: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
});

// Output Schema for Structured JSON with Rich Questions
const ResponseSchema = z.object({
  great_prompt: z.string(),
  clarifying_questions: z.array(QuestionSchema),
  category: z.string(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { prompt, tone, category, previousResult, refinementInstruction, questions, answers } = RequestSchema.parse(json);
    
    // Determine if this is a refinement request
    // It's a refinement if we have a previous result AND (refinement instruction OR answers)
    const hasAnswers = answers && Object.values(answers).some((a: string) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || hasAnswers);
    
    let missingInput = prompt;
    if (isRefinement) {
      const answersText = questions && answers 
        ? questions.map(q => {
            const ans = answers[String(q.id)];
            return ans ? `Q: ${q.question}\nA: ${ans}` : null;
          }).filter(Boolean).join("\n")
        : "";
      
      missingInput = `${prompt}\n\n${refinementInstruction || ""}\n\n${answersText}`;
    }

    let systemPrompt = generateSystemPrompt({ tone, category, input: missingInput });
    
    if (isRefinement) {
        // Format answers for the system prompt
        const formattedAnswers = questions && answers
            ? questions
                .filter(q => answers[String(q.id)]?.trim())
                .map(q => `- Question: "${q.question}"\n  User Answer: "${answers[String(q.id)]}"`)
                .join("\n")
            : "";

      systemPrompt += `\n\nRefinement mode:
- Previous draft: ${previousResult}
- New instruction: ${refinementInstruction || "None"}
${formattedAnswers ? `- structured Answers to Clarifying Questions:\n${formattedAnswers}` : ""}

- Update the "great_prompt" by incorporating the user's answers and new instructions.
- **CRITICAL: You MUST generate exactly 3 distinct clarifying questions** to guide the user to a perfect prompt.
- **Question 1 (Strategy/Goal)**: Ask about the core objective or target audience (e.g., "Who is this for?", "What is the main goal?").
- **Question 2 (Content/Style)**: Ask about the tone, format, or specific content requirements (e.g., "What tone should I use?", "Do you need a list or a paragraph?").
- **Question 3 (Missing Details/Constraints)**: Ask for specific missing information or constraints (e.g., "Are there any length limits?", "What key points must be included?").
- **Examples**: For EACH question, provide 3 short, clickable example answers.
- Apply new details to replace placeholders wherever possible.`;
    } else {
      systemPrompt += `\n\n**CRITICAL: You MUST generate exactly 3 clarifying questions** to refine the prompt.
- **Question 1 (Strategy/Goal)**: Ask about the core objective or target audience.
- **Question 2 (Content/Style)**: Ask about the tone, format, or specific content requirements.
- **Question 3 (Missing Details)**: Ask for specific missing information that would make the prompt better.
- **Examples**: For EACH question, provide 3 short, clickable example answers.`;
    }

    const userPrompt = prompt;
    
    // Debug logging
    console.log(`[DEBUG] Mode: ${isRefinement ? 'REFINEMENT' : 'INITIAL'}`);

    // Try Gemini 1.5 Flash first
    try {
      console.log(`[${AI_PROVIDERS.PRIMARY}] Attempting with Gemini...`);
      
      const result = await generateObject({
        model: gemini,
        schema: ResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0,
      });

      console.log(`[${AI_PROVIDERS.PRIMARY}] Success!`);
      
      const normalized = normalizeResponse(result.object, category);

      return new Response(JSON.stringify(normalized), {
        headers: { 'Content-Type': 'application/json' },
      });
      
    } catch (geminiError) {
      console.warn(`[${AI_PROVIDERS.PRIMARY}] Failed, switching to fallback...`, geminiError);
      
      // Fallback
      const result = await generateObject({
        model: groqLlama,
        schema: ResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: isRefinement ? 0.15 : 0.2,
      });

      console.log(`[${AI_PROVIDERS.FALLBACK}] Fallback success!`);
      
      const normalized = normalizeResponse(result.object, category);

      return new Response(JSON.stringify(normalized), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid request data", details: error.issues }), { status: 400 });
    }
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

function normalizeResponse(payload: z.infer<typeof ResponseSchema>, fallbackCategory: string) {
  const allowedCategories = new Set([
    "General",
    "Marketing",
    "Sales",
    "Social",
    "CustomerSupport",
    "Product",
    "Operations",
    "HR",
    "Dev",
    "Education",
    "Legal",
    "Creative",
    "Finance",
    "Healthcare",
    "Ecommerce",
    "RealEstate",
    "Strategy",
    "Design",
    "Data",
    "Automation",
    "Community",
    "Nonprofit",
  ]);

  const greatPrompt =
    typeof payload.great_prompt === "string" && payload.great_prompt.trim()
      ? payload.great_prompt
      : "אנא נסח/י פרומפט מפורט לפי ההקשר שסופק.";

  const questions = Array.isArray(payload.clarifying_questions)
    ? payload.clarifying_questions
        .filter((q) => q && typeof q.question === "string" && q.question.trim())
        .slice(0, 3)
        .map((q, index) => ({
          id: q.id ?? index + 1,
          question: q.question.trim(),
          description:
            typeof q.description === "string" && q.description.trim()
              ? q.description.trim()
              : "כדי לחדד את התוצאה, אנא הוסף/י את הפרט החסר.",
          examples:
            Array.isArray(q.examples) && q.examples.length > 0
              ? q.examples.slice(0, 3)
              : ["דוגמה 1", "דוגמה 2", "דוגמה 3"],
        }))
    : [];

  const category =
    typeof payload.category === "string" && allowedCategories.has(payload.category)
      ? payload.category
      : fallbackCategory;

  return {
    great_prompt: greatPrompt,
    clarifying_questions: questions,
    category,
  };
}

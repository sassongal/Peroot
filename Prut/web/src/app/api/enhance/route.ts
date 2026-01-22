import { generateObject } from "ai";
import { generatePromptSystemPrompt, generateQuestionsSystemPrompt } from "@/lib/prompt-engine";
import { gemini, groqLlama, AI_PROVIDERS } from "@/lib/ai/models";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  answers: z.record(z.string(), z.string()).optional(),
});

// Rich Question Schema
const QuestionSchema = z.object({
  id: z.number().optional(),
  question: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
});

// Output Schema for Prompt Only
const PromptResponseSchema = z.object({
  great_prompt: z.string(),
  category: z.string(),
});

// Output Schema for Questions Only
const QuestionsResponseSchema = z.object({
  clarifying_questions: z.array(QuestionSchema),
});

// Output Schema for Monolithic Fallback
const ResponseSchema = z.object({
  great_prompt: z.string(),
  clarifying_questions: z.array(QuestionSchema),
  category: z.string(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Check Credit Balance (Only for logged-in users)
    if (user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('credits_balance')
            .eq('id', user.id)
            .maybeSingle(); 
        
        if (profileError) {
            console.error("Profile fetch error:", profileError);
            return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), { status: 500 });
        }
    
        const balance = profile?.credits_balance ?? 0;
        if (balance < 1) {
            return new Response(JSON.stringify({ error: "Insufficient credits" }), { status: 403 });
        }
    }

    const json = await req.json();
    const { prompt, tone, category, previousResult, refinementInstruction, questions, answers } = RequestSchema.parse(json);
    

    // Determine if this is a refinement request
    const hasAnswers = answers && Object.values(answers).some((a) => a.trim());
    const isRefinement = !!previousResult && (!!refinementInstruction || !!hasAnswers);
    
    // Prepare input text
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

    // Refinement format injection if needed
    let refinementContext = "";
    if (isRefinement) {
        const formattedAnswers = questions && answers
            ? questions
                .filter(q => answers[String(q.id)]?.trim())
                .map(q => `- Question: "${q.question}"\n  User Answer: "${answers[String(q.id)]}"`)
                .join("\n")
            : "";

      refinementContext = `\n\nRefinement mode:
- Previous draft: ${previousResult}
- New instruction: ${refinementInstruction || "None"}
${formattedAnswers ? `- structured Answers to Clarifying Questions:\n${formattedAnswers}` : ""}
- Update the prompt incorporating these new details.`;
    }

    // Generate specialized system prompts
    const promptSystemPrompt = generatePromptSystemPrompt({ tone, category, input: missingInput }) + refinementContext;
    const questionsSystemPrompt = generateQuestionsSystemPrompt({ input: missingInput }); // Questions don't need tone/category context as much

    const userPrompt = prompt;
    
    console.log(`[DEBUG] Mode: ${isRefinement ? 'REFINEMENT' : 'INITIAL'} | Strategy: PARALLEL SPLIT`);

    // Create Promises for Parallel Execution
    const promptPromise = generateObject({
        model: gemini, // Using Flash (fast/cheap)
        schema: PromptResponseSchema,
        system: promptSystemPrompt,
        prompt: userPrompt,
        temperature: isRefinement ? 0.2 : 0.3, // Slightly creative for prompt
    });

    const questionsPromise = generateObject({
        model: gemini, // Using Flash (fast/cheap)
        schema: QuestionsResponseSchema,
        system: questionsSystemPrompt,
        prompt: userPrompt,
        temperature: 0.1, // Deterministic for questions
    });

    try {
      // Execute in Parallel
      const [promptResult, questionsResult] = await Promise.all([promptPromise, questionsPromise]);

      console.log(`[${AI_PROVIDERS.PRIMARY}] Parallel Success!`);
      
      // Merge results
      const combinedResult = {
          great_prompt: promptResult.object.great_prompt,
          category: promptResult.object.category,
          clarifying_questions: questionsResult.object.clarifying_questions
      };

      const normalized = normalizeResponse(combinedResult, category);

      // Deduct credit (Only for logged-in users)
      if (user) {
          const { error: deductError } = await supabase.rpc('decrement_credits', { user_id: user.id, amount: 1 });
          if (deductError) {
               console.warn("RPC decrement_credits failed, trying direct update", deductError);
               // Fallback update
               const { data: profile } = await supabase.from('profiles').select('credits_balance').eq('id', user.id).single();
               const currentBalance = profile?.credits_balance ?? 1;
               await supabase
                .from('profiles')
                .update({ credits_balance: currentBalance - 1 })
                .eq('id', user.id);
          }
      }

      return new Response(JSON.stringify(normalized), {
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store' // Dynamic content, do not cache at browser level
        },
      });
      
    } catch (error) {
      console.warn(`[${AI_PROVIDERS.PRIMARY}] Parallel Failed, switching to fallback (Linear)...`, error);
      
      // Fallback: Use Llama sequentially (or monolithic if cheaper/safer for fallback)
       const fallbackSystemPrompt = `Role: Senior Prompt Engineer. 
Goal: Write a great prompt and 3 clarifying questions.
Language: Hebrew/English mixed.
Category: ${category}
Tone: ${tone}
Input: ${missingInput}
Output JSON: { "great_prompt": "...", "clarifying_questions": [], "category": "..." }`;

      const result = await generateObject({
        model: groqLlama,
        schema: ResponseSchema,
        system: fallbackSystemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
      });

      console.log(`[${AI_PROVIDERS.FALLBACK}] Fallback success!`);
      const normalized = normalizeResponse(result.object, category);

       // Deduct credit
      if (user) {
          const { error: deductError } = await supabase.rpc('decrement_credits', { user_id: user.id, amount: 1 });
          if (deductError) {
               const { data: profile } = await supabase.from('profiles').select('credits_balance').eq('id', user.id).single();
               const currentBalance = profile?.credits_balance ?? 1;
               await supabase
                .from('profiles')
                .update({ credits_balance: currentBalance - 1 })
                .eq('id', user.id);
          }
      }

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

type ResponsePayload = {
  great_prompt?: string;
  clarifying_questions?: any[];
  category?: string;
};

function normalizeResponse(payload: ResponsePayload, fallbackCategory: string) {
  const allowedCategories = new Set([
    "General", "Marketing", "Sales", "Social", "CustomerSupport",
    "Product", "Operations", "HR", "Dev", "Education", "Legal",
    "Creative", "Finance", "Healthcare", "Ecommerce", "RealEstate",
    "Strategy", "Design", "Data", "Automation", "Community", "Nonprofit"
  ]);

  const greatPrompt =
    typeof payload.great_prompt === "string" && payload.great_prompt.trim()
      ? payload.great_prompt
      : "אנא נסח/י פרומפט מפורט לפי ההקשר שסופק.";

  const questions = Array.isArray(payload.clarifying_questions)
    ? payload.clarifying_questions
        .filter((q: any) => q && typeof q.question === "string" && q.question.trim())
        .slice(0, 3)
        .map((q: any, index: number) => ({
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

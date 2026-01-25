
import { createClient } from "@/lib/supabase/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

/**
 * Analyzes a user's prompt library and synthesizes a persistent style personality.
 * Stores the result in user_style_personality table.
 */
export async function analyzeUserStyle(userId: string) {
    const supabase = await createClient();

    // 1. Fetch the user's library (top 15 items)
    const { data: library } = await supabase
        .from('personal_library')
        .select('title, prompt, use_case, personal_category')
        .eq('user_id', userId)
        .order('use_count', { ascending: false })
        .limit(15);
    
    if (!library || library.length < 3) return null; // Not enough data to build a persona

    // 2. Synthesize using AI
    const libraryText = library.map(p => `[${p.title}]\n${p.prompt}`).join('\n\n---\n\n');

    const analyzerPrompt = `
    Analyze the following prompt engineering styles for this user.
    Identify recurring patterns in:
    - Tone (e.g. professional, direct, creative, technical)
    - Structure (e.g. bullet points, complex scenarios, short instructions)
    - Language habits (e.g. specific Hebrew terminology, formatting preferences)
    - Precision level (detailed vs concise)

    Output format (JSON):
    {
      "tokens": ["word1", "word2", "phrase3"],
      "preferred_format": "description of structure",
      "personality_brief": "A professional brief of this user's writing identity"
    }

    Prompts to analyze:
    ---
    ${libraryText}
    ---
    `.trim();

    try {
        const { text } = await generateText({
            model: google('gemini-2.0-flash'),
            system: "You are a behavioral linguistics expert specializing in AI Prompt Engineering. Return only valid JSON.",
            prompt: analyzerPrompt
        });

        const result = JSON.parse(text);

        // 3. Persist to DB
        const { error } = await supabase
            .from('user_style_personality')
            .upsert({
                user_id: userId,
                style_tokens: result.tokens || [],
                preferred_format: result.preferred_format,
                personality_brief: result.personality_brief,
                last_analyzed_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (error) throw error;
        return result;

    } catch (e) {
        console.error("[analyzeUserStyle] Error:", e);
        return null;
    }
}

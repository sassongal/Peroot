import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: "Say hello in one word",
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      keyPrefix: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.slice(0, 10) + "...",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
      name: error?.name,
      cause: error?.cause?.message || null,
      keyPrefix: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.slice(0, 10) + "...",
      keyLength: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0,
    }, { status: 500 });
  }
}

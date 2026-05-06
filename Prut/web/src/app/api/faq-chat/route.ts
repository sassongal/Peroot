import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type FAQContext = { question: string; answer: string; category: string };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const limitResult = await checkRateLimit(ip, "faqChat");
  if (!limitResult.success) {
    return NextResponse.json({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }, { status: 429 });
  }

  let body: { question?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const { question, context } = body;
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "שאלה חסרה" }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "שאלה ארוכה מדי" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_FAQ_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "שגיאת תצורה" }, { status: 500 });
  }

  const contextItems: FAQContext[] = Array.isArray(context)
    ? (context as FAQContext[])
        .slice(0, 3)
        .filter((item) => typeof item?.question === "string" && typeof item?.answer === "string")
    : [];

  const contextText =
    contextItems.length > 0
      ? contextItems.map((item) => `שאלה: ${item.question}\nתשובה: ${item.answer}`).join("\n\n")
      : "אין מידע זמין.";

  const cfGateway = process.env.CF_AI_GATEWAY_URL?.replace(/\/$/, "");
  const google = createGoogleGenerativeAI({
    apiKey,
    baseURL: cfGateway ? `${cfGateway}/google-ai-studio/v1beta` : undefined,
  });

  const result = await streamText({
    model: google("gemini-2.5-flash-lite"),
    system: `אתה עוזר תמיכה של Peroot — פלטפורמת שיפור פרומפטים בעברית.
ענה בעברית בלבד, בסגנון ידידותי וקצר (2-4 משפטים מקסימום).
השתמש אך ורק במידע שסופק ב-Context הבא.
אם התשובה לא נמצאת ב-Context — אמור זאת בכנות והפנה לדף יצירת קשר: peroot.space/contact
אל תמציא מידע ואל תוסיף נתונים שלא מופיעים ב-Context.

Context:
${contextText}`,
    prompt: question.trim().slice(0, 500),
    maxOutputTokens: 300,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}

import { NextResponse } from "next/server";
import {
  authenticateConnect,
  CORS_HEADERS,
  handleOptions,
  logConnectUsage,
} from "@/lib/connect/auth";
import {
  ConnectEnhanceSchema,
  ConnectOpError,
  ConnectSaveSchema,
  connectEnhance,
  connectGetPrompt,
  connectListPrompts,
  connectQuota,
  connectSavePrompt,
  connectSearchPrompts,
  connectSearchLibrary,
  connectFillTemplate,
  connectListFacts,
  connectRememberFact,
  connectRatePrompt,
  connectRelatedPrompts,
  connectListChains,
  connectGetChain,
} from "@/lib/connect/ops";

/**
 * POST /api/mcp — Peroot Connect's remote MCP server (Streamable HTTP,
 * STATELESS — plan §23.2). Every request is a self-contained JSON-RPC message
 * answered with a single JSON response; no SSE stream, no session state, so it
 * runs correctly on serverless.
 *
 * Auth: `Authorization: Bearer prk_live_…` on every request (Claude Desktop
 * via mcp-remote --header, Cursor via headers config), or an OAuth access
 * token `pot_…` (claude.ai web / ChatGPT connectors — discovery via
 * /.well-known/oauth-authorization-server, consent at /oauth/authorize).
 *
 * Tools call the SAME shared ops layer as /api/v1 — zero drift between
 * surfaces. Prompts expose the /peroot: command family.
 */
export const maxDuration = 60;

const PROTOCOL_VERSION = "2025-06-18";

// ── Tool definitions (schemas mirror the shared zod schemas) ────────────────

const MODE_ENUM = [
  "STANDARD",
  "DEEP_RESEARCH",
  "IMAGE_GENERATION",
  "VIDEO_GENERATION",
  "AGENT_BUILDER",
];

const TOOLS = [
  {
    name: "enhance_prompt",
    title: "שדרוג פרומפט",
    description:
      "הופך כל פרומפט לפרומפט מושלם ומורחב דרך מנועי Peroot — כולל הסקילים לכל פלטפורמה, העובדות האישיות של המשתמש ופרופילי מודלים. בחר mode לפי הכוונה: STANDARD לטקסט, IMAGE_GENERATION לתמונות, VIDEO_GENERATION לוידאו, DEEP_RESEARCH למחקר, AGENT_BUILDER לסוכנים. target_model קובע לאיזה מודל יעד הפרומפט מותאם (בדיוק כמו הבורר בפלטפורמה). Turns any prompt into a perfected, expanded one via Peroot's engines.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "הפרומפט הגולמי לשדרוג (עד 8000 תווים)" },
        mode: { type: "string", enum: MODE_ENUM, description: "מצב היכולת. ברירת מחדל STANDARD" },
        target_model: {
          type: "string",
          enum: ["chatgpt", "claude", "gemini", "general"],
          description: "לאיזה מודל לבנות את הפרומפט (מבנה והנחיות פר-מודל). ברירת מחדל general",
        },
        model_profile_slug: {
          type: "string",
          description: "פרופיל מודל מדויק, אופציונלי (למשל gpt-5, claude-sonnet-4, gemini-2.5)",
        },
        output_language: {
          type: "string",
          enum: ["hebrew", "english", "arabic", "russian"],
          description: "שפת הפלט. ברירת מחדל עברית; תמונות/וידאו תמיד באנגלית",
        },
        tone: { type: "string", description: "טון הפרומפט (למשל Professional)" },
        mode_options: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "פרמטרים פר-מוד: IMAGE — aspect_ratio, style · VIDEO — camera_movement, duration, style, mood · AGENT — system_instructions",
        },
        context: {
          type: "string",
          description:
            "תמצית קצרה (עד 4000 תווים) של הקשר השיחה והפרויקט: מה המוצר/הפרויקט, קהל היעד, המטרה, אילוצים. תמצת בעצמך — אל תדביק טרנסקריפט. כלול רק כשההקשר באמת משפר את הפרומפט; זה מקרקע את השדרוג במה שהמשתמש עובד עליו בפועל.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "save_prompt",
    title: "שמירה לספרייה",
    description:
      "שומר פרומפט לספרייה האישית של המשתמש ב-Peroot (וממנה ל-Memory Palace). קרא לזה רק כשהמשתמש מבקש לשמור. auto_tag=true מוסיף תיוג אוטומטי.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "תוכן הפרומפט לשמירה" },
        title: { type: "string", description: "כותרת (ברירת מחדל: תחילת הפרומפט)" },
        tags: { type: "array", items: { type: "string" }, description: "תגיות (עד 15)" },
        auto_tag: { type: "boolean", description: "תיוג אוטומטי כשאין תגיות" },
        category: { type: "string", description: "קטגוריה (ברירת מחדל: כללי)" },
        mode: { type: "string", enum: MODE_ENUM },
        original_prompt: { type: "string", description: "הפרומפט המקורי לפני השדרוג" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "search_my_prompts",
    title: "חיפוש בספרייה שלי",
    description:
      "חיפוש עמום בספרייה האישית של המשתמש. השתמש לפני כתיבת פרומפט מאפס — ייתכן שכבר קיים אחד טוב.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "מה לחפש" },
        limit: { type: "number", description: "מקסימום תוצאות (ברירת מחדל 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_my_prompts",
    title: "רשימת הפרומפטים שלי",
    description: "רשימה מדופדפת של הפרומפטים השמורים של המשתמש.",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "עמוד (ברירת מחדל 1)" },
        limit: { type: "number", description: "פר עמוד (ברירת מחדל 20, מקס 50)" },
      },
    },
  },
  {
    name: "get_prompt",
    title: "שליפת פרומפט",
    description: "מחזיר פרומפט שמור לפי מזהה.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "UUID של הפרומפט" } },
      required: ["id"],
    },
  },
  {
    name: "get_quota",
    title: "בדיקת מכסה",
    description:
      "כמה שדרוגים נשארו למשתמש ומתי המכסה מתחדשת. חינמי — קרא לפני enhance_prompt כדי להזהיר לפני שנגמר.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_public_library",
    title: "חיפוש בספרייה הציבורית",
    description:
      "מחפש בספריית הפרומפטים הציבורית של Peroot (מאות פרומפטים ותבניות מוכחים). השתמש כדי להתחיל ממשהו שעובד במקום מאפס. חינמי.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "מה לחפש" },
        limit: { type: "number", description: "מקסימום תוצאות (ברירת מחדל 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "fill_template",
    title: "מילוי תבנית",
    description:
      "ממלא תבנית מהספרייה הציבורית: מחליף כל {משתנה} בערך שסופק ומחזיר גם אילו משתנים חסרים — שאל את המשתמש עליהם והשלם. חינמי.",
    inputSchema: {
      type: "object",
      properties: {
        template_id: { type: "string", description: "UUID של התבנית (מ-search_public_library)" },
        variables: {
          type: "object",
          additionalProperties: { type: "string" },
          description: 'ערכי המשתנים, למשל {"שם_המוצר": "פירוט"}',
        },
      },
      required: ["template_id"],
    },
  },
  {
    name: "remember_fact",
    title: "זכור עליי",
    description:
      "שומר עובדה על המשתמש למוח של Peroot (משפיעה על כל שדרוג עתידי). קרא רק כשהמשתמש מבקש שתזכור משהו. חינמי.",
    inputSchema: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description: "העובדה (3–300 תווים), למשל: אני משווק דיגיטלי לעסקים קטנים",
        },
        category: {
          type: "string",
          enum: ["professional", "personal", "preference", "project", "language", "general"],
        },
      },
      required: ["fact"],
    },
  },
  {
    name: "list_facts",
    title: "מה Peroot זוכר עליי",
    description: "מציג את עובדות הזיכרון של המשתמש. חינמי.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rate_prompt",
    title: "דירוג שדרוג",
    description:
      "משוב 👍/👎 על שדרוג — עוזר ל-Peroot להשתפר. rating: 1 (טוב) או -1 (לא טוב). חינמי.",
    inputSchema: {
      type: "object",
      properties: {
        rating: { type: "number", enum: [1, -1] },
        input_text: { type: "string", description: "הפרומפט המקורי (אופציונלי)" },
        enhanced_text: { type: "string", description: "הפרומפט המשודרג (אופציונלי)" },
        mode: { type: "string", enum: MODE_ENUM },
      },
      required: ["rating"],
    },
  },
  {
    name: "related_prompts",
    title: "שכנים ב-Memory Palace",
    description:
      "מחזיר את הפרומפטים הקרובים ביותר לפרומפט נתון בגרף ה-Memory Palace של המשתמש (דמיון מילות מפתח + שימוש משותף — אותו מנוע כמו בפלטפורמה). השתמש כדי להציע למשתמש פרומפטים קשורים או להרכיב הקשר. חינמי.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID של פרומפט המרכז (מ-search_my_prompts)" },
        limit: { type: "number", description: "מקסימום שכנים (ברירת מחדל 8)" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_chains",
    title: "רשימת שרשראות",
    description:
      "רשימת שרשראות הפרומפטים (Chains) השמורות של המשתמש — תהליכים רב-שלביים שבנה בפלטפורמה. חינמי.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_chain",
    title: "שליפת שרשרת להרצה",
    description:
      "מחזיר שרשרת מלאה עם כל השלבים. ההרצה עליך (הסוכן): 1) שאל את המשתמש על ערכי המשתנים של כל שלב, 2) הרץ את השלבים לפי order — לכל שלב קרא ל-enhance_prompt עם prompt_text אחרי מילוי המשתנים, 3) כששלב מגדיר input_from_step — הזן לתוכו את פלט השלב הקודם, 4) הצג למשתמש את התוצר הסופי. כל שלב צורך קרדיט אחד.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "UUID של השרשרת (מ-list_chains)" } },
      required: ["id"],
    },
  },
];

// ── The /peroot: command family (MCP prompts) ───────────────────────────────

const PROMPT_ARG = [{ name: "prompt", description: "הפרומפט/הבקשה של המשתמש", required: true }];

function modeCommand(mode: string, he: string): string {
  return (
    `שדרג את הפרומפט הבא דרך Peroot: קרא ל-enhance_prompt עם mode="${mode}" והפרומפט של המשתמש. ` +
    `אם יש בשיחה הקשר רלוונטי (מוצר/פרויקט, קהל יעד, מטרה) — תמצת אותו לפסקה קצרה והעבר בפרמטר context. ` +
    `הצג למשתמש את התוצאה המלאה, וציין כמה קרדיטים נשארו (credits_remaining). ${he}`
  );
}

const PROMPTS: Array<{
  name: string;
  title: string;
  description: string;
  arguments?: typeof PROMPT_ARG;
  build: (args: Record<string, string>) => string;
}> = [
  {
    name: "enhance",
    title: "Peroot: שדרוג פרומפט",
    description: "הופך את הבקשה לפרומפט מושלם (מצב סטנדרטי)",
    arguments: PROMPT_ARG,
    build: (a) => `${modeCommand("STANDARD", "")}\n\nהפרומפט: ${a.prompt ?? ""}`,
  },
  {
    name: "image",
    title: "Peroot: פרומפט לתמונה",
    description: "פרומפט מושלם ליצירת תמונה (Midjourney/DALL-E/Imagen)",
    arguments: PROMPT_ARG,
    build: (a) =>
      `${modeCommand("IMAGE_GENERATION", "פרומפטים לתמונה יוצאים באנגלית לתוצאה מיטבית.")}\n\nהפרומפט: ${a.prompt ?? ""}`,
  },
  {
    name: "video",
    title: "Peroot: פרומפט לוידאו",
    description: "פרומפט מושלם ליצירת וידאו (Sora/Veo/Runway)",
    arguments: PROMPT_ARG,
    build: (a) =>
      `${modeCommand("VIDEO_GENERATION", "אם חסרים camera_movement או duration — שאל את המשתמש והעבר אותם ב-mode_options.")}\n\nהפרומפט: ${a.prompt ?? ""}`,
  },
  {
    name: "research",
    title: "Peroot: פרומפט מחקר",
    description: "פרומפט מושלם למחקר מעמיק עם מקורות",
    arguments: PROMPT_ARG,
    build: (a) => `${modeCommand("DEEP_RESEARCH", "")}\n\nהפרומפט: ${a.prompt ?? ""}`,
  },
  {
    name: "agent",
    title: "Peroot: פרומפט לסוכן",
    description: "system prompt מושלם לסוכן/GPT מותאם",
    arguments: PROMPT_ARG,
    build: (a) =>
      `${modeCommand("AGENT_BUILDER", "העבר system_instructions ב-mode_options אם המשתמש סיפק.")}\n\nהפרומפט: ${a.prompt ?? ""}`,
  },
  {
    name: "save",
    title: "Peroot: שמירה לספרייה",
    description: "שומר את הפרומפט האחרון לספרייה עם תיוג",
    build: () =>
      "שמור את הפרומפט האחרון שנוצר בשיחה לספריית Peroot של המשתמש: קרא ל-save_prompt עם auto_tag=true ועם original_prompt אם ידוע. אשר למשתמש עם הכותרת והתגיות שנשמרו.",
  },
  {
    name: "find",
    title: "Peroot: חיפוש בספרייה",
    description: "מחפש בפרומפטים השמורים של המשתמש",
    arguments: PROMPT_ARG,
    build: (a) =>
      `חפש בספריית Peroot של המשתמש: קרא ל-search_my_prompts עם השאילתה, והצג את התוצאות בצורה נעימה (כותרת + תקציר). השאילתה: ${a.prompt ?? ""}`,
  },
  {
    name: "quota",
    title: "Peroot: כמה נשאר לי",
    description: "בדיקת יתרת שדרוגים ומועד חידוש",
    build: () =>
      "קרא ל-get_quota והצג למשתמש בעברית: כמה שדרוגים נשארו, איזה מסלול (חינמי/PRO), ומתי המכסה מתחדשת.",
  },
  {
    name: "help",
    title: "Peroot: עזרה",
    description: "מה Peroot Connect יודע לעשות",
    build: () =>
      "הצג למשתמש סיכום קצר בעברית של פקודות Peroot: enhance (שדרוג), image/video/research/agent (מודים), save (שמירה), find (חיפוש), quota (מכסה). הסבר ששדרוג צורך קרדיט אחד מהמכסה (חינמי: 1 ליום, PRO: 150 לחודש).",
  },
];

// ── JSON-RPC plumbing ───────────────────────────────────────────────────────

type RpcId = string | number | null;

function rpcResult(id: RpcId, result: unknown): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

function rpcError(id: RpcId, code: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

function toolText(text: string, structured?: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: "text", text }],
    ...(structured ? { structuredContent: structured } : {}),
    isError,
  };
}

// ── Handlers ────────────────────────────────────────────────────────────────

export function OPTIONS() {
  return handleOptions();
}

export function GET() {
  // Stateless server: no SSE stream to open.
  return new NextResponse(null, { status: 405, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;
  const rawKey = (req.headers.get("authorization") ?? "").slice(7).trim();

  let msg: { jsonrpc?: string; id?: RpcId; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (Array.isArray(msg)) {
    return rpcError(null, -32600, "Batch requests are not supported");
  }
  const id = msg.id ?? null;
  const method = msg.method ?? "";
  const params = (msg.params ?? {}) as Record<string, unknown>;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: {
          name: "peroot",
          title: "Peroot — מנוע הפרומפטים",
          version: "1.0.0",
        },
        instructions:
          "Peroot הופך כל פרומפט לפרומפט מושלם ומורחב. לפני יצירת תמונה/וידאו/מחקר/סוכן — שדרג קודם עם enhance_prompt במוד המתאים. חשוב: אם בשיחה יש הקשר רלוונטי (על איזה מוצר/פרויקט מדובר, קהל יעד, מטרה) — תמצת אותו לפסקה קצרה והעבר בפרמטר context, כדי שהשדרוג יתבסס על מה שהמשתמש באמת עובד עליו ולא על ניחוש. שמירה לספרייה רק לבקשת המשתמש (save_prompt). לפני שדרוג למשתמש חינמי כדאי לבדוק get_quota.",
      });

    case "notifications/initialized":
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: TOOLS });

    case "prompts/list":
      return rpcResult(id, {
        prompts: PROMPTS.map(({ name, title, description, arguments: args }) => ({
          name,
          title,
          description,
          ...(args ? { arguments: args } : {}),
        })),
      });

    case "prompts/get": {
      const prompt = PROMPTS.find((p) => p.name === params.name);
      if (!prompt) return rpcError(id, -32602, `Unknown prompt: ${String(params.name)}`);
      const args = (params.arguments ?? {}) as Record<string, string>;
      return rpcResult(id, {
        description: prompt.description,
        messages: [{ role: "user", content: { type: "text", text: prompt.build(args) } }],
      });
    }

    case "tools/call": {
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const started = Date.now();
      try {
        const result = await callTool(name, args, rawKey, auth.userId);
        logConnectUsage({
          userId: auth.userId,
          keyId: auth.keyId,
          endpoint: `mcp:${name}`,
          durationMs: Date.now() - started,
          engineMode: typeof args.mode === "string" ? args.mode : undefined,
        });
        return rpcResult(id, result);
      } catch (e) {
        if (e instanceof ConnectOpError) {
          // Tool-level failure → isError result (the agent relays it to the user).
          return rpcResult(id, toolText(`${e.message} (${e.code})`, { code: e.code }, true));
        }
        if (e instanceof UnknownToolError) {
          return rpcError(id, -32602, e.message);
        }
        return rpcResult(id, toolText("שגיאת שרת פנימית (internal_error)", undefined, true));
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

class UnknownToolError extends Error {}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  rawKey: string,
  userId: string,
) {
  switch (name) {
    case "enhance_prompt": {
      const input = ConnectEnhanceSchema.parse(args);
      const r = await connectEnhance(input, rawKey, userId);
      const creditsLine =
        r.credits_remaining !== null ? `\n\n(נשארו ${r.credits_remaining} שדרוגים במכסה)` : "";
      return toolText(r.enhanced_prompt + creditsLine, { ...r });
    }
    case "save_prompt": {
      const input = ConnectSaveSchema.parse(args);
      const r = await connectSavePrompt(userId, input);
      return toolText(
        `נשמר לספרייה: "${r.title}"${r.tags.length ? ` · תגיות: ${r.tags.join(", ")}` : ""}`,
        { ...r },
      );
    }
    case "search_my_prompts": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new ConnectOpError(400, "invalid_request", "חסרה שאילתת חיפוש");
      const results = await connectSearchPrompts(userId, query, Number(args.limit ?? 10) || 10);
      const text = results.length
        ? results.map((r, i) => `${i + 1}. ${r.title} (${r.id})`).join("\n")
        : "לא נמצאו פרומפטים תואמים";
      return toolText(text, { results });
    }
    case "list_my_prompts": {
      const r = await connectListPrompts(
        userId,
        Number(args.page ?? 1) || 1,
        Number(args.limit ?? 20) || 20,
      );
      return toolText(
        r.items.map((p, i) => `${i + 1}. ${p.title} (${p.id})`).join("\n") || "הספרייה ריקה",
        { ...r },
      );
    }
    case "get_prompt": {
      const p = await connectGetPrompt(userId, String(args.id ?? ""));
      return toolText(`${p.title}\n\n${p.prompt}`, { ...p });
    }
    case "get_quota": {
      const q = await connectQuota(userId);
      const creditsText =
        q.credits_remaining === null ? "ללא הגבלת שדרוגים" : `נשארו ${q.credits_remaining} שדרוגים`;
      return toolText(
        `מסלול: ${q.tier} · ${creditsText}` +
          (q.quota_resets_at ? ` · מתחדש ב-${q.quota_resets_at}` : ""),
        { ...q },
      );
    }
    case "search_public_library": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new ConnectOpError(400, "invalid_request", "חסרה שאילתת חיפוש");
      const results = await connectSearchLibrary(query, Number(args.limit ?? 10) || 10);
      const text = results.length
        ? results
            .map(
              (r, i) =>
                `${i + 1}. ${r.title} (${r.id})${r.variables.length ? ` · משתנים: ${r.variables.join(", ")}` : ""}`,
            )
            .join("\n")
        : "לא נמצאו תבניות תואמות";
      return toolText(text, { results });
    }
    case "fill_template": {
      const r = await connectFillTemplate(
        String(args.template_id ?? ""),
        (args.variables ?? {}) as Record<string, string>,
      );
      const text = r.missing.length
        ? `${r.filled}\n\n⚠️ חסרים ערכים ל: ${r.missing.join(", ")} — שאל את המשתמש והשלם.`
        : r.filled;
      return toolText(text, { ...r });
    }
    case "remember_fact": {
      const f = await connectRememberFact(
        userId,
        String(args.fact ?? ""),
        typeof args.category === "string" ? args.category : undefined,
      );
      return toolText(`נשמר לזיכרון: "${f.fact}" (${f.category})`, { ...f });
    }
    case "list_facts": {
      const facts = await connectListFacts(userId);
      const text = facts.length
        ? facts.map((f, i) => `${i + 1}. ${f.fact} (${f.category})`).join("\n")
        : "הזיכרון ריק — אפשר לבקש ממני לזכור דברים עליך";
      return toolText(text, { facts });
    }
    case "rate_prompt": {
      const rating = Number(args.rating);
      if (rating !== 1 && rating !== -1) {
        throw new ConnectOpError(400, "invalid_request", "rating חייב להיות 1 או -1");
      }
      await connectRatePrompt(userId, {
        rating: rating as 1 | -1,
        input_text: typeof args.input_text === "string" ? args.input_text : undefined,
        enhanced_text: typeof args.enhanced_text === "string" ? args.enhanced_text : undefined,
        mode: typeof args.mode === "string" ? args.mode : undefined,
      });
      return toolText(rating === 1 ? "תודה על המשוב החיובי! 👍" : "תודה — המשוב נרשם 👎", {
        saved: true,
      });
    }
    case "related_prompts": {
      const related = await connectRelatedPrompts(
        userId,
        String(args.id ?? ""),
        Number(args.limit ?? 8) || 8,
      );
      const text = related.length
        ? related.map((r, i) => `${i + 1}. ${r.title} (${r.id})`).join("\n")
        : "אין עדיין שכנים לפרומפט הזה בגרף";
      return toolText(text, { related });
    }
    case "list_chains": {
      const chains = await connectListChains(userId);
      const text = chains.length
        ? chains.map((c, i) => `${i + 1}. ${c.title} · ${c.steps_count} שלבים (${c.id})`).join("\n")
        : "אין שרשראות שמורות — אפשר לבנות בפלטפורמה";
      return toolText(text, { chains });
    }
    case "get_chain": {
      const chain = await connectGetChain(userId, String(args.id ?? ""));
      return toolText(
        `שרשרת "${chain.title}" — ${chain.steps.length} שלבים. הרץ אותם לפי הסדר עם enhance_prompt; מלא משתנים ושרשר פלטים לפי input_from_step.`,
        { ...chain },
      );
    }
    default:
      throw new UnknownToolError(`Unknown tool: ${name}`);
  }
}

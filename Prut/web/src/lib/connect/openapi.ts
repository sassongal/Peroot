/**
 * Peroot Connect — OpenAPI 3.1 contract, the single source of truth (plan §22.5).
 *
 * Served at GET /api/v1/openapi.json and rendered by /connect/docs — both read
 * THIS object, so the published reference can never drift from the spec.
 * Keep it in lockstep with the zod schemas in ops.ts and the route behavior.
 */

const MODES = [
  "STANDARD",
  "DEEP_RESEARCH",
  "IMAGE_GENERATION",
  "VIDEO_GENERATION",
  "AGENT_BUILDER",
] as const;

const errorResponse = (heExample: string, code: string) => ({
  description: heExample,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { error: heExample, error_en: "…", code },
    },
  },
});

const bearerSecurity = [{ apiKey: [] }];

export const CONNECT_OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: "Peroot Connect API",
    version: "1.0.0",
    description:
      "חיבור סוכני AI ל-Peroot: שדרוג פרומפטים בכל 5 המודים עם המוח המלא של המשתמש (עובדות, סגנון, סקילים פר-פלטפורמה), ספרייה אישית וציבורית, זיכרון ומשוב. אימות: מפתח prk_live_ בכותרת Authorization. מכסה: חינמי 1/יום · PRO 150/חודש (get_quota חינמי). Rate limit: 20/דקה למפתח, 40/דקה למשתמש.",
  },
  servers: [{ url: "https://www.peroot.space/api/v1" }],
  security: bearerSecurity,
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        description: "מפתח Peroot Connect (prk_live_…) — נוצר ב-Settings → Peroot Connect",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error", "code"],
        properties: {
          error: { type: "string", description: "הודעה בעברית" },
          error_en: { type: "string", description: "English message" },
          code: {
            type: "string",
            enum: [
              "missing_key",
              "invalid_key",
              "rate_limited",
              "invalid_request",
              "no_credits",
              "not_found",
              "timeout",
              "internal_error",
            ],
          },
          retry_after_seconds: { type: "integer" },
        },
      },
      EnhanceRequest: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: { type: "string", maxLength: 8000 },
          mode: { type: "string", enum: [...MODES], default: "STANDARD" },
          target_model: {
            type: "string",
            enum: ["chatgpt", "claude", "gemini", "general"],
            description: "לאיזה מודל יעד לבנות את הפרומפט — כמו הבורר בפלטפורמה",
          },
          model_profile_slug: {
            type: "string",
            maxLength: 64,
            description: "פרופיל מודל מדויק, אופציונלי (gpt-5, claude-sonnet-4, gemini-2.5)",
          },
          output_language: { type: "string", enum: ["hebrew", "english", "arabic", "russian"] },
          tone: { type: "string", maxLength: 60 },
          category: { type: "string", maxLength: 60 },
          mode_options: {
            type: "object",
            additionalProperties: { type: "string" },
            description:
              "IMAGE: image_platform (midjourney/dalle/flux/stable-diffusion/imagen/nanobanana/general), aspect_ratio, style · VIDEO: video_platform (sora/veo/runway/kling/wan/higgsfield/minimax/general), camera_movement, duration, style, mood · AGENT: system_instructions",
          },
          context: {
            type: "string",
            maxLength: 4000,
            description:
              "תמצית קצרה של הקשר השיחה/הפרויקט (מוצר, קהל, מטרה) — מקרקעת את השדרוג במה שהמשתמש באמת עובד עליו. תמצות, לא טרנסקריפט; מדלג על cache",
          },
        },
      },
      EnhanceResponse: {
        type: "object",
        properties: {
          enhanced_prompt: { type: "string" },
          title: { type: ["string", "null"] },
          mode: { type: "string", enum: [...MODES] },
          cache_hit: { type: "boolean", description: "true = לא נגבה קרדיט LLM" },
          credits_remaining: { type: ["integer", "null"] },
          quota_resets_at: { type: ["string", "null"], format: "date-time" },
          idempotent_replay: { type: "boolean", description: "true כשהוחזר מ-Idempotency-Key" },
        },
      },
      PromptSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          prompt: { type: "string" },
          category: { type: ["string", "null"] },
          mode: { type: ["string", "null"] },
          tags: { type: "array", items: { type: "string" } },
          created_at: { type: ["string", "null"] },
        },
      },
      Quota: {
        type: "object",
        properties: {
          tier: { type: "string" },
          credits_remaining: {
            type: ["integer", "null"],
            description: "null = ללא הגבלה (admin)",
          },
          quota_resets_at: { type: ["string", "null"], format: "date-time" },
        },
      },
      Fact: {
        type: "object",
        properties: {
          id: { type: "string" },
          fact: { type: "string" },
          category: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/enhance": {
      post: {
        summary: "שדרוג פרומפט (צורך 1 קרדיט; cache-hit חינם)",
        description:
          "אותו צינור כמו הפלטפורמה: סקילים פר-פלטפורמה, עובדות זיכרון, פרופיל סגנון ופרופילי מודלים. תומך Idempotency-Key (retry תוך 15 דק׳ לא מחויב שוב) ו-hard-stop של 55ש׳ עם החזר קרדיט.",
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: false,
            schema: { type: "string", maxLength: 128 },
            description: "מפתח ייחודי ל-retry בטוח — אותה תשובה, בלי חיוב כפול (TTL 15 דק׳)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/EnhanceRequest" } },
          },
        },
        responses: {
          "200": {
            description: "הפרומפט המשודרג",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/EnhanceResponse" } },
            },
          },
          "400": errorResponse("בקשה לא תקינה", "invalid_request"),
          "401": errorResponse("מפתח API לא תקין", "invalid_key"),
          "402": errorResponse("המכסה נגמרה", "no_credits"),
          "429": errorResponse("יותר מדי בקשות", "rate_limited"),
          "504": errorResponse("השדרוג ארך יותר מדי — הקרדיט הוחזר", "timeout"),
        },
      },
    },
    "/quota": {
      get: {
        summary: "יתרת מכסה ומועד חידוש (חינמי)",
        responses: {
          "200": {
            description: "מצב המכסה",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Quota" } } },
          },
          "401": errorResponse("מפתח API לא תקין", "invalid_key"),
        },
      },
    },
    "/prompts": {
      get: {
        summary: "רשימת הפרומפטים השמורים (חינמי)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
        ],
        responses: {
          "200": {
            description: "עמוד מהספרייה האישית",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/PromptSummary" } },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "שמירת פרומפט לספרייה + Memory Palace (חינמי)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: { type: "string", maxLength: 50000 },
                  title: { type: "string", maxLength: 120 },
                  tags: { type: "array", items: { type: "string" }, maxItems: 15 },
                  auto_tag: { type: "boolean" },
                  category: { type: "string", maxLength: 60 },
                  mode: { type: "string", enum: [...MODES] },
                  original_prompt: { type: "string", maxLength: 10000 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "נשמר",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    saved: { type: "boolean" },
                    id: { type: "string" },
                    title: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/prompts/search": {
      get: {
        summary: "חיפוש עמום בספרייה האישית (חינמי)",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 25 } },
        ],
        responses: {
          "200": {
            description: "תוצאות",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PromptSummary" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/prompts/{id}": {
      get: {
        summary: "שליפת פרומפט שמור (חינמי)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "הפרומפט",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PromptSummary" } },
            },
          },
          "404": errorResponse("פרומפט לא נמצא", "not_found"),
        },
      },
    },
    "/prompts/{id}/related": {
      get: {
        summary: "שכנים ב-Memory Palace — פרומפטים קרובים בגרף (חינמי)",
        description:
          "אותו מנוע כמו גרף ה-Memory Palace בפלטפורמה: דמיון מילות מפתח (Jaccard) + שימוש משותף ב-24 שעות.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 8, maximum: 19 } },
        ],
        responses: {
          "200": {
            description: "השכנים, ממוינים לפי קרבה",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    related: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          title: { type: "string" },
                          weight: { type: "number", description: "עוצמת הקשר (גבוה = קרוב יותר)" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": errorResponse("פרומפט לא נמצא", "not_found"),
        },
      },
    },
    "/chains": {
      get: {
        summary: "שרשראות הפרומפטים השמורות של המשתמש (חינמי)",
        responses: {
          "200": {
            description: "הרשימה",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    chains: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          title: { type: "string" },
                          description: { type: ["string", "null"] },
                          steps_count: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/chains/{id}": {
      get: {
        summary: "שרשרת מלאה עם שלביה — להרצה על ידי הסוכן (חינמי)",
        description:
          "ההרצה היא באחריות הסוכן: מלא את משתני כל שלב, הרץ כל prompt_text דרך POST /enhance לפי order, והזן פלטים קדימה לפי input_from_step. כל שלב צורך קרדיט אחד.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "השרשרת",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    title: { type: "string" },
                    description: { type: ["string", "null"] },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          order: { type: "integer" },
                          title: { type: "string" },
                          mode: { type: "string" },
                          prompt_text: { type: "string" },
                          variables: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                label: { type: "string" },
                                default: { type: "string" },
                              },
                            },
                          },
                          input_from_step: { type: ["string", "null"] },
                          output_description: { type: ["string", "null"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": errorResponse("שרשרת לא נמצאה", "not_found"),
        },
      },
    },
    "/library/search": {
      get: {
        summary: "חיפוש בספרייה הציבורית — תבניות מוכחות (חינמי)",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string", maxLength: 200 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 25 } },
        ],
        responses: {
          "200": {
            description: "תבניות (כולל שמות המשתנים שלהן)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/PromptSummary" },
                          {
                            type: "object",
                            properties: {
                              use_case: { type: ["string", "null"] },
                              variables: { type: "array", items: { type: "string" } },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/templates/fill": {
      post: {
        summary: "מילוי תבנית — {משתנים} + דיווח חסרים (חינמי)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["template_id"],
                properties: {
                  template_id: { type: "string", format: "uuid" },
                  variables: { type: "object", additionalProperties: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "התבנית הממולאת",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    filled: { type: "string" },
                    missing: {
                      type: "array",
                      items: { type: "string" },
                      description: "משתנים שהוצהרו ולא סופקו — שאל את המשתמש",
                    },
                  },
                },
              },
            },
          },
          "404": errorResponse("תבנית לא נמצאה", "not_found"),
        },
      },
    },
    "/user/memory": {
      get: {
        summary: "עובדות הזיכרון של המשתמש (חינמי)",
        responses: {
          "200": {
            description: "הרשימה",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    facts: { type: "array", items: { $ref: "#/components/schemas/Fact" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "שמירת עובדה חדשה לזיכרון (חינמי, עד 100)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fact"],
                properties: {
                  fact: { type: "string", minLength: 3, maxLength: 300 },
                  category: {
                    type: "string",
                    enum: [
                      "professional",
                      "personal",
                      "preference",
                      "project",
                      "language",
                      "general",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "נשמר",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    saved: { type: "boolean" },
                    fact: { $ref: "#/components/schemas/Fact" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/feedback": {
      post: {
        summary: "משוב 👍/👎 על שדרוג (חינמי)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: {
                  rating: { type: "integer", enum: [1, -1] },
                  input_text: { type: "string", maxLength: 10000 },
                  enhanced_text: { type: "string", maxLength: 50000 },
                  mode: { type: "string", maxLength: 40 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "נשמר",
            content: {
              "application/json": {
                schema: { type: "object", properties: { saved: { type: "boolean" } } },
              },
            },
          },
        },
      },
    },
  },
} as const;

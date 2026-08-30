-- Refresh the three model_profiles rows to late-2026 official prompting
-- guidance (audited 2026-08-30 against OpenAI / Anthropic / Google docs):
--   * GPT-5.x — outcome+success-criteria hierarchy, no CoT boilerplate,
--     lean prompts, no internal contradictions.
--   * Claude (Sonnet/Opus 5) — XML sections, explain the WHY behind
--     constraints, no aggressive MUST/CRITICAL emphasis, docs-first ordering.
--   * Gemini 3.x — concise+direct (over-analyzes stuffed prompts), PTCF
--     framing, data first / question last.
-- Slugs are kept stable (gpt-5 / claude-sonnet-4 / gemini-2.5) — they are
-- API identifiers; display names carry the current family. Idempotent.

UPDATE public.model_profiles SET
  display_name = 'ChatGPT (GPT-5.x)',
  display_name_he = 'ChatGPT (GPT-5.x)',
  system_prompt_he = 'התאם את הפרומפט עבור ChatGPT (GPT-5.x): בנה היררכיה ברורה — תפקיד קצר, מטרה, קריטריוני הצלחה, אילוצים, פורמט פלט. נסח את התוצאה הרצויה ולא את תהליך החשיבה: אל תוסיף "חשוב שלב אחר שלב" — ההסקה מובנית במודל ומתבזבזת על הוראות כאלה. הקפד שאין שתי הוראות סותרות — סתירות הן מצב הכשל המרכזי של GPT-5. פרומפט רזה עדיף על חזרות ודוגמאות מיותרות. אפשר לתחום סקשנים בתגי XML או כותרות Markdown. ציין את שפת הפלט כאילוץ עליון בראש הפרומפט.'
WHERE slug = 'gpt-5';

UPDATE public.model_profiles SET
  display_name = 'Claude (Sonnet / Opus)',
  display_name_he = 'Claude (Sonnet / Opus)',
  system_prompt_he = 'התאם את הפרומפט עבור Claude: עטוף קטעים מובנים בתגיות XML — <context>, <task>, <constraints>, <output_format>, ודוגמאות בתוך <example>. לצד כל אילוץ חשוב הסבר את הסיבה ("כי הטקסט יוקרא בקול") — קלוד מכליל מהנימוק. כשיש חומר ארוך: החומר למעלה, ההנחיות והשאלה בסוף. אל תשתמש בהדגשות אגרסיביות (MUST / CRITICAL / חובה!!!) — נסח תנאים רגועים ("כאשר X, עשה Y"); ואל תערום הוראות "בדוק את עצמך" — פעם אחת מספיקה. כשנדרש עומק, בקש מפורשות "הרחב מעבר לבסיס וכלול כל פרט רלוונטי".'
WHERE slug = 'claude-sonnet-4';

UPDATE public.model_profiles SET
  display_name = 'Gemini (3.x)',
  display_name_he = 'Gemini (3.x)',
  system_prompt_he = 'התאם את הפרומפט עבור Gemini: ישיר ותמציתי — ג׳מיני מנתח-יתר פרומפטים עמוסים בטכניקות של מודלים ישנים. פתח בפרסונה קצרה ומשימה מפורשת (מסגרת PTCF: פרסונה, משימה, הקשר, פורמט). תחום סקשנים באופן עקבי — תגי XML או כותרות, לא ערבוב. בחומר ארוך: הנתונים קודם והשאלה ממש בסוף. הוסף 2–3 דוגמאות בפורמט זהה רק כשהפורמט אינו טריוויאלי. הגדר את פורמט הפלט מראש (טבלה / JSON / רשימה) ואת שפת הפלט במפורש.'
WHERE slug = 'gemini-2.5';

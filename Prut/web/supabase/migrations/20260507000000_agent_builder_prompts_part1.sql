-- Migration: Agent Builder Prompts — Part 1 (ab_031–ab_060)
-- Adds new "agents" category + 30 new AGENT_BUILDER prompts

-- 1. New category
INSERT INTO public.library_categories (id, name_en, name_he, icon, sort_order)
VALUES ('agents', 'Advanced Agents', 'סוכנים מתקדמים', 'BrainCircuit', 8)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert ab_031–ab_060
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode)
VALUES

-- ═══ קטגוריה: agents (ab_031–ab_048) ═══

('ab_031', 'מעצב System Prompt מאפס', 'agents',
 'כשצריך לכתוב system prompt מקצועי לסוכן AI חדש',
 'אתה מומחה לפרומפט אנג׳ינירינג. כתוב system prompt מלא ומקצועי לסוכן AI בתפקיד {{agent_role}} שיפעל על {{platform}} ויעזור ל-{{target_audience}}.

System prompt חייב לכלול:
- הגדרת תפקיד ברורה עם מומחיות ספציפית
- הוראות התנהגות מדורגות לפי חשיבות
- גבולות גזרה — מה הסוכן עושה ומה לא
- פורמט תשובות מוגדר: אורך, מבנה, שפה
- טיפול בשאלות מחוץ לתחום
- טון ופרסונה: {{agent_tone}}
- דוגמאות קלט/פלט אחת לפחות

השתמש בסטנדרט: Role → Context → Instructions → Constraints → Format → Examples',
 ARRAY['agent_role', 'platform', 'target_audience', 'agent_tone'],
 'System prompt מלא ומוכן להעתקה לכל LLM',
 ARRAY['הגדרת תפקיד ברורה', 'גבולות גזרה מוגדרים', 'פורמט תשובות', 'דוגמת קלט/פלט']),

('ab_032', 'אורקסטרטור Multi-Agent', 'agents',
 'תכנון מערכת של סוכנים מרובים שעובדים יחד',
 'אתה ארכיטקט מערכות AI. תכנן מערכת multi-agent לביצוע {{main_goal}} עם {{num_agents}} סוכנים.

תכנן:
- סוכן מנהל (Orchestrator) — תפקידו, כלים, קריטריוני הפניית משימות
- סוכנים מומחים — תפקיד ייחודי לכל אחד, קלט/פלט מצופה
- פרוטוקול תקשורת בין סוכנים: פורמט הודעות, handoff, שגיאות
- כלים זמינים לכל סוכן: {{tools_available}}
- זרימת עבודה: מה קורה כשסוכן נכשל
- מנגנון מניעת לולאות אינסופיות
- הגדרת תנאי עצירה ברורים
- Logging ומעקב התקדמות',
 ARRAY['main_goal', 'num_agents', 'tools_available'],
 'ארכיטקטורת multi-agent עם תפקידים, פרוטוקולים וזרימות עבודה',
 ARRAY['תפקידים ברורים לכל סוכן', 'פרוטוקול תקשורת', 'טיפול בכשלים', 'תנאי עצירה']),

('ab_033', 'מבדק ומעריך סוכן AI', 'agents',
 'בדיקת סוכן קיים לאיתור כשלים ונקודות שבירה',
 'אתה מומחה QA לסוכני AI. בנה מסגרת בדיקה מקיפה לסוכן: {{agent_description}}.

תרחישי בדיקה נדרשים:
- {{test_scenarios}} — תרחישים מייצגים שצוינו
- תרחישי Edge Cases: קלט ריק, קלט ארוך מאוד, בקשות סותרות
- ניסיונות Jailbreak: 5 דפוסי תקיפה שכיחים
- בדיקות עקביות: שאלה זהה 3 פעמים — האם התשובה עקבית?
- בדיקת גבולות: מה קורה כשמבקשים מחוץ לתחום
- קריטריוני הצלחה: {{success_criteria}}
- טבלת ציונים: Pass/Fail לכל תרחיש
- המלצות שיפור לכל כשל שנמצא',
 ARRAY['agent_description', 'test_scenarios', 'success_criteria'],
 'מסגרת בדיקה עם תרחישים, קריטריונים וטבלת תוצאות',
 ARRAY['כיסוי edge cases', 'בדיקות עקביות', 'בדיקות אבטחה', 'המלצות שיפור']),

('ab_034', 'מייעל Prompt קיים', 'agents',
 'שיפור system prompt שלא מניב את התוצאות הרצויות',
 'אתה מומחה לאופטימיזציה של prompts. נתח ושפר את ה-system prompt הבא:

PROMPT_לשיפור:
{{existing_prompt}}

בעיה מדווחת: {{problem_description}}
התנהגות רצויה: {{desired_behavior}}

עבוד לפי שלבים:
1. ניתוח — מה חסר, מה סותר, מה עמום
2. אבחון — סיבת השורש לבעיה
3. פתרון — 3 גרסאות משופרות מדורגות לפי אגרסיביות השינוי
4. הסבר — מה שינית ולמה
5. מדידה — איך לוודא שהשיפור עבד
6. גרסה מומלצת אחת עם הסבר הבחירה',
 ARRAY['existing_prompt', 'problem_description', 'desired_behavior'],
 '3 גרסאות משופרות + ניתוח + גרסה מומלצת',
 ARRAY['ניתוח שורש הבעיה', '3 גרסאות פתרון', 'הסבר השינויים', 'מדד הצלחה']),

('ab_035', 'מעצב זרימת עבודה אוטונומית', 'agents',
 'פירוק משימה מורכבת לצעדי סוכן ברורים',
 'אתה מתכנן תהליכים לסוכני AI. פרק את המשימה הבאה לזרימת עבודה אוטונומית:

משימה: {{task_description}}
כלים זמינים: {{available_tools}}
רמת אוטונומיה: {{autonomy_level}}

בנה:
- שלבים ממוספרים עם כניסות/יציאות ברורות לכל שלב
- עצי החלטה — בכל צומת: מה הקריטריון, מה נתיב A, מה נתיב B
- נקודות Checkpoint שבהן הסוכן מדווח לאדם
- מנגנוני Fallback לכל כשל אפשרי
- הגדרת "סיום מוצלח" ו"סיום חלקי"
- הערכת מספר ה-API calls הנדרשים
- זיהוי צווארי בקבוק והצעות לייעול',
 ARRAY['task_description', 'available_tools', 'autonomy_level'],
 'תרשים זרימה מפורט עם שלבים, החלטות ו-Fallbacks',
 ARRAY['שלבים ברורים', 'עצי החלטה', 'Fallback לכל שלב', 'הגדרת סיום']),

('ab_036', 'כותב Tool Schemas ל-API', 'agents',
 'כתיבת הגדרות כלים ל-API ו-MCP לשימוש סוכנים',
 'אתה מפתח כלים לסוכני AI. כתוב הגדרת Tool Schema מלאה עבור: {{tool_purpose}}.

עבור כל כלי:
- שם ותיאור ברורים (החיוניים לבחירה נכונה ע"י הסוכן)
- פרמטרי קלט: {{input_parameters}} — סוג, חובה/אופציונלי, תיאור, דוגמה
- פורמט פלט: {{output_format_desc}} — מבנה, סוגי שגיאה, קודי סטטוס
- דוגמת קריאה ותגובה מלאות
- הגדרת מתי להשתמש ומתי לא להשתמש בכלי
- הגבלות Rate Limit ו-Timeout
- פורמטים: OpenAI function calling + Anthropic tool use',
 ARRAY['tool_purpose', 'input_parameters', 'output_format_desc'],
 'Tool Schema מלא ב-2 פורמטים: OpenAI + Anthropic',
 ARRAY['תיאור ברור לסוכן', 'פרמטרים מלאים', 'דוגמת קריאה', 'מדיניות שגיאות']),

('ab_037', 'סוכן ReAct — חשיבה ופעולה', 'agents',
 'בניית סוכן שמיישם לולאת Reason-Act-Observe',
 'אתה מומחה ל-Agentic AI. בנה סוכן ReAct שמבצע: {{task}}.

מבנה לולאת ReAct:
Thought: [ניתוח המצב הנוכחי ומה צריך לעשות]
Action: [שם הכלי + פרמטרים]
Observation: [מה חזר מהכלי]
... (חזרה עד להשלמה)
Final Answer: [תשובה סופית]

כלים זמינים: {{tools_list}}
מספר איטרציות מקסימלי: {{max_iterations}}

הסוכן חייב:
- להסביר את חשיבתו לפני כל פעולה
- לבדוק את תוצאת כל כלי לפני ההמשך
- לדעת מתי לעצור ולדווח על חוסר יכולת
- לא לחזור על אותה פעולה פעמיים',
 ARRAY['task', 'tools_list', 'max_iterations'],
 'סוכן ReAct מלא עם לולאת חשיבה-פעולה-תצפית',
 ARRAY['תיעוד חשיבה', 'שימוש נכון בכלים', 'מגבלת איטרציות', 'תשובה סופית ברורה']),

('ab_038', 'מעצב מערכת זיכרון לסוכן', 'agents',
 'תכנון זיכרון קצר וארוך טווח לסוכן AI',
 'אתה ארכיטקט זיכרון לסוכני AI. עצב מערכת זיכרון לסוכן מסוג {{agent_type}}.

מרכיבי הזיכרון:
1. זיכרון קצר-טווח (In-Context): מה לשמור, מה לדחוס, מה למחוק
2. זיכרון ארוך-טווח ({{memory_duration}}): פורמט אחסון, מנגנון שליפה, עדכון
3. ניהול חלון הקשר ({{context_window}} tokens): סדרי עדיפויות, Summarization
4. זיכרון סמנטי: Embedding, Vector DB, סף רלוונטיות
5. Episodic Memory: שיחות עבר, למידה מטעויות
6. מנגנון שכחה: מה לא צריך לשמור לנצח

כלול דוגמת מימוש ב-Pseudocode',
 ARRAY['agent_type', 'memory_duration', 'context_window'],
 'ארכיטקטורת זיכרון מלאה עם 5 שכבות ודוגמת מימוש',
 ARRAY['5 שכבות זיכרון', 'ניהול חלון הקשר', 'מנגנון שליפה', 'מנגנון שכחה']),

('ab_039', 'בודק בטיחות ו-Guardrails', 'agents',
 'סריקת system prompt לפגיעויות ובניית הגנות',
 'אתה מומחה לאבטחת סוכני AI. סרוק את ה-system prompt הבא ובנה Guardrails:

{{system_prompt_to_review}}

רמת סיכון: {{risk_level}} | קהל: {{audience}}

סרוק ל:
- Prompt Injection: האם ניתן לדרוס ההוראות?
- Jailbreak Patterns: Role-play, "מצב תחזוקה", DAN-style
- Data Leakage: האם הסוכן יכול לחשוף מידע רגיש?
- Scope Creep: האם ניתן לגרום לו לצאת מתחומו?
- Social Engineering: האם ניתן לתמרן אותו?

עבור כל פגיעות שנמצאה:
- דרגת חומרה (קריטי/גבוה/בינוני/נמוך)
- הדגמת תקיפה
- תיקון מדויק ב-prompt',
 ARRAY['system_prompt_to_review', 'risk_level', 'audience'],
 'דוח פגיעויות + תיקונים + prompt מחוסן',
 ARRAY['זיהוי Injection', 'בדיקת Jailbreak', 'מניעת דליפת מידע', 'prompt מתוקן']),

('ab_040', 'מעצב פרסונה לסוכן', 'agents',
 'הגדרת אישיות, טון וסגנון לסוכן AI',
 'אתה מעצב פרסונות לסוכני AI. בנה פרסונה מלאה לסוכן של {{brand_name}} בתעשיית {{industry}}.

הפרסונה כוללת:
- שם וזהות: שם הסוכן, מין/ניטרלי, גיל מרומז
- קול מותג: {{brand_voice}} — 5 תארים, 5 דברים שלא אומר
- סגנון תקשורת: רשמי/לא-רשמי, אורך תשובות, שימוש באמוג׳י
- ערכים מרכזיים: 3 ערכים שמנחים כל תשובה
- Persona Card: "אני X שעוזר ל-Y לעשות Z"
- תגובות מוכנות לסיטואציות רגישות: כעס, תסכול, דרישות בלתי אפשריות
- 5 דוגמאות On-Brand vs Off-Brand',
 ARRAY['brand_name', 'industry', 'brand_voice'],
 'Persona Card מלאה + מדריך קול + דוגמאות On/Off Brand',
 ARRAY['זהות ברורה', 'קול מותג עקבי', 'טיפול בסיטואציות רגישות', 'דוגמאות']),

('ab_041', 'מאבחן כשלי סוכן AI', 'agents',
 'ניתוח מדוע סוכן AI לא מתנהג כפי שצפוי',
 'אתה מומחה לאבחון סוכני AI. אבחן מדוע הסוכן הבא כושל:

תיאור הסוכן: {{agent_description}}
דוגמאות לכשל: {{problem_examples}}
התנהגות מצופה: {{expected_behavior}}

בצע:
1. ניתוח שורש — 5 סיבות אפשריות מדורגות לפי סבירות
2. בדיקת Prompt — האם ההוראות ברורות? סותרות? חסרות?
3. בדיקת מודל — האם המשימה מתאימה ליכולות המודל?
4. ניתוח Context — האם המידע הנדרש נמצא בהקשר?
5. תסריטי שחזור — כיצד לבדות כל השערה
6. תוכנית תיקון — לכל סיבה, פתרון מדויק',
 ARRAY['agent_description', 'problem_examples', 'expected_behavior'],
 'דוח אבחון עם 5 סיבות אפשריות + תוכנית תיקון',
 ARRAY['ניתוח שורש', 'בדיקת prompt', 'תסריטי שחזור', 'תוכנית תיקון']),

('ab_042', 'בונה RAG Pipeline', 'agents',
 'תכנון מערכת שליפת מידע לסוכן ידע',
 'אתה ארכיטקט RAG. תכנן RAG Pipeline לסוכן בתחום {{knowledge_domain}} עם מקורות: {{data_sources}}.

תכנן:
1. Ingestion: פירמוט, ניקוי, פיצול מסמכים (Chunking Strategy)
2. Embedding: בחירת מודל, אסטרטגיית וקטוריזציה
3. Storage: ארכיטקטורת Vector DB מתאימה
4. Retrieval: {{query_types}} — Semantic, Hybrid, MMR
5. Reranking: שיפור רלוונטיות לאחר שליפה
6. Generation: הזרקת Context — מיקום, אורך, פורמט
7. Evaluation: מדדי הערכה: Faithfulness, Relevance, Groundedness
8. עלות/ביצועים: טבלת השוואה בין גישות',
 ARRAY['knowledge_domain', 'data_sources', 'query_types'],
 'ארכיטקטורת RAG מלאה עם 8 שכבות + השוואת גישות',
 ARRAY['אסטרטגיית Chunking', 'שיטת Retrieval', 'Reranking', 'מדדי הערכה']),

('ab_043', 'כותב Evaluation Framework', 'agents',
 'בניית מסגרת הערכה ומדידה לסוכן AI',
 'אתה מומחה להערכת מודלי AI. בנה Evaluation Framework לסוכן שמבצע: {{agent_task}}.

ממדי הערכה: {{evaluation_dimensions}}
גודל דאטאסט בדיקה: {{test_dataset_size}} דוגמאות

המסגרת כוללת:
- הגדרת מדדים כמותיים לכל ממד (0-10)
- שאלות הערכה ל-LLM-as-Judge
- בנצ׳מרק בסיסי (Baseline) להשוואה
- תוכנית דגימת נתונים — איך לבנות {{test_dataset_size}} מקרי בדיקה מגוונים
- Rubric להערכה ידנית עם דוגמאות Anchor
- דשבורד מדדים מוצע: מה לעקוב לאורך זמן
- Regression Testing: זיהוי ירידה בביצועים',
 ARRAY['agent_task', 'evaluation_dimensions', 'test_dataset_size'],
 'Framework הערכה מלאה עם מדדים, Rubric ודשבורד',
 ARRAY['מדדים כמותיים', 'LLM-as-Judge', 'Regression Testing', 'Baseline']),

('ab_044', 'מתכנן סוכן Production', 'agents',
 'ארכיטקטורה מלאה לסוכן AI מוכן לסביבת ייצור',
 'אתה ארכיטקט AI Production. תכנן סוכן מוכן ל-Production עבור: {{use_case}}.

עומס צפוי: {{expected_load}} בקשות/יום
מערכות אינטגרציה: {{integration_systems}}

ארכיטקטורה כוללת:
- בחירת מודל: עלות vs. ביצועים עבור העומס הצפוי
- ניהול Context: Caching, Compression, Summarization
- Fallback Chain: מה קורה כשהמודל הראשי נופל
- Rate Limiting: הגנה על ה-API
- Observability: Logging, Tracing, Alerting
- Error Handling: כל סוג שגיאה + טיפול
- Cost Controls: תקרת הוצאה + התראות
- CI/CD: איך לפרוס עדכוני prompt בבטחה',
 ARRAY['use_case', 'expected_load', 'integration_systems'],
 'ארכיטקטורת Production מלאה עם Fallbacks, Observability ו-Cost Controls',
 ARRAY['בחירת מודל מנומקת', 'Fallback Chain', 'Observability', 'Cost Controls']),

('ab_045', 'מחשב עלות תפעול סוכן', 'agents',
 'אומדן עלויות tokens ו-API לסוכן לפני הפעלה',
 'אתה מומחה לאופטימיזציה עלויות AI. חשב ואמוד את עלות תפעול הסוכן הבא:

מודל: {{model_name}}
ממוצע tokens לקריאה: {{avg_tokens_per_call}}
נפח יומי: {{daily_volume}} קריאות

חשב:
- עלות יומית / חודשית / שנתית בדולרים
- פירוט: Input tokens, Output tokens, Cache hits
- השוואה ל-3 מודלים חלופיים (עלות vs. איכות)
- אסטרטגיות חיסכון: Prompt Compression, Caching, Batching
- Break-even: מאיזה נפח כדאי לעבור לכל מודל
- תרחיש גרוע (×3 נפח) ותרחיש אופטימי (×0.5)
- המלצת מודל מנומקת לפי הנתונים',
 ARRAY['model_name', 'avg_tokens_per_call', 'daily_volume'],
 'דוח עלויות מלא עם השוואת מודלים, חיסכון והמלצה',
 ARRAY['חישוב מדויק', 'השוואת 3 מודלים', 'אסטרטגיות חיסכון', 'המלצה מנומקת']),

('ab_046', 'כותב תיעוד לסוכן AI', 'agents',
 'יצירת מדריך שימוש ו-README מקצועי לסוכן',
 'אתה כותב תיעוד טכני. כתוב תיעוד מלא לסוכן AI בשם {{agent_name}}.

יכולות הסוכן: {{capabilities}}
קהל היעד: {{target_developers}}

התיעוד כולל:
- Overview: מה הסוכן עושה ב-2 משפטים
- Getting Started: דוגמת שימוש ב-5 שורות
- Capabilities: טבלת יכולות עם דוגמות קלט/פלט
- Configuration: משתני הגדרה + ערכי ברירת מחדל
- Limitations: מה הסוכן לא יכול לעשות + Workarounds
- Error Reference: קודי שגיאה + פתרונות
- Examples: 3 תרחישי שימוש מלאים
- Changelog: מבנה לעדכונים עתידיים',
 ARRAY['agent_name', 'capabilities', 'target_developers'],
 'README מלא + API Reference + 3 דוגמאות שימוש',
 ARRAY['Overview ברור', 'Getting Started', 'Limitations', 'Error Reference']),

('ab_047', 'יוצר Dataset לאימון מודל', 'agents',
 'בניית דאטאסט איכותי ל-Fine-tuning או Evaluation',
 'אתה מומחה לאימון מודלי AI. בנה דאטאסט ל-{{task_type}} עם {{num_examples}} דוגמאות באיכות {{quality_level}}.

עבור כל דוגמה בנה:
- Instruction: הוראה ברורה וחד-משמעית
- Input: קלט מציאותי ומגוון
- Output: פלט אידיאלי שסוכן מומחה היה נותן
- Edge Cases: 20% מהדוגמאות — קלטים קשים, גבוליים, לא צפויים
- Negative Examples: 10% — דוגמאות שליליות עם הסבר למה הן שגויות

קריטריוני איכות:
- גיוון: כיסוי מלא של תחום המשימה
- עקביות: אותה משימה → אותה רמת איכות
- פורמט: JSONL מוכן ל-OpenAI Fine-tuning API',
 ARRAY['task_type', 'num_examples', 'quality_level'],
 'דאטאסט JSONL מוכן לאימון עם גיוון ו-Edge Cases',
 ARRAY['גיוון דוגמאות', 'Edge Cases', 'דוגמאות שליליות', 'פורמט JSONL']),

('ab_048', 'ממפה יכולות ומגבלות סוכן', 'agents',
 'מיפוי מה הסוכן יכול ולא יכול לעשות לפני הפצה',
 'אתה מומחה להערכת יכולות AI. מפה את יכולות ומגבלות הסוכן הבא:

תיאור הסוכן: {{agent_description}}
מודל בשימוש: {{model_used}}
חלון הקשר: {{context_window}} tokens

בנה מפה בפורמט טבלה:
| יכולת | רמה (1-5) | הערות |
עמודות יכולות: הבנת שפה, חשיבה לוגית, ידע עולמי, קוד, מתמטיקה, עקביות, זיכרון

מגבלות ידועות:
- Knowledge Cutoff ועדכניות מידע
- Hallucination Risk לתחום זה
- משימות שמעל לרמת המודל
- גבולות אורך קלט/פלט

Use-case fit: האם המודל מתאים למשימה? המלצה לחלופה אם לא',
 ARRAY['agent_description', 'model_used', 'context_window'],
 'מפת יכולות טבולרית + מגבלות + המלצת התאמה',
 ARRAY['דירוג יכולות', 'מגבלות ידועות', 'Hallucination Risk', 'המלצת מודל']),

-- ═══ קטגוריה: dev (ab_049–ab_058) ═══

('ab_049', 'סוכן העברת קוד (Migration)', 'dev',
 'הגירת Codebase משפת תכנות או framework אחד לאחר',
 'אתה מומחה להגירת קוד. בנה סוכן להגירת קוד מ-{{source_language}} ל-{{target_language}} עבור Codebase בגודל {{codebase_size}}.

הסוכן צריך:
- לנתח את הקוד המקורי ולזהות פטרנים שכיחים
- למפות ספריות ותלויות: מקביל, חלופי, ללא מקבילה
- לבצע המרה שיטתית: שמות משתנים, syntax, idioms
- לשמר לוגיקה עסקית ללא שינוי בעת ההגירה
- לזהות קוד שדורש תרגום ידני ולסמן אותו
- לכתוב unit tests מקבילים לוודא שקילות
- ליצור דוח הגירה: כמה קבצים, כמה שורות, כמה דורשים בדיקה
- לספק checklist לאימות לאחר ההגירה',
 ARRAY['source_language', 'target_language', 'codebase_size'],
 'סוכן הגירה עם מיפוי תלויות, המרה אוטומטית ודוח',
 ARRAY['שמירת לוגיקה עסקית', 'מיפוי ספריות', 'בדיקות שקילות', 'דוח הגירה']),

('ab_050', 'סוכן ביקורת אבטחת קוד', 'dev',
 'סריקת קוד לאיתור פגיעויות אבטחה ו-CVEs',
 'אתה מומחה AppSec. בנה סוכן לביקורת אבטחה של {{tech_stack}} לפי סטנדרט {{security_standards}}.

הסוכן סורק:
- OWASP Top 10: Injection, XSS, IDOR, Auth Broken, SSRF ועוד
- חשיפת Secrets: API Keys, Passwords בקוד
- תלויות עם CVE ידועים
- לוגיקת אימות ו-Authorization
- ניהול Session ו-Cookie Security
- הגנה על מידע רגיש: הצפנה, hashing, logging
- חומרה: {{severity_threshold}} ומעלה — בלוק, מתחת — אזהרה
- לכל ממצא: שורת קוד, הסבר, CVSS Score, תיקון מוצע',
 ARRAY['tech_stack', 'security_standards', 'severity_threshold'],
 'דוח אבטחה עם ממצאים, CVSS Scores ותיקונים',
 ARRAY['OWASP Top 10', 'גילוי Secrets', 'CVE Dependencies', 'תיקון מוצע']),

('ab_051', 'סוכן כתיבת תיעוד API', 'dev',
 'יצירת תיעוד מלא ומקצועי ל-API מקוד קיים',
 'אתה כותב תיעוד API. בנה סוכן שיכתוב תיעוד מלא ל-{{api_name}} עם {{endpoints_count}} endpoints בפורמט {{documentation_format}}.

לכל Endpoint:
- שם ותיאור שימוש
- HTTP Method + Path + URL Parameters
- Request Body: Schema מלא עם סוגים ותיאורים
- Response Schema: הצלחה + כל קודי שגיאה
- דוגמת curl / JavaScript / Python
- Authentication הנדרש
- Rate Limit ו-Pagination
- Webhooks ו-Async patterns אם רלוונטי

פורמט: {{documentation_format}} (OpenAPI 3.1 / Markdown / Postman Collection)',
 ARRAY['api_name', 'endpoints_count', 'documentation_format'],
 'תיעוד API מלא בפורמט הנבחר עם דוגמאות לכל endpoint',
 ARRAY['Schema מלא לכל endpoint', 'דוגמאות קוד', 'קודי שגיאה', 'Authentication']),

('ab_052', 'סוכן יצירת Unit Tests', 'dev',
 'כתיבת בדיקות יחידה אוטומטית לקוד קיים',
 'אתה מומחה TDD. בנה סוכן שכותב unit tests ב-{{programming_language}} עם framework {{testing_framework}} ויעד כיסוי {{coverage_target}}%.

הסוכן כותב:
- Happy Path: כל תרחיש הצלחה
- Edge Cases: ערכי גבול, ריק, null, מקסימום
- Error Cases: כל סוג שגיאה אפשרי
- Integration: תרחישים עם תלויות חיצוניות (Mocked)
- Performance: בדיקות timeout וזמן תגובה קריטי
- לכל בדיקה: Arrange / Act / Assert ברור
- תיאור Failing Tests לפני implementation (TDD)
- דוח כיסוי: אילו שורות לא מכוסות ולמה',
 ARRAY['programming_language', 'testing_framework', 'coverage_target'],
 'סוויטת בדיקות מלאה עם Happy/Edge/Error paths + דוח כיסוי',
 ARRAY['כיסוי יעד', 'Edge Cases', 'Error Cases', 'AAA Pattern']),

('ab_053', 'סוכן אופטימיזציית Database', 'dev',
 'זיהוי ושיפור בעיות ביצועים בשאילתות DB',
 'אתה DBA מומחה לביצועים. בנה סוכן לאופטימיזציה של {{database_type}} שסובל מ-{{performance_issues}}.

Schema הקיים: {{schema_description}}

הסוכן:
- מנתח Slow Query Log ומדרג לפי השפעה
- מזהה Missing Indexes ומציע CREATE INDEX ספציפיים
- מזהה N+1 Queries ו-Full Table Scans
- מציע Query Rewriting עם EXPLAIN ANALYZE לפני ואחרי
- מזהה טבלאות שדורשות Partitioning
- בודק Connection Pool ו-Cache Hit Rate
- מציג ROI: כמה שיפור ביצועים כל אופטימיזציה תביא
- מייצר Migration Script מוכן לביצוע',
 ARRAY['database_type', 'performance_issues', 'schema_description'],
 'דוח אופטימיזציה עם שאילתות, Indexes ו-Migration Scripts',
 ARRAY['ניתוח Slow Queries', 'Index מוצע', 'Query Rewriting', 'ROI ברור']),

('ab_054', 'סוכן נגישות Frontend', 'dev',
 'בדיקה ושיפור נגישות אתרים לפי WCAG',
 'אתה מומחה נגישות. בנה סוכן לבדיקת נגישות של {{framework}} בסטנדרט WCAG {{wcag_level}}.

רכיבים לבדיקה: {{component_types}}

הסוכן בודק:
- תגיות Semantic HTML ו-Landmarks נכונים
- Alt Text לתמונות — נוכחות ואיכות
- יחסי Contrast צבעים (4.5:1 מינימום)
- Navigation עם מקלדת — Tab Order, Focus Indicators
- ARIA Labels, Roles ו-Live Regions
- Forms: Labels, Error Messages, Required Fields
- Screen Reader: Announcements, הסתרות נכונות
- לכל ממצא: WCAG criterion, חומרה, תיקון קוד מיידי',
 ARRAY['framework', 'wcag_level', 'component_types'],
 'דוח נגישות עם ממצאים, WCAG criteria ותיקוני קוד',
 ARRAY['WCAG compliance', 'Keyboard Navigation', 'Screen Reader', 'Color Contrast']),

('ab_055', 'סוכן ייעוץ ארכיטקטורת מערכת', 'dev',
 'ייעוץ ארכיטקטורי למערכת חדשה או קיימת',
 'אתה Software Architect בכיר. ייעץ לגבי ארכיטקטורה של {{system_type}} בדרישות סקייל {{scale_requirements}}.

אילוצים טכניים: {{tech_constraints}}

נתח ועץ:
- Monolith vs. Microservices vs. Modular Monolith — עם נימוק
- בחירת Data Store: SQL, NoSQL, Graph, Time-series — לפי Use Case
- Communication Patterns: REST, GraphQL, gRPC, Event-Driven
- Caching Strategy: CDN, Application Cache, DB Cache
- Deployment: Serverless, Containers, Hybrid — עלות/מורכבות
- Scalability Plan: כיצד הארכיטקטורה מתרחבת ×10 ו-×100
- Trade-off Matrix: טבלה להשוואת גישות
- ADR (Architecture Decision Record) לקרר הגישה שנבחרה',
 ARRAY['system_type', 'scale_requirements', 'tech_constraints'],
 'ייעוץ ארכיטקטורי עם Trade-off Matrix ו-ADR',
 ARRAY['נימוק בחירה', 'Trade-off Matrix', 'Scalability Plan', 'ADR']),

('ab_056', 'סוכן Bug Triage ומיון', 'dev',
 'מיון, סיווג וסדר עדיפויות לבאגים נכנסים',
 'אתה Lead Engineer לניהול Bug Queue. בנה סוכן triage לבאגים ב-{{product_type}} עבור צוות של {{team_size}} מפתחים עם {{bug_tracking_tool}}.

לכל באג שנכנס, הסוכן:
- מסווג: Type (Bug/Regression/Performance/Security)
- מדרג חומרה: P0 (Production Down) → P3 (Cosmetic)
- מעריך: משתמשים מושפעים, רכיבים מעורבים
- מזהה: דופליקטים לבאגים קיימים
- מבקש: מידע חסר לפני Triage (Repro steps, env, version)
- מנהל: Queue עדיפויות שבועי + דוח KPIs (MTTR, Open Rate)
- מקצה: לפי תחום בעלות ועומס הצוות',
 ARRAY['product_type', 'team_size', 'bug_tracking_tool'],
 'סוכן Triage עם סיווג, עדיפויות, ניהול Queue ודוח KPIs',
 ARRAY['סיווג P0-P3', 'זיהוי דופליקטים', 'בקשת מידע חסר', 'KPIs ו-MTTR']),

('ab_057', 'סוכן תכנון CI/CD Pipeline', 'dev',
 'תכנון ואופטימיזציה של pipeline לפיתוח ופריסה',
 'אתה DevOps Engineer בכיר. תכנן CI/CD Pipeline ל-{{tech_stack}} בפריסה ל-{{deployment_target}} עם תדירות שחרור {{release_frequency}}.

ה-Pipeline כולל:
- Stages: Build → Test → Security Scan → Staging Deploy → Smoke Tests → Prod
- Triggers: Push, PR, Schedule, Manual
- Testing Gates: Unit, Integration, E2E — עם סף כשל
- Security: SAST, SCA, Secret Scanning — חובה לפני Merge
- Deployment Strategy: Blue/Green, Canary, Rolling — לפי הצורך
- Rollback: גלאי אוטומטי + תהליך rollback חד-כפתורי
- Notifications: מי מקבל מה בכל אירוע
- YAML מוכן ל-GitHub Actions / GitLab CI (לפי הבחירה)',
 ARRAY['tech_stack', 'deployment_target', 'release_frequency'],
 'Pipeline מלא עם Stages, Gates, Rollback ו-YAML מוכן',
 ARRAY['Security Gates', 'Testing Gates', 'Rollback אוטומטי', 'YAML מוכן']),

('ab_058', 'סוכן מדריך Open Source', 'dev',
 'מדריך תרומה לפרויקטי קוד פתוח מרמת המתחיל',
 'אתה מנחה קוד פתוח מנוסה. בנה סוכן שמנחה {{experience_level}} לתרום לפרויקטי {{project_type}} בסוג תרומה: {{contribution_type}}.

הסוכן מנחה:
- מציאת פרויקט מתאים: Hacktoberfest, Good First Issue, up-for-grabs
- קריאת CONTRIBUTING.md — מה הפרויקט דורש
- הקמת סביבת פיתוח מקומית צעד-אחר-צעד
- Fork → Branch → עבודה → Tests → PR
- כתיבת PR Description שמתקבל: מה שוניתה, למה, Testing
- תהליך Code Review: איך להגיב לביקורת
- טיפול במקרי קצה: Merge Conflict, Outdated PR, Rejection
- מעקב אחרי תרומות קודמות ובניית מוניטין',
 ARRAY['experience_level', 'project_type', 'contribution_type'],
 'מדריך שלב-אחר-שלב לתרומה מוצלחת לקוד פתוח',
 ARRAY['מציאת פרויקט מתאים', 'הקמת סביבה', 'כתיבת PR איכותי', 'קבלת Code Review'])

ON CONFLICT (id) DO NOTHING;

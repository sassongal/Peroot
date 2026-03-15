-- ============================================
-- 30 Deep Research Prompts for Peroot Public Library
-- capability_mode: deep_research
-- Language: Hebrew
-- ============================================

-- 1. Market Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_001',
  'מחקר שוק מקיף',
  'general',
  'ביצוע מחקר שוק מעמיק על תעשייה או מוצר ספציפי',
  'בצע מחקר שוק מקיף על {{industry}} בשוק {{market}}. המחקר צריך לכלול:
- גודל השוק ומגמות צמיחה בשנים האחרונות
- שחקנים מרכזיים ונתחי שוק
- מגמות צרכניות ושינויים בהתנהגות קניה
- חסמי כניסה והזדמנויות לשחקנים חדשים
- תחזית לשלוש עד חמש שנים קדימה
- המלצות אסטרטגיות מבוססות על הממצאים
התמקד בנתונים עדכניים ומקורות אמינים. הצג את המידע בצורה מובנית עם טבלאות וגרפים כאשר רלוונטי.',
  ARRAY['industry', 'market'],
  'דוח מחקר שוק מובנה עם סיכום מנהלים, ממצאים, ניתוח והמלצות',
  ARRAY['נתונים מגובים במקורות', 'ניתוח SWOT', 'תחזית עתידית', 'המלצות מעשיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "research"}'::jsonb,
  true
);

-- 2. Competitive Analysis
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_002',
  'ניתוח מתחרים מעמיק',
  'marketing',
  'ניתוח תחרותי מקיף של מתחרים בתעשייה',
  'בצע ניתוח מתחרים מקיף עבור {{company_name}} בתחום {{industry}}. המתחרים המרכזיים לניתוח: {{competitors}}.
לכל מתחרה נתח:
- מודל עסקי וערך מוצע ייחודי
- נקודות חוזק וחולשה
- אסטרטגיית תמחור ומיצוב בשוק
- נוכחות דיגיטלית ואסטרטגיית שיווק
- חוויית לקוח ושירות
- חדשנות וטכנולוגיה
- ביצועים פיננסיים (אם זמין)
סכם עם מטריצת השוואה ו-Competitive Positioning Map. הצע הזדמנויות לבידול.',
  ARRAY['company_name', 'industry', 'competitors'],
  'דוח ניתוח תחרותי עם מטריצות השוואה, SWOT לכל מתחרה, והמלצות',
  ARRAY['השוואה עניינית', 'מקורות מידע', 'המלצות אסטרטגיות', 'מטריצת מיצוב'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "competitive-analysis"}'::jsonb,
  true
);

-- 3. Technology Trends
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_003',
  'מחקר מגמות טכנולוגיות',
  'dev',
  'חקירת מגמות טכנולוגיות ואימוצן בתעשייה',
  'בצע מחקר מעמיק על מגמות טכנולוגיות בתחום {{technology_domain}} והשפעתן על {{industry}}.
חקור:
- טכנולוגיות מובילות ורמת בשלות (Gartner Hype Cycle)
- שיעורי אימוץ בתעשייה ומקרי בוחן מוצלחים
- השקעות ומימון בתחום בשנה האחרונה
- שחקנים טכנולוגיים מובילים וסטארטאפים בולטים
- אתגרים וחסמי אימוץ
- השפעה צפויה על שוק העבודה והמיומנויות הנדרשות
- תחזית לשנתיים עד חמש שנים קדימה
הצג דוגמאות קונקרטיות ומספרים מגובים.',
  ARRAY['technology_domain', 'industry'],
  'דוח מגמות עם ציר זמן, ניתוח בשלות, מקרי בוחן ותחזית',
  ARRAY['נתונים עדכניים', 'מקרי בוחן', 'תחזית מגובה', 'המלצות יישומיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "technology"}'::jsonb,
  true
);

-- 4. Academic Literature Review
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_004',
  'סקירת ספרות אקדמית',
  'education',
  'סקירת ספרות אקדמית מקיפה בנושא מחקרי',
  'בצע סקירת ספרות אקדמית מקיפה בנושא {{research_topic}} בתחום {{academic_field}}.
הסקירה צריכה לכלול:
- רקע תיאורטי ומושגי יסוד
- סקירה כרונולוגית של ההתפתחות המחקרית בנושא
- גישות מתודולוגיות עיקריות שנעשה בהן שימוש
- ממצאים מרכזיים וקונסנזוס מחקרי (אם קיים)
- מחלוקות ופערים במחקר הקיים
- מגמות מחקריות עכשוויות
- הצעות לכיווני מחקר עתידיים
ציין מקורות רלוונטיים בפורמט APA. התמקד במאמרים מ-10 השנים האחרונות.',
  ARRAY['research_topic', 'academic_field'],
  'סקירת ספרות מובנית עם ביבליוגרפיה, ניתוח נושאי וזיהוי פערים',
  ARRAY['מקורות אקדמיים', 'מבנה כרונולוגי', 'זיהוי פערים', 'הצעות מחקר'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "academic"}'::jsonb,
  true
);

-- 5. Financial Analysis
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_005',
  'ניתוח פיננסי של חברה',
  'general',
  'ניתוח פיננסי מקיף של חברה או תעשייה',
  'בצע ניתוח פיננסי מקיף של {{company_or_sector}} בהקשר של {{market_context}}.
הניתוח צריך לכלול:
- סקירת הכנסות, רווחיות ומגמות צמיחה
- ניתוח יחסים פיננסיים מרכזיים (רווחיות, נזילות, מינוף, יעילות)
- השוואה לממוצע ענפי ולמתחרים
- ניתוח תזרים מזומנים ויציבות פיננסית
- הערכת שווי (אם רלוונטי) - מכפילים, DCF
- גורמי סיכון והזדמנות
- תחזית ביצועים לשנה הקרובה
הצג נתונים בטבלאות ושתמש בגרפים להמחשה.',
  ARRAY['company_or_sector', 'market_context'],
  'דוח ניתוח פיננסי עם טבלאות יחסים, גרפי מגמות והמלצות',
  ARRAY['נתונים מדויקים', 'יחסים פיננסיים', 'השוואה ענפית', 'תחזית מבוססת'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "finance"}'::jsonb,
  true
);

-- 6. Consumer Behavior Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_006',
  'מחקר התנהגות צרכנים',
  'marketing',
  'חקירת דפוסי התנהגות צרכנים בשוק ספציפי',
  'בצע מחקר מעמיק על התנהגות צרכנים בתחום {{product_category}} עבור קהל יעד {{target_audience}} בשוק {{market}}.
חקור:
- דפוסי קניה ותהליך קבלת החלטות
- גורמים המשפיעים על בחירת מותג ומוצר
- ערוצי מידע ונקודות מגע מועדפים
- רגישות למחיר ונכונות לשלם
- העדפות דיגיטל מול חנות פיזית
- השפעת רשתות חברתיות וביקורות
- שינויים בהרגלי צריכה בשנים האחרונות
- פרסונות צרכניות מרכזיות (3-5 פרסונות)
הצע תובנות שיווקיות מעשיות על בסיס הממצאים.',
  ARRAY['product_category', 'target_audience', 'market'],
  'דוח התנהגות צרכנים עם פרסונות, מסע לקוח ותובנות שיווקיות',
  ARRAY['פרסונות מפורטות', 'נתוני שוק', 'תובנות מעשיות', 'מגמות צריכה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "consumer-research"}'::jsonb,
  true
);

-- 7. Industry Report
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_007',
  'דוח תעשייתי מקיף',
  'general',
  'הכנת דוח תעשייתי מקיף על סקטור ספציפי',
  'הכן דוח תעשייתי מקיף על סקטור {{industry_sector}} ב-{{geography}}.
הדוח צריך לכלול:
- סקירה כללית של התעשייה - הגדרה, היקף ומבנה
- גודל שוק, שיעור צמיחה ותחזיות
- שרשרת ערך וזרימת מוצרים/שירותים
- רגולציה ומדיניות ממשלתית רלוונטית
- חמשת הכוחות של פורטר
- מגמות טכנולוגיות ודיסרפציה
- PESTEL Analysis
- שחקנים מובילים ונתחי שוק
- אתגרים והזדמנויות מרכזיים
- תחזית ל-3-5 שנים קדימה
כלול נתונים סטטיסטיים ותרשימים.',
  ARRAY['industry_sector', 'geography'],
  'דוח תעשייתי מקצועי עם ניתוחים אסטרטגיים, נתונים וטבלאות',
  ARRAY['נתונים סטטיסטיים', 'ניתוח Porter', 'ניתוח PESTEL', 'תחזית מגובה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "industry"}'::jsonb,
  true
);

-- 8. Policy Analysis
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_008',
  'ניתוח מדיניות ציבורית',
  'general',
  'ניתוח מעמיק של מדיניות ציבורית והשפעותיה',
  'בצע ניתוח מדיניות מקיף בנושא {{policy_topic}} ב-{{country_or_region}}.
הניתוח צריך לכלול:
- רקע היסטורי והתפתחות המדיניות
- המצב הנוכחי - חקיקה, תקנות והנחיות קיימות
- בעלי עניין מרכזיים ועמדותיהם
- השוואה בינלאומית - כיצד מדינות אחרות מתמודדות עם הנושא
- ניתוח עלות-תועלת של חלופות מדיניות
- השפעות חברתיות, כלכליות וסביבתיות
- אתגרים ביישום
- המלצות מדיניות מבוססות ראיות
הצג טיעונים בעד ונגד בצורה מאוזנת.',
  ARRAY['policy_topic', 'country_or_region'],
  'ניתוח מדיניות עם רקע, השוואה בינלאומית, חלופות והמלצות',
  ARRAY['איזון בטיעונים', 'נתונים תומכים', 'השוואה בינלאומית', 'המלצות מעשיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "policy"}'::jsonb,
  true
);

-- 9. Scientific Topic Deep Dive
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_009',
  'צלילה מדעית לעומק',
  'education',
  'מחקר מעמיק על נושא מדעי',
  'בצע מחקר מדעי מעמיק על {{scientific_topic}} בתחום {{scientific_field}}.
המחקר צריך לכלול:
- הסבר מושגי יסוד והרקע המדעי
- היסטוריה של המחקר בנושא - גילויים מרכזיים ואבני דרך
- המצב הנוכחי של הידע המדעי
- מחקרים פורצי דרך אחרונים ותוצאותיהם
- יישומים מעשיים וטכנולוגיות נגזרות
- שאלות פתוחות ותחומי מחקר פעילים
- השלכות אתיות וחברתיות (אם רלוונטי)
- מקורות מדעיים מובילים ומוסדות מחקר בתחום
הסבר בשפה נגישה אך מדויקת מדעית.',
  ARRAY['scientific_topic', 'scientific_field'],
  'דוח מדעי מקיף עם הסברים נגישים, ציר זמן ומקורות',
  ARRAY['דיוק מדעי', 'נגישות', 'מקורות אקדמיים', 'עדכניות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "science"}'::jsonb,
  true
);

-- 10. Historical Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_010',
  'מחקר היסטורי מקיף',
  'education',
  'חקירה היסטורית מעמיקה של אירוע, תקופה או תופעה',
  'בצע מחקר היסטורי מקיף על {{historical_topic}} בתקופה {{time_period}}.
המחקר צריך לכלול:
- הקשר היסטורי רחב - מה קדם לאירוע/תקופה
- תיאור כרונולוגי של האירועים המרכזיים
- דמויות מפתח ותפקידן
- גורמים פוליטיים, כלכליים, חברתיים ותרבותיים
- פרשנויות היסטוריוגרפיות שונות ומחלוקות
- השפעות קצרות וארוכות טווח
- קישור לאירועים עכשוויים ורלוונטיות להווה
- מקורות ראשוניים ומשניים מרכזיים
הצג נקודות מבט מגוונות ופרשנויות שונות.',
  ARRAY['historical_topic', 'time_period'],
  'מחקר היסטורי עם ציר זמן, ניתוח רב-ממדי ומקורות',
  ARRAY['דיוק כרונולוגי', 'ריבוי פרשנויות', 'מקורות היסטוריים', 'רלוונטיות להווה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "history"}'::jsonb,
  true
);

-- 11. SEO and Digital Presence Analysis
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_011',
  'ניתוח נוכחות דיגיטלית ו-SEO',
  'marketing',
  'מחקר מעמיק על נוכחות דיגיטלית ואסטרטגיית SEO',
  'בצע ניתוח נוכחות דיגיטלית ו-SEO מקיף עבור {{business_type}} בתחום {{niche}} בשוק {{target_market}}.
חקור:
- מילות מפתח מרכזיות ונפח חיפוש בתחום
- ניתוח SERP - מי מדורג בעמוד הראשון ולמה
- אסטרטגיות תוכן מצליחות של מתחרים
- הזדמנויות למילות מפתח Long-tail
- ניתוח Backlink Profile של מובילי התחום
- מגמות חיפוש עונתיות ואקטואליות
- הזדמנויות ב-Featured Snippets ו-Rich Results
- המלצות לאסטרטגיית תוכן ו-SEO טכני
- מדדי ביצוע מומלצים (KPIs)
הצג תוכנית פעולה עם סדרי עדיפויות.',
  ARRAY['business_type', 'niche', 'target_market'],
  'דוח SEO עם מחקר מילות מפתח, ניתוח תחרות ותוכנית פעולה',
  ARRAY['מילות מפתח רלוונטיות', 'ניתוח תחרותי', 'המלצות מעשיות', 'KPIs מדידים'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "seo"}'::jsonb,
  true
);

-- 12. Startup Ecosystem Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_012',
  'מחקר אקוסיסטם סטארטאפים',
  'general',
  'מיפוי אקוסיסטם סטארטאפים בתחום ספציפי',
  'בצע מיפוי מקיף של אקוסיסטם הסטארטאפים בתחום {{startup_domain}} ב-{{geography}}.
כלול:
- סטארטאפים מובילים ושלב מימון (Pre-seed עד IPO)
- סבבי מימון אחרונים וסכומים
- משקיעי הון סיכון פעילים בתחום
- אקסלרטורים ואינקובטורים רלוונטיים
- מגמות מוצר וטכנולוגיה דומיננטיות
- אקזיטים ורכישות בולטות בשנים האחרונות
- פערים בשוק והזדמנויות לסטארטאפים חדשים
- אתגרי רגולציה ותשתית
- תחזית לאקוסיסטם ב-2-3 שנים הקרובות
כלול Market Map ויזואלי של השחקנים.',
  ARRAY['startup_domain', 'geography'],
  'Market Map עם מיפוי שחקנים, מגמות מימון והזדמנויות',
  ARRAY['מיפוי מקיף', 'נתוני מימון', 'מגמות עדכניות', 'הזדמנויות מזוהות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "startups"}'::jsonb,
  true
);

-- 13. Legal and Regulatory Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_013',
  'מחקר משפטי ורגולטורי',
  'general',
  'חקירת סביבה משפטית ורגולטורית בתחום עסקי',
  'בצע מחקר משפטי ורגולטורי מקיף בנושא {{legal_topic}} בהקשר של {{business_context}} ב-{{jurisdiction}}.
חקור:
- חקיקה ראשית ומשנית רלוונטית
- רגולציה ותקנות ספציפיות לתחום
- פסיקות משמעותיות ותקדימים
- רגולטורים ורשויות פיקוח רלוונטיים
- דרישות רישוי, היתרים ועמידה ברגולציה (Compliance)
- סנקציות ואכיפה - מקרים בולטים
- שינויי רגולציה צפויים ומגמות חקיקה
- השוואה לרגולציה במדינות אחרות
- המלצות לעמידה ברגולציה וניהול סיכונים
אזהרה: מידע זה הוא לצורכי מחקר בלבד ואינו מהווה ייעוץ משפטי.',
  ARRAY['legal_topic', 'business_context', 'jurisdiction'],
  'דוח רגולטורי עם סקירת חקיקה, דרישות Compliance והמלצות',
  ARRAY['מקורות חוקיים', 'עדכניות', 'השוואה בינלאומית', 'אזהרת ייעוץ משפטי'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "legal"}'::jsonb,
  true
);

-- 14. Data Analysis Methodology
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_014',
  'מתודולוגיית ניתוח נתונים',
  'dev',
  'תכנון מתודולוגיית ניתוח נתונים לפרויקט מחקרי',
  'תכנן מתודולוגיית ניתוח נתונים מקיפה עבור פרויקט מחקרי בנושא {{research_question}} עם נתונים מסוג {{data_type}}.
כלול:
- הגדרת שאלות מחקר והשערות
- מקורות נתונים אפשריים ואיכותם
- שיטות איסוף ודגימה מומלצות
- טכניקות עיבוד וניקוי נתונים
- שיטות ניתוח סטטיסטי מתאימות
- כלים וטכנולוגיות מומלצות (Python, R, SQL וכו'')
- שיטות ויזואליזציה להצגת ממצאים
- מגבלות המתודולוגיה ואיך להתמודד איתן
- לוח זמנים משוער לשלבי הניתוח
הצג דוגמאות קוד קצרות לשלבים מרכזיים.',
  ARRAY['research_question', 'data_type'],
  'מדריך מתודולוגי מלא עם שלבים, כלים ודוגמאות קוד',
  ARRAY['שלבים מוגדרים', 'כלים מתאימים', 'דוגמאות קוד', 'התייחסות למגבלות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "data-analysis"}'::jsonb,
  true
);

-- 15. UX Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_015',
  'מחקר חוויית משתמש (UX)',
  'dev',
  'מחקר UX מקיף למוצר דיגיטלי',
  'בצע מחקר UX מקיף עבור {{product_type}} בתחום {{domain}} לקהל יעד {{target_users}}.
המחקר צריך לכלול:
- ניתוח פרסונות משתמשים (3-5 פרסונות מפורטות)
- מסע משתמש (User Journey Map) לתרחישי שימוש מרכזיים
- ניתוח Best Practices ו-Design Patterns בתחום
- סקירת מתחרים מזווית UX
- היוריסטיקות של ניילסן - היכן מוצרים בתחום נכשלים
- עקרונות נגישות (WCAG) רלוונטיים
- המלצות לארכיטקטורת מידע וניווט
- שיטות בדיקה ומדדי UX מומלצים
- רשימת נקודות כאב שכיחות ופתרונות
הצג wireframes טקסטואליים לדפים מרכזיים.',
  ARRAY['product_type', 'domain', 'target_users'],
  'דוח UX עם פרסונות, מסע משתמש, המלצות עיצוב ומדדים',
  ARRAY['פרסונות מפורטות', 'מסע משתמש', 'המלצות עיצוב', 'מדדי UX'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "ux-research"}'::jsonb,
  true
);

-- 16. Sustainability and ESG Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_016',
  'מחקר קיימות ו-ESG',
  'general',
  'מחקר מקיף על קיימות ואחריות תאגידית בתעשייה',
  'בצע מחקר מקיף על קיימות ו-ESG (סביבה, חברה, ממשל תאגידי) בתעשיית {{industry}} ב-{{region}}.
חקור:
- מצב הקיימות הנוכחי בתעשייה - טביעת רגל פחמנית, ניצול משאבים
- רגולציה סביבתית ומגמות חקיקה (EU Taxonomy, SEC Climate Rules וכו'')
- דרישות דיווח ESG ותקנים (GRI, SASB, TCFD)
- Best Practices ומובילי קיימות בתעשייה
- חדשנות ירוקה וטכנולוגיות נקיות רלוונטיות
- ציפיות צרכנים ומשקיעים בנושא קיימות
- עלויות והזדמנויות כלכליות של מעבר לקיימות
- תוכנית פעולה מומלצת לשיפור ביצועי ESG
כלול מדדים מדידים ויעדים ריאליסטיים.',
  ARRAY['industry', 'region'],
  'דוח ESG עם ניתוח מצב, רגולציה, Best Practices ותוכנית פעולה',
  ARRAY['נתוני קיימות', 'רגולציה עדכנית', 'מדדים מדידים', 'תוכנית פעולה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "esg"}'::jsonb,
  true
);

-- 17. Social Media Trends Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_017',
  'מחקר מגמות ברשתות חברתיות',
  'social',
  'חקירת מגמות ותופעות ברשתות חברתיות',
  'בצע מחקר מעמיק על מגמות ברשתות חברתיות בתחום {{content_niche}} עבור קהל {{target_audience}}.
חקור:
- פלטפורמות מובילות לקהל היעד ודפוסי שימוש
- פורמטי תוכן מובילים (Reels, Stories, Threads, Newsletters וכו'')
- האשטגים ומגמות תוכן פופולריות
- משפיענים ויוצרי תוכן מובילים בתחום
- אלגוריתמים ושינויים אחרונים בפלטפורמות
- שיעורי מעורבות ומדדים ממוצעים בתחום
- אסטרטגיות תוכן מצליחות ודוגמאות
- כלים ופלטפורמות ניהול מומלצים
- תחזית מגמות לשנה הקרובה
הצג דוגמאות קונקרטיות של תכנים מצליחים.',
  ARRAY['content_niche', 'target_audience'],
  'דוח מגמות עם ניתוח פלטפורמות, תכנים מצליחים ואסטרטגיה מומלצת',
  ARRAY['נתוני מעורבות', 'דוגמאות קונקרטיות', 'מגמות עדכניות', 'המלצות מעשיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "social-media"}'::jsonb,
  true
);

-- 18. HR and Talent Market Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_018',
  'מחקר שוק עבודה וגיוס',
  'general',
  'חקירת שוק העבודה ומגמות גיוס בתחום ספציפי',
  'בצע מחקר מקיף על שוק העבודה בתחום {{job_domain}} ב-{{location}}.
חקור:
- ביקוש והיצע כוח אדם בתחום
- תפקידים מבוקשים ומיומנויות נדרשות
- טווח שכר ותנאים מקובלים (לפי ותק ומיקום)
- מגמות גיוס - היכן מגייסים ואיך
- השפעת עבודה מרחוק/היברידית על השוק
- תוכניות הכשרה ופיתוח מקצועי רלוונטיות
- אתגרי שימור עובדים ופתרונות
- מעסיקים מובילים ומה מייחד אותם
- תחזית שוק עבודה ל-2-3 שנים קדימה
הצג נתוני שכר בטבלאות ומגמות בגרפים.',
  ARRAY['job_domain', 'location'],
  'דוח שוק עבודה עם נתוני שכר, מגמות גיוס ותחזיות',
  ARRAY['נתוני שכר', 'מגמות מגובות', 'המלצות גיוס', 'תחזית שוק'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "hr"}'::jsonb,
  true
);

-- 19. Product-Market Fit Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_019',
  'מחקר Product-Market Fit',
  'sales',
  'בדיקת התאמת מוצר לשוק',
  'בצע מחקר Product-Market Fit מקיף עבור {{product_description}} בשוק {{target_market}}.
חקור:
- הגדרת הבעיה שהמוצר פותר - האם הבעיה אמיתית ומשמעותית?
- גודל השוק הפוטנציאלי (TAM, SAM, SOM)
- פרופיל לקוח אידיאלי (ICP) ו-Early Adopters
- פתרונות קיימים וחלופות - מה חסר בהם?
- ערך מוצע ייחודי (Value Proposition) מול מתחרים
- מודל תמחור ונכונות לשלם (Willingness to Pay)
- ערוצי הפצה ורכישת לקוחות אופטימליים
- מדדי Product-Market Fit מומלצים למעקב
- סיכונים מרכזיים ואיך למזער אותם
- תוכנית בדיקה (Validation Plan) ב-90 יום
הצע שיטות מחקר כמותיות ואיכותניות.',
  ARRAY['product_description', 'target_market'],
  'דוח PMF עם ניתוח שוק, ICP, תמחור ותוכנית בדיקה',
  ARRAY['ניתוח TAM/SAM/SOM', 'ICP מפורט', 'תוכנית בדיקה', 'מדדים מוגדרים'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "product"}'::jsonb,
  true
);

-- 20. Content Strategy Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_020',
  'מחקר אסטרטגיית תוכן',
  'marketing',
  'בניית אסטרטגיית תוכן מבוססת מחקר',
  'בצע מחקר מקיף לבניית אסטרטגיית תוכן עבור {{brand_or_business}} בתחום {{industry}} לקהל {{target_audience}}.
חקור:
- ניתוח תוכן קיים של המותג - מה עובד ומה לא
- מחקר מתחרים - אסטרטגיות תוכן מצליחות בתחום
- מחקר קהל יעד - נושאים, שאלות וצרכי מידע
- מילות מפתח ונושאים בעלי פוטנציאל תנועה
- פורמטי תוכן מומלצים לכל ערוץ
- לוח שנה תוכני - נושאים עונתיים ואירועים
- Pillar Content ו-Topic Clusters מומלצים
- מדדי הצלחה ו-KPIs לכל סוג תוכן
- כלים ותהליכי עבודה מומלצים לצוות תוכן
- תקציב ומשאבים נדרשים
הצג תוכנית פעולה ל-6 חודשים.',
  ARRAY['brand_or_business', 'industry', 'target_audience'],
  'דוח אסטרטגיית תוכן עם מחקר, לוח שנה, KPIs ותוכנית פעולה',
  ARRAY['מחקר מתחרים', 'מילות מפתח', 'לוח תוכן', 'מדדי הצלחה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "content-strategy"}'::jsonb,
  true
);

-- 21. Cybersecurity Threat Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_021',
  'מחקר איומי סייבר',
  'dev',
  'חקירת נוף איומי סייבר וסיכונים בתעשייה',
  'בצע מחקר מקיף על איומי סייבר ואבטחת מידע בתעשיית {{industry}} עם התמקדות ב-{{technology_stack}}.
חקור:
- וקטורי תקיפה שכיחים בתעשייה
- איומים מתקדמים (APT) רלוונטיים
- פגיעויות נפוצות בטכנולוגיות בשימוש
- מקרי פריצה בולטים בתעשייה ולקחים
- תקנים ורגולציה (ISO 27001, SOC 2, GDPR, PCI-DSS)
- כלי אבטחה מומלצים ושכבות הגנה
- Best Practices לארכיטקטורת אבטחה
- תוכנית תגובה לאירוע (Incident Response)
- מגמות באבטחת סייבר ואיומים עתידיים
- המלצות לשיפור עמידות הארגון
כלול רשימת ביקורת (checklist) מעשית.',
  ARRAY['industry', 'technology_stack'],
  'דוח אבטחת סייבר עם ניתוח איומים, Best Practices ותוכנית פעולה',
  ARRAY['איומים ספציפיים', 'תקנים רלוונטיים', 'המלצות מעשיות', 'רשימת ביקורת'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "cybersecurity"}'::jsonb,
  true
);

-- 22. E-commerce Market Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_022',
  'מחקר שוק מסחר אלקטרוני',
  'sales',
  'חקירת הזדמנויות במסחר אלקטרוני בנישה ספציפית',
  'בצע מחקר מקיף על שוק המסחר האלקטרוני בנישת {{product_niche}} בשוק {{target_market}}.
חקור:
- גודל שוק המסחר האלקטרוני בנישה ושיעור צמיחה
- פלטפורמות מובילות (Amazon, Shopify, eBay, מקומיות)
- מתחרים מובילים - ביצועים, מחירים, חוויית לקוח
- התנהגות רכישה מקוונת של קהל היעד
- עונתיות וזמני שיא מכירות
- אסטרטגיות תמחור ומבצעים מצליחות
- ערוצי שיווק בעלי ה-ROI הגבוה ביותר
- לוגיסטיקה, שילוח ומדיניות החזרות
- טכנולוגיות ופיצ''רים שמגדילים המרות
- חסמי כניסה ודרישות הון ראשוניות
הצג ניתוח כדאיות עסקית מסכם.',
  ARRAY['product_niche', 'target_market'],
  'דוח שוק E-commerce עם ניתוח תחרות, הזדמנויות וכדאיות עסקית',
  ARRAY['נתוני שוק', 'ניתוח תחרות', 'כדאיות עסקית', 'המלצות פעולה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "ecommerce"}'::jsonb,
  true
);

-- 23. AI and Automation Impact Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_023',
  'מחקר השפעת AI ואוטומציה',
  'dev',
  'חקירת השפעת בינה מלאכותית ואוטומציה על תעשייה',
  'בצע מחקר מקיף על השפעת הבינה המלאכותית והאוטומציה על {{industry}} עם דגש על {{specific_area}}.
חקור:
- יישומי AI קיימים בתעשייה ורמת אימוצם
- תהליכים שניתן לאוטמט ופוטנציאל חיסכון
- כלי AI מובילים ופתרונות ספציפיים לתעשייה
- מקרי בוחן מוצלחים - ROI ותוצאות
- השפעה על תפקידים ומיומנויות נדרשות
- אתגרי יישום - טכנולוגיים, ארגוניים, אתיים
- עלויות הטמעה מול חיסכון צפוי
- מגמות AI צפויות ב-2-5 שנים הקרובות
- Roadmap מומלץ לאימוץ AI בארגון
- סיכונים ואיך לנהל אותם
כלול ניתוח עלות-תועלת מפורט.',
  ARRAY['industry', 'specific_area'],
  'דוח השפעת AI עם מקרי בוחן, ניתוח עלות-תועלת ו-Roadmap',
  ARRAY['מקרי בוחן', 'ניתוח ROI', 'Roadmap יישומי', 'ניהול סיכונים'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "ai-impact"}'::jsonb,
  true
);

-- 24. Brand Perception Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_024',
  'מחקר תפיסת מותג',
  'marketing',
  'חקירת תפיסת המותג וזהותו בשוק',
  'בצע מחקר מקיף על תפיסת המותג {{brand_name}} בקרב {{target_audience}} בשוק {{market}}.
חקור:
- מודעות למותג (Brand Awareness) - מודעות ספונטנית ונעזרת
- אסוציאציות מותג - מה אנשים מקשרים למותג
- מיצוב מותג מול מתחרים (Perceptual Map)
- חוזקות וחולשות המותג מנקודת מבט הצרכן
- ניתוח סנטימנט ברשתות חברתיות וביקורות
- נאמנות מותג ו-Net Promoter Score משוער
- זהות ויזואלית ומסרים - עקביות ואפקטיביות
- פערים בין תפיסת המותג הרצויה לבין המציאות
- הזדמנויות למיתוג מחדש או חיזוק המותג
- המלצות אסטרטגיות לשיפור תפיסת המותג
כלול ניתוח SWOT ממותג ומפת מיצוב.',
  ARRAY['brand_name', 'target_audience', 'market'],
  'דוח תפיסת מותג עם מפת מיצוב, ניתוח סנטימנט והמלצות',
  ARRAY['ניתוח סנטימנט', 'מפת מיצוב', 'פערי תפיסה', 'המלצות אסטרטגיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "branding"}'::jsonb,
  true
);

-- 25. Education Technology Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_025',
  'מחקר טכנולוגיות חינוך',
  'education',
  'חקירת מגמות וכלים בתחום טכנולוגיות החינוך',
  'בצע מחקר מקיף על טכנולוגיות חינוך (EdTech) בתחום {{education_level}} עם דגש על {{learning_topic}}.
חקור:
- מגמות מובילות ב-EdTech - למידה מותאמת אישית, AI, VR/AR, Gamification
- פלטפורמות וכלים מובילים - השוואה ודירוג
- מתודולוגיות למידה נתמכות טכנולוגיה
- מחקרים על אפקטיביות למידה דיגיטלית
- פערים דיגיטליים ואתגרי נגישות
- דוגמאות יישום מוצלחות ממוסדות חינוך
- עלויות הטמעה ומודלים עסקיים
- פרטיות נתונים ואתיקה בטכנולוגיות חינוך
- תחזית לעתיד החינוך הדיגיטלי
- המלצות ליישום בסביבת הלמידה
כלול טבלת השוואה של כלים מומלצים.',
  ARRAY['education_level', 'learning_topic'],
  'דוח EdTech עם סקירת כלים, מחקרים, מקרי בוחן והמלצות',
  ARRAY['סקירת כלים', 'מחקרים תומכים', 'מקרי בוחן', 'המלצות יישום'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "edtech"}'::jsonb,
  true
);

-- 26. Health and Wellness Industry Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_026',
  'מחקר תעשיית בריאות ורווחה',
  'general',
  'חקירת שוק הבריאות והרווחה',
  'בצע מחקר מקיף על שוק הבריאות והרווחה בתחום {{health_segment}} ב-{{market}}.
חקור:
- גודל שוק ומגמות צמיחה גלובליות ומקומיות
- סגמנטים מרכזיים ושחקנים מובילים
- התנהגות צרכנים - מוכנות לשלם, ערוצי רכישה
- רגולציה ותקנים רלוונטיים (FDA, משרד הבריאות)
- מגמות חדשנות - טכנולוגיה, מוצרים, שירותים
- השפעת מדיה חברתית על החלטות בריאות
- מודלים עסקיים מצליחים בתחום (מנויים, D2C, B2B)
- אתגרים ייחודיים - אמינות, תביעות בריאותיות, רגולציה
- הזדמנויות לשחקנים חדשים
- תחזית שוק ל-3-5 שנים
הערה: מחקר זה הוא לצורכי עסקיים ואינו מהווה ייעוץ רפואי.',
  ARRAY['health_segment', 'market'],
  'דוח שוק בריאות עם ניתוח סגמנטים, רגולציה, הזדמנויות ותחזית',
  ARRAY['נתוני שוק', 'רגולציה', 'מגמות צרכניות', 'הזדמנויות עסקיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "health"}'::jsonb,
  true
);

-- 27. Global Supply Chain Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_027',
  'מחקר שרשרת אספקה גלובלית',
  'general',
  'חקירת שרשרת אספקה ולוגיסטיקה בתעשייה',
  'בצע מחקר מקיף על שרשרת האספקה בתעשיית {{industry}} עם דגש על {{supply_chain_aspect}}.
חקור:
- מיפוי שרשרת האספקה - ספקים, יצרנים, מפיצים, קמעונאים
- שחקנים מרכזיים בכל חוליה
- אתגרי שרשרת אספקה נוכחיים וצפויים
- סיכונים גיאופוליטיים והשפעתם
- טכנולוגיות לשיפור שרשרת האספקה (IoT, Blockchain, AI)
- מגמות Nearshoring ו-Reshoring
- עלויות לוגיסטיקה ומגמות
- קיימות בשרשרת האספקה
- אסטרטגיות לבניית שרשרת אספקה עמידה (Resilient)
- Best Practices וניהול סיכונים
כלול תרשים זרימה של שרשרת האספקה.',
  ARRAY['industry', 'supply_chain_aspect'],
  'דוח שרשרת אספקה עם מיפוי, ניתוח סיכונים ואסטרטגיות',
  ARRAY['מיפוי מלא', 'ניתוח סיכונים', 'טכנולוגיות רלוונטיות', 'המלצות עמידות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "supply-chain"}'::jsonb,
  true
);

-- 28. Investment and Funding Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_028',
  'מחקר השקעות ומימון',
  'general',
  'חקירת נוף ההשקעות והמימון בתחום ספציפי',
  'בצע מחקר מקיף על נוף ההשקעות והמימון בתחום {{investment_sector}} ב-{{geography}}.
חקור:
- סך ההשקעות בתחום - מגמות ב-3-5 שנים אחרונות
- סבבי מימון בולטים ועסקאות מרכזיות
- משקיעים פעילים - VC, PE, קרנות אסטרטגיות
- הערכות שווי ומכפילים מקובלים בתחום
- אקזיטים בולטים - IPO, M&A, SPACs
- מקורות מימון חלופיים - מענקים, Crowdfunding, חוב
- מדדי ביצוע וקריטריונים שמשקיעים מחפשים
- תהליך גיוס אופטימלי - שלבים וטיפים
- סיכונים מרכזיים ואיך למתן אותם
- תחזית להשקעות בתחום בשנים הקרובות
כלול טבלת השוואה של אפשרויות מימון.',
  ARRAY['investment_sector', 'geography'],
  'דוח השקעות עם ניתוח מגמות, שחקנים, הערכות שווי ותחזיות',
  ARRAY['נתוני עסקאות', 'משקיעים מזוהים', 'מגמות מימון', 'המלצות מעשיות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "investment"}'::jsonb,
  true
);

-- 29. Cross-Cultural Market Entry Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_029',
  'מחקר כניסה לשוק בינלאומי',
  'sales',
  'חקירת הזדמנויות ואתגרים בכניסה לשוק חדש',
  'בצע מחקר מקיף לכניסה לשוק {{target_country}} עם {{product_or_service}}.
חקור:
- סביבה עסקית - כלכלה, יציבות, סביבת עסקים
- גודל שוק פוטנציאלי ומגמות
- תרבות עסקית ונורמות מקומיות
- העדפות צרכנים ומאפיינים ייחודיים
- רגולציה, מיסוי ודרישות משפטיות
- מתחרים מקומיים ובינלאומיים
- ערוצי הפצה ומכירה מועדפים
- שותפים אסטרטגיים פוטנציאליים
- חסמי כניסה - שפה, תרבות, בירוקרטיה
- אסטרטגיות כניסה מומלצות (ייצוא, שותפות, סניף מקומי)
- לוח זמנים ותקציב משוער לכניסה לשוק
כלול ניתוח PESTEL ותוכנית Go-to-Market.',
  ARRAY['target_country', 'product_or_service'],
  'דוח כניסה לשוק עם PESTEL, ניתוח תחרות ותוכנית Go-to-Market',
  ARRAY['ניתוח PESTEL', 'מתחרים מקומיים', 'רגולציה', 'תוכנית פעולה'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "international"}'::jsonb,
  true
);

-- 30. Future of Work Research
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'dr_030',
  'מחקר עתיד העבודה',
  'general',
  'חקירת מגמות עתידיות בעולם העבודה',
  'בצע מחקר מקיף על עתיד העבודה בתחום {{profession_or_industry}} עם דגש על {{focus_area}}.
חקור:
- מגמות מאקרו המשפיעות על עולם העבודה (דמוגרפיה, טכנולוגיה, גלובליזציה)
- השפעת AI ואוטומציה על תפקידים קיימים
- תפקידים חדשים שייווצרו ומיומנויות נדרשות
- מודלי עבודה חדשים - היברידי, מרחוק, Gig Economy
- כלים וטכנולוגיות שישנו את אופן העבודה
- רווחה נפשית ואיזון עבודה-חיים
- שינויים בציפיות של דור ה-Z ודור האלפא
- מדיניות ארגונית מומלצת להתאמה לשינויים
- מיומנויות עתידיות ותוכניות הכשרה מומלצות
- תרחישים אפשריים ל-5-10 שנים קדימה
כלול תרחישי עתיד (Scenario Planning) ותוכנית היערכות.',
  ARRAY['profession_or_industry', 'focus_area'],
  'דוח עתיד העבודה עם תרחישים, מגמות, מיומנויות נדרשות ותוכנית היערכות',
  ARRAY['תרחישי עתיד', 'מגמות מגובות', 'מיומנויות נדרשות', 'תוכנית היערכות'],
  'DEEP_RESEARCH',
  '{"name": "peroot-library", "category": "future-of-work"}'::jsonb,
  true
);

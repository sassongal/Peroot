-- ============================================
-- 30 Agent Builder Prompts for Peroot Public Library
-- capability_mode: agent_builder
-- Language: Hebrew
-- ============================================

-- 1. Sales Assistant Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_001',
  'סוכן מכירות חכם',
  'sales',
  'בניית סוכן AI לסיוע בתהליכי מכירה',
  'צור סוכן AI למכירות עבור {{company_name}} שמוכרת {{product_or_service}} לקהל {{target_audience}}.
הסוכן צריך:
- לזהות צרכי לקוח דרך שאלות חכמות
- להציג את המוצר/שירות בצורה מותאמת אישית לכל לקוח
- לטפל בהתנגדויות שכיחות ולהציע פתרונות
- להוביל את השיחה לסגירת עסקה
- לזהות הזדמנויות ל-Upsell ו-Cross-sell
- לתעד כל אינטראקציה עבור ה-CRM
- לדבר בעברית מקצועית אך חמה וידידותית
- להכיר את המתחרים ולדעת להתמודד עם השוואות',
  ARRAY['company_name', 'product_or_service', 'target_audience'],
  'סוכן מכירות עם יכולת שיחה, טיפול בהתנגדויות וסגירת עסקאות',
  ARRAY['זיהוי צרכים', 'טיפול בהתנגדויות', 'מעקב CRM', 'עברית מקצועית'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "sales-agent"}'::jsonb,
  true
);

-- 2. Customer Support Bot
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_002',
  'סוכן שירות לקוחות',
  'sales',
  'בניית סוכן AI לשירות לקוחות',
  'צור סוכן שירות לקוחות עבור {{company_name}} בתחום {{industry}}.
הסוכן צריך:
- לענות על שאלות נפוצות בנוגע ל-{{product_or_service}}
- לטפל בתלונות ולהפוך לקוח מתוסכל ללקוח מרוצה
- להעביר לנציג אנושי כשהבעיה מורכבת מדי
- לפתוח קריאות שירות ולעקוב אחריהן
- לספק מידע על סטטוס הזמנות ומשלוחים
- לדבר בטון אמפתי, סבלני ומקצועי
- לא להבטיח דברים שהחברה לא יכולה לקיים
- לאסוף משוב מהלקוח בסוף כל אינטראקציה',
  ARRAY['company_name', 'industry', 'product_or_service'],
  'סוכן שירות לקוחות עם טיפול בפניות, מעקב ומשוב',
  ARRAY['אמפתיה', 'פתרון בעיות', 'הסלמה נכונה', 'איסוף משוב'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "support-agent"}'::jsonb,
  true
);

-- 3. Content Strategist Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_003',
  'סוכן אסטרטגיית תוכן',
  'marketing',
  'בניית סוכן AI לתכנון וניהול אסטרטגיית תוכן',
  'צור סוכן לאסטרטגיית תוכן עבור {{brand_name}} בתחום {{industry}} לקהל יעד {{target_audience}}.
הסוכן צריך:
- להציע רעיונות לתוכן מבוססי מגמות ומילות מפתח
- לבנות לוח שנה תוכני חודשי
- להתאים תוכן לכל פלטפורמה (בלוג, רשתות חברתיות, ניוזלטר)
- לכתוב בריפים מפורטים לכותבי תוכן
- לנתח ביצועי תוכן ולהמליץ על שיפורים
- לזהות הזדמנויות לתוכן אקטואלי (Newsjacking)
- לנהל תהליך אישור תוכן
- לשמור על עקביות קול ומסר של המותג',
  ARRAY['brand_name', 'industry', 'target_audience'],
  'סוכן תוכן עם יכולת תכנון, יצירה, ניתוח ואופטימיזציה',
  ARRAY['לוח תוכן', 'בריפים מפורטים', 'ניתוח ביצועים', 'עקביות מותג'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "content-agent"}'::jsonb,
  true
);

-- 4. Code Reviewer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_004',
  'סוכן סקירת קוד',
  'dev',
  'בניית סוכן AI לסקירת קוד ובדיקת איכות',
  'צור סוכן לסקירת קוד בשפות {{programming_languages}} עם דגש על {{code_standards}}.
הסוכן צריך:
- לבדוק קוד לפי Best Practices וסטנדרטים מוגדרים
- לזהות באגים פוטנציאליים ופגיעויות אבטחה
- להציע שיפורי ביצועים ואופטימיזציות
- לבדוק קריאות קוד ותחזוקתיות
- לזהות קוד כפול והזדמנויות ל-Refactoring
- לבדוק כיסוי בדיקות ולהציע בדיקות חסרות
- לתת הערות בונות ומפורטות עם דוגמאות לשיפור
- לדרג חומרת ממצאים (קריטי, גבוה, בינוני, נמוך)',
  ARRAY['programming_languages', 'code_standards'],
  'סוכן סקירת קוד עם זיהוי בעיות, הצעות שיפור ודירוג חומרה',
  ARRAY['זיהוי באגים', 'בדיקת אבטחה', 'הצעות שיפור', 'דירוג חומרה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "dev-agent"}'::jsonb,
  true
);

-- 5. SEO Analyst Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_005',
  'סוכן ניתוח SEO',
  'marketing',
  'בניית סוכן AI לאופטימיזציית מנועי חיפוש',
  'צור סוכן SEO עבור אתר {{website_url}} בתחום {{niche}} המתמקד בשוק {{target_market}}.
הסוכן צריך:
- לנתח עמודים ולזהות בעיות SEO טכניות
- להציע מילות מפתח רלוונטיות ואסטרטגיית תוכן
- לכתוב Meta Titles ו-Meta Descriptions אופטימליים
- לנתח מבנה קישורים פנימיים ולהציע שיפורים
- לעקוב אחרי דירוגים ולזהות מגמות
- להציע שיפורי Core Web Vitals ומהירות
- ליצור Structured Data (Schema Markup) מתאים
- להכין דוחות SEO חודשיים עם המלצות פעולה',
  ARRAY['website_url', 'niche', 'target_market'],
  'סוכן SEO עם ניתוח טכני, מחקר מילים ואופטימיזציית תוכן',
  ARRAY['ניתוח טכני', 'מחקר מילות מפתח', 'דוחות חודשיים', 'המלצות מעשיות'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "seo-agent"}'::jsonb,
  true
);

-- 6. Social Media Manager Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_006',
  'סוכן ניהול רשתות חברתיות',
  'social',
  'בניית סוכן AI לניהול נוכחות ברשתות חברתיות',
  'צור סוכן לניהול רשתות חברתיות עבור {{brand_name}} בפלטפורמות {{platforms}} לקהל {{target_audience}}.
הסוכן צריך:
- ליצור תוכן מותאם לכל פלטפורמה (טקסט, רעיונות לויזואל)
- לתכנן ולתזמן פוסטים בלוח שנה
- לנסח תגובות לקהל ולנהל קהילה
- לעקוב אחרי מגמות ולהציע תוכן אקטואלי
- לנתח ביצועים ומדדי מעורבות
- להציע קמפיינים ממומנים עם קהלי יעד
- לנהל משברים ותגובות שליליות בתבונה
- להכין דוחות ביצועים שבועיים עם תובנות',
  ARRAY['brand_name', 'platforms', 'target_audience'],
  'סוכן סושיאל עם יצירת תוכן, ניהול קהילה, ניתוח ודוחות',
  ARRAY['תוכן מותאם', 'ניהול קהילה', 'ניתוח מדדים', 'דוחות ביצועים'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "social-agent"}'::jsonb,
  true
);

-- 7. HR Recruiter Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_007',
  'סוכן גיוס משאבי אנוש',
  'general',
  'בניית סוכן AI לסיוע בתהליכי גיוס עובדים',
  'צור סוכן גיוס עבור {{company_name}} בתחום {{industry}} לגיוס תפקידי {{job_types}}.
הסוכן צריך:
- לכתוב מודעות דרושים אטרקטיביות ומדויקות
- לסנן קורות חיים ולדרג מועמדים לפי התאמה
- להכין שאלות ראיון מותאמות לתפקיד
- לנהל תקשורת עם מועמדים בכל שלבי הגיוס
- להציע ערוצי גיוס אפקטיביים לכל תפקיד
- להעריך התאמה תרבותית לארגון
- לעקוב אחרי מדדי גיוס (Time to Hire, Cost per Hire)
- לסייע בבניית תהליך Onboarding למועמדים שנבחרו',
  ARRAY['company_name', 'industry', 'job_types'],
  'סוכן גיוס עם סינון מועמדים, ניהול תקשורת ומעקב',
  ARRAY['מודעות מקצועיות', 'סינון מועמדים', 'שאלות ראיון', 'מעקב מדדים'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "hr-agent"}'::jsonb,
  true
);

-- 8. Legal Advisor Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_008',
  'סוכן ייעוץ משפטי',
  'general',
  'בניית סוכן AI לסיוע בנושאים משפטיים עסקיים',
  'צור סוכן ייעוץ משפטי עסקי בתחום {{legal_area}} עבור {{business_type}} ב-{{jurisdiction}}.
הסוכן צריך:
- לענות על שאלות משפטיות בסיסיות בתחום העסקי
- לסייע בניסוח חוזים ומסמכים משפטיים פשוטים
- להסביר חוקים ותקנות רלוונטיים בשפה פשוטה
- לזהות סיכונים משפטיים ולהמליץ על התייעצות עם עורך דין
- לעזור בהכנת מסמכי הקמת חברה
- להסביר חובות דיווח ורגולציה
- לציין תמיד שהמידע אינו מחליף ייעוץ משפטי מקצועי
- לספק רשימת בדיקה (Checklist) לנושאים משפטיים שונים',
  ARRAY['legal_area', 'business_type', 'jurisdiction'],
  'סוכן משפטי עם מענה לשאלות, ניסוח מסמכים וזיהוי סיכונים',
  ARRAY['אזהרת ייעוץ משפטי', 'שפה פשוטה', 'זיהוי סיכונים', 'רשימות בדיקה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "legal-agent"}'::jsonb,
  true
);

-- 9. Financial Planner Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_009',
  'סוכן תכנון פיננסי',
  'general',
  'בניית סוכן AI לתכנון פיננסי עסקי',
  'צור סוכן תכנון פיננסי עבור {{business_type}} בשלב {{business_stage}} עם תקציב של כ-{{budget_range}}.
הסוכן צריך:
- לעזור בבניית תקציב שנתי ותזרים מזומנים
- להכין תחזיות פיננסיות ומודלים
- לנתח רווחיות לפי מוצר/שירות/לקוח
- להציע אסטרטגיות לשיפור תזרים מזומנים
- לזהות הוצאות מיותרות והזדמנויות חיסכון
- להסביר מושגי פיננסים בשפה פשוטה
- לעזור בהכנת חומרים למשקיעים
- לנטר KPIs פיננסיים ולהתריע על חריגות
הערה: אינו מחליף ייעוץ פיננסי מוסמך.',
  ARRAY['business_type', 'business_stage', 'budget_range'],
  'סוכן פיננסי עם תקצוב, תחזיות, ניתוח רווחיות ומעקב KPIs',
  ARRAY['תקציב מובנה', 'תחזיות מדויקות', 'KPIs מנוטרים', 'אזהרת ייעוץ'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "finance-agent"}'::jsonb,
  true
);

-- 10. Personal Trainer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_010',
  'סוכן מאמן כושר אישי',
  'creative',
  'בניית סוכן AI למאמן כושר אישי',
  'צור סוכן מאמן כושר אישי עבור {{fitness_goal}} ברמת כושר {{fitness_level}} עם {{available_equipment}}.
הסוכן צריך:
- לבנות תוכנית אימונים שבועית מותאמת אישית
- להסביר כל תרגיל עם טכניקה נכונה
- להתאים עומסים ומינונים לפי התקדמות
- לספק טיפים לתזונה שתומכת במטרות
- לתת מוטיבציה ועידוד לפי מצב רוח
- לעקוב אחרי התקדמות ולעדכן את התוכנית
- להתריע על סיכוני פציעה וחשיבות מנוחה
- להציע חלופות כשאין ציוד או זמן מלא
הערה: אינו מחליף ייעוץ רפואי או מאמן מוסמך.',
  ARRAY['fitness_goal', 'fitness_level', 'available_equipment'],
  'סוכן כושר עם תוכנית אימונים, מעקב התקדמות וטיפים תזונתיים',
  ARRAY['תוכנית מותאמת', 'הסברי תרגילים', 'מעקב התקדמות', 'אזהרת בטיחות'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "fitness-agent"}'::jsonb,
  true
);

-- 11. Cooking Chef Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_011',
  'סוכן שף ובישול',
  'creative',
  'בניית סוכן AI לעזרה בבישול ומתכונים',
  'צור סוכן שף מומחה ב-{{cuisine_type}} עם התמחות ב-{{dietary_preferences}} ורמת קושי {{difficulty_level}}.
הסוכן צריך:
- להציע מתכונים מותאמים לטעם ולצרכים תזונתיים
- להסביר טכניקות בישול בשפה פשוטה וברורה
- להתאים מתכונים למרכיבים הזמינים בבית
- להציע תחליפים למרכיבים חסרים
- לתכנן תפריט שבועי מאוזן
- לתת טיפים לשדרוג מנות פשוטות
- לסייע בתכנון ארוחות לאירועים ואירוח
- להסביר ערכים תזונתיים ולהתאים לדיאטות',
  ARRAY['cuisine_type', 'dietary_preferences', 'difficulty_level'],
  'סוכן בישול עם מתכונים, תפריטים, טכניקות וטיפים תזונתיים',
  ARRAY['מתכונים מותאמים', 'הסברים ברורים', 'תחליפים זמינים', 'ערכים תזונתיים'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "cooking-agent"}'::jsonb,
  true
);

-- 12. Travel Planner Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_012',
  'סוכן תכנון טיולים',
  'creative',
  'בניית סוכן AI לתכנון טיולים וחופשות',
  'צור סוכן תכנון טיולים ל-{{destination}} למשך {{trip_duration}} עם תקציב של {{budget}} ל-{{traveler_type}}.
הסוכן צריך:
- לבנות מסלול יומי מפורט עם אטרקציות ופעילויות
- להמליץ על מלונות/אכסנות מותאמים לתקציב
- להציע מסעדות ואוכל מקומי שחובה לנסות
- לספק מידע על תחבורה מקומית ומעברים
- להתריע על דרישות ויזה, חיסונים ובטיחות
- להציע טיפים לחיסכון וקופונים
- להתאים את המסלול למזג האוויר ועונה
- לספק ביטויים שימושיים בשפה המקומית',
  ARRAY['destination', 'trip_duration', 'budget', 'traveler_type'],
  'סוכן טיולים עם מסלול מפורט, המלצות ומידע מעשי',
  ARRAY['מסלול יומי', 'המלצות אכסנות', 'מידע מעשי', 'התאמה לתקציב'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "travel-agent"}'::jsonb,
  true
);

-- 13. Tutor Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_013',
  'סוכן מורה פרטי',
  'education',
  'בניית סוכן AI למורה פרטי ללמידה מותאמת אישית',
  'צור סוכן מורה פרטי למקצוע {{subject}} ברמת {{level}} לתלמיד בגיל {{student_age}}.
הסוכן צריך:
- להעריך את רמת הידע הנוכחית של התלמיד
- להסביר מושגים בשפה מותאמת לגיל ולרמה
- לתת תרגילים מדורגים מקל לקשה
- לזהות נקודות חולשה ולחזק אותן
- לתת משוב מפורט ומעודד על תשובות
- להשתמש בדוגמאות מהחיים ליישום המושגים
- להכין חומרי לימוד וסיכומים
- לעקוב אחרי התקדמות ולהתאים את הקצב',
  ARRAY['subject', 'level', 'student_age'],
  'סוכן הוראה עם הסברים, תרגילים, משוב ומעקב התקדמות',
  ARRAY['התאמה לרמה', 'תרגילים מדורגים', 'משוב מעודד', 'מעקב התקדמות'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "education-agent"}'::jsonb,
  true
);

-- 14. Therapy Helper Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_014',
  'סוכן תמיכה רגשית',
  'general',
  'בניית סוכן AI לתמיכה רגשית ורווחה נפשית',
  'צור סוכן תמיכה רגשית עם גישה של {{therapeutic_approach}} לטיפול בנושאי {{focus_areas}}.
הסוכן צריך:
- להקשיב באמפתיה ולשקף רגשות
- להציע טכניקות הרגעה ומיינדפולנס
- לעזור לזהות דפוסי חשיבה שליליים
- להציע תרגילי CBT בסיסיים
- לספק כלים לניהול לחץ וחרדה
- לעודד הרגלים בריאים לרווחה נפשית
- להפנות למקצועי בריאות הנפש כשצריך
- לציין תמיד שאינו מחליף טיפול מקצועי
חשוב: הסוכן חייב לכלול מספרי חירום ומוקדי סיוע.',
  ARRAY['therapeutic_approach', 'focus_areas'],
  'סוכן תמיכה רגשית עם אמפתיה, כלים מעשיים והפניות מקצועיות',
  ARRAY['אמפתיה', 'כלים מעשיים', 'הפניה למקצועיים', 'מספרי חירום'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "wellness-agent"}'::jsonb,
  true
);

-- 15. Project Manager Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_015',
  'סוכן ניהול פרויקטים',
  'dev',
  'בניית סוכן AI לניהול פרויקטים',
  'צור סוכן ניהול פרויקטים בשיטת {{methodology}} עבור צוות של {{team_size}} אנשים בתחום {{project_domain}}.
הסוכן צריך:
- לעזור בתכנון פרויקטים - WBS, לוח זמנים, אבני דרך
- לנהל משימות, תלויות ועדיפויות
- לנהל ישיבות Stand-up יומיות ו-Retro
- לעקוב אחרי התקדמות ולזהות עיכובים מוקדם
- לנהל סיכונים ותוכניות חירום
- להפיק דוחות סטטוס שבועיים
- לסייע בתקשורת בין בעלי עניין
- להציע שיפורי תהליך וייעול',
  ARRAY['methodology', 'team_size', 'project_domain'],
  'סוכן ניהול פרויקטים עם תכנון, מעקב, דוחות וניהול סיכונים',
  ARRAY['תכנון מפורט', 'מעקב התקדמות', 'ניהול סיכונים', 'דוחות סטטוס'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "pm-agent"}'::jsonb,
  true
);

-- 16. Email Marketing Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_016',
  'סוכן שיווק בדוא''ל',
  'marketing',
  'בניית סוכן AI לניהול קמפיינים בדוא''ל',
  'צור סוכן שיווק בדוא''ל עבור {{business_name}} בתחום {{industry}} עם רשימה של כ-{{list_size}} נמענים.
הסוכן צריך:
- לכתוב נושאי מייל (Subject Lines) שמגדילים שיעור פתיחה
- ליצור תוכן מיילים מעניין ומניע לפעולה
- לתכנן רצפי אוטומציה (Drip Campaigns) ו-Nurture Flows
- לפלח קהלים ולהתאים מסרים לכל סגמנט
- לנתח ביצועים - שיעורי פתיחה, הקלקה, המרה
- לבצע A/B Testing על נושאים, תוכן ועיתוי
- לשמור על עמידה בחוק הספאם ו-GDPR
- להציע אסטרטגיה להגדלת רשימת התפוצה',
  ARRAY['business_name', 'industry', 'list_size'],
  'סוכן אימייל עם כתיבת תוכן, אוטומציה, פילוח וניתוח',
  ARRAY['שיעור פתיחה', 'אוטומציה', 'פילוח קהלים', 'עמידה ברגולציה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "email-agent"}'::jsonb,
  true
);

-- 17. Data Analyst Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_017',
  'סוכן ניתוח נתונים',
  'dev',
  'בניית סוכן AI לניתוח נתונים ותובנות עסקיות',
  'צור סוכן ניתוח נתונים עבור {{business_type}} עם נתונים מ-{{data_sources}} בשפות {{tools_and_languages}}.
הסוכן צריך:
- לנתח מערכי נתונים ולזהות דפוסים ומגמות
- לייצר ויזואליזציות ברורות ואינפורמטיביות
- לבצע ניתוחים סטטיסטיים ולפרש תוצאות
- לכתוב שאילתות SQL ו-Python לעיבוד נתונים
- ליצור דשבורדים ודוחות אוטומטיים
- לזהות אנומליות ולהתריע על חריגים
- לתרגם נתונים לתובנות עסקיות ברורות
- להמליץ על פעולות מבוססות נתונים',
  ARRAY['business_type', 'data_sources', 'tools_and_languages'],
  'סוכן נתונים עם ניתוח, ויזואליזציה, תובנות והמלצות',
  ARRAY['ניתוח מדויק', 'ויזואליזציה ברורה', 'תובנות עסקיות', 'המלצות פעולה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "data-agent"}'::jsonb,
  true
);

-- 18. Product Manager Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_018',
  'סוכן ניהול מוצר',
  'dev',
  'בניית סוכן AI לניהול מוצר דיגיטלי',
  'צור סוכן ניהול מוצר עבור {{product_name}} מסוג {{product_type}} בתחום {{industry}}.
הסוכן צריך:
- לעזור בהגדרת חזון מוצר ו-Roadmap
- לכתוב User Stories ודרישות מוצר (PRD)
- לתעדף פיצ''רים לפי Impact vs Effort
- לנתח משוב משתמשים ולחלץ תובנות
- לנהל Backlog ו-Sprint Planning
- לעקוב אחרי מדדי מוצר (DAU, Retention, NPS)
- לבצע ניתוח תחרותי שוטף
- להכין מצגות לבעלי עניין ולדירקטוריון',
  ARRAY['product_name', 'product_type', 'industry'],
  'סוכן מוצר עם Roadmap, דרישות, ניתוח משוב ומעקב מדדים',
  ARRAY['חזון מוצר', 'דרישות מפורטות', 'תיעדוף מבוסס', 'מדדי מוצר'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "product-agent"}'::jsonb,
  true
);

-- 19. Copywriter Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_019',
  'סוכן קופירייטינג',
  'marketing',
  'בניית סוכן AI לכתיבה שיווקית ופרסומית',
  'צור סוכן קופירייטר בסגנון {{writing_style}} עבור {{brand_name}} בתחום {{industry}}.
הסוכן צריך:
- לכתוב כותרות שמושכות תשומת לב ומניעות להקלקה
- ליצור תוכן לדפי נחיתה שממיר
- לנסח מודעות לרשתות חברתיות ו-Google Ads
- לכתוב תיאורי מוצר שמוכרים
- ליצור סלוגנים ומסרים מותגיים
- להתאים טון ושפה לקהל יעד שונה
- לבצע A/B Testing על גרסאות טקסט
- לכתוב בעברית שוטפת, יצירתית ונקייה מטעויות',
  ARRAY['writing_style', 'brand_name', 'industry'],
  'סוכן קופי עם כותרות, דפי נחיתה, מודעות ותוכן שיווקי',
  ARRAY['כותרות מושכות', 'המרה גבוהה', 'עברית מצוינת', 'התאמה למותג'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "copy-agent"}'::jsonb,
  true
);

-- 20. Event Planner Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_020',
  'סוכן תכנון אירועים',
  'creative',
  'בניית סוכן AI לתכנון וניהול אירועים',
  'צור סוכן תכנון אירועים מסוג {{event_type}} ל-{{guest_count}} אורחים עם תקציב של {{budget}}.
הסוכן צריך:
- לבנות לוח זמנים מפורט לתכנון האירוע
- להציע מקומות, ספקים ונותני שירות
- לנהל תקציב ולעקוב אחרי הוצאות
- ליצור רשימת משימות (Checklist) מקיפה
- לתכנן תוכנית אירוע דקה אחרי דקה (Run of Show)
- לנהל רשימת מוזמנים ו-RSVP
- להציע תפריט, עיצוב ואווירה
- לתכנן תוכנית חירום למקרי כוח עליון',
  ARRAY['event_type', 'guest_count', 'budget'],
  'סוכן אירועים עם לוחות זמנים, ספקים, תקציב ו-Checklist',
  ARRAY['לוח זמנים', 'ניהול תקציב', 'Checklist מקיף', 'תוכנית חירום'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "events-agent"}'::jsonb,
  true
);

-- 21. Podcast Producer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_021',
  'סוכן הפקת פודקאסט',
  'creative',
  'בניית סוכן AI לעזרה בהפקת פודקאסט',
  'צור סוכן הפקת פודקאסט בנושא {{podcast_topic}} בפורמט {{podcast_format}} לקהל {{target_audience}}.
הסוכן צריך:
- להציע נושאים ורעיונות לפרקים חדשים
- לכתוב תסריטים ושאלות לראיונות
- להציע אורחים פוטנציאליים ולנסח הזמנות
- לכתוב Show Notes ותיאורי פרקים ל-SEO
- להציע טכניקות הקלטה ועריכה
- לתכנן קמפיין שיווק לפרקים חדשים
- לנתח ביצועים - האזנות, שימור, ביקורות
- לעזור במונטיזציה - חסויות, Patreon, מרצ''נדייז',
  ARRAY['podcast_topic', 'podcast_format', 'target_audience'],
  'סוכן פודקאסט עם רעיונות, תסריטים, שיווק וניתוח ביצועים',
  ARRAY['רעיונות מקוריים', 'תסריטים מוכנים', 'שיווק פרקים', 'ניתוח מאזינים'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "podcast-agent"}'::jsonb,
  true
);

-- 22. Real Estate Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_022',
  'סוכן נדל''ן חכם',
  'sales',
  'בניית סוכן AI לסיוע בתחום הנדל''ן',
  'צור סוכן נדל''ן המתמחה ב-{{property_type}} באזור {{location}} לקהל של {{client_type}}.
הסוכן צריך:
- לעזור בחיפוש נכסים מתאימים לפי קריטריונים
- לספק ניתוח שוק ומחירים באזור
- להסביר תהליכי רכישה/מכירה/שכירות
- לחשב עלויות נלוות - מס רכישה, משכנתא, שיפוצים
- לעזור בהכנת מודעות מכירה/השכרה
- לספק מידע על שכונות ותשתיות
- להמליץ על אנשי מקצוע - שמאי, עו''ד, קבלנים
- לעקוב אחרי מגמות שוק ולהתריע על הזדמנויות',
  ARRAY['property_type', 'location', 'client_type'],
  'סוכן נדל''ן עם חיפוש נכסים, ניתוח שוק וליווי תהליכים',
  ARRAY['ניתוח שוק', 'חישוב עלויות', 'מידע שכונות', 'ליווי מקצועי'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "realestate-agent"}'::jsonb,
  true
);

-- 23. DevOps Engineer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_023',
  'סוכן DevOps',
  'dev',
  'בניית סוכן AI ל-DevOps ותשתיות',
  'צור סוכן DevOps עבור סביבת {{cloud_platform}} עם {{tech_stack}} ותהליכי {{ci_cd_tool}}.
הסוכן צריך:
- לעזור בכתיבת קבצי Configuration (Docker, K8s, Terraform)
- לנהל תהליכי CI/CD ולשפר זמני Build
- לנטר מערכות ולזהות בעיות ביצועים
- לעזור בניהול Incidents ו-Postmortems
- להמליץ על ארכיטקטורת תשתיות אופטימלית
- לכתוב סקריפטים לאוטומציה
- לנהל אבטחת תשתיות ו-Compliance
- לתעד תהליכים ולבנות Runbooks',
  ARRAY['cloud_platform', 'tech_stack', 'ci_cd_tool'],
  'סוכן DevOps עם קונפיגורציות, אוטומציה, ניטור ותיעוד',
  ARRAY['קונפיגורציה תקינה', 'אוטומציה', 'ניטור', 'תיעוד מקיף'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "devops-agent"}'::jsonb,
  true
);

-- 24. Accountant Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_024',
  'סוכן הנהלת חשבונות',
  'general',
  'בניית סוכן AI לסיוע בהנהלת חשבונות ומיסים',
  'צור סוכן הנהלת חשבונות עבור {{business_type}} בגודל {{business_size}} ב-{{country}}.
הסוכן צריך:
- להסביר חובות דיווח ומועדים (מע''מ, מס הכנסה, ביטוח לאומי)
- לעזור בסיווג הוצאות והכנסות
- לחשב מקדמות מס ולהתריע על מועדי תשלום
- להסביר הטבות מס וניכויים רלוונטיים
- לעזור בהכנת דוחות כספיים בסיסיים
- לספק מידע על חקיקת מס עדכנית
- להתריע על שינויי רגולציה רלוונטיים
- לציין שאינו מחליף רואה חשבון מוסמך
הערה: המידע הוא כללי ואינו מהווה ייעוץ מס.',
  ARRAY['business_type', 'business_size', 'country'],
  'סוכן חשבונאות עם מידע מס, דיווח, חישובים והתראות',
  ARRAY['מועדי דיווח', 'חישובי מס', 'הטבות רלוונטיות', 'אזהרת ייעוץ'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "accounting-agent"}'::jsonb,
  true
);

-- 25. UX Designer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_025',
  'סוכן עיצוב UX/UI',
  'dev',
  'בניית סוכן AI לעיצוב חוויית משתמש',
  'צור סוכן עיצוב UX/UI עבור {{product_type}} בפלטפורמת {{platform}} לקהל {{target_users}}.
הסוכן צריך:
- להציע ארכיטקטורת מידע וזרימות משתמש (User Flows)
- לתאר Wireframes טקסטואליים לעמודים מרכזיים
- להמליץ על Design System - צבעים, טיפוגרפיה, רכיבים
- לבדוק עקרונות נגישות (WCAG 2.1)
- להציע מיקרו-אינטראקציות ואנימציות
- לנתח ולשפר זרימות המרה
- לעזור בכתיבת UX Writing - טקסטים לממשק
- להציע שיטות בדיקת שמישות',
  ARRAY['product_type', 'platform', 'target_users'],
  'סוכן UX עם ארכיטקטורה, Wireframes, עקרונות עיצוב ו-UX Writing',
  ARRAY['זרימות משתמש', 'נגישות', 'עקביות עיצובית', 'UX Writing'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "ux-agent"}'::jsonb,
  true
);

-- 26. Business Strategy Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_026',
  'סוכן אסטרטגיה עסקית',
  'general',
  'בניית סוכן AI לייעוץ אסטרטגי עסקי',
  'צור סוכן אסטרטגיה עסקית עבור {{company_type}} בשלב {{business_stage}} בתחום {{industry}}.
הסוכן צריך:
- לעזור בגיבוש חזון, מיסיון ויעדים אסטרטגיים
- לבצע ניתוח SWOT ו-Porter''s Five Forces
- להציע מודלים עסקיים ומקורות הכנסה
- לעזור בהגדרת KPIs ו-OKRs
- לנתח הזדמנויות צמיחה וחדשנות
- לעזור בבניית תוכנית עסקית
- להציע אסטרטגיות כניסה לשווקים חדשים
- לנתח מגמות שוק ולזהות איומים והזדמנויות',
  ARRAY['company_type', 'business_stage', 'industry'],
  'סוכן אסטרטגי עם ניתוחים, מודלים עסקיים, KPIs ותוכנית צמיחה',
  ARRAY['ניתוח SWOT', 'מודל עסקי', 'KPIs מוגדרים', 'תוכנית צמיחה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "strategy-agent"}'::jsonb,
  true
);

-- 27. Parenting Coach Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_027',
  'סוכן ייעוץ הורי',
  'education',
  'בניית סוכן AI לייעוץ הורי ומשפחתי',
  'צור סוכן ייעוץ הורי עבור הורים לילדים בגילאי {{age_range}} עם דגש על {{parenting_focus}}.
הסוכן צריך:
- להציע אסטרטגיות חינוכיות מבוססות מחקר
- לעזור בהתמודדות עם אתגרים התנהגותיים
- להציע פעילויות לפיתוח מיומנויות לפי גיל
- לעזור בבניית שגרות יום ולילה
- להציע דרכים לחיזוק הקשר הורה-ילד
- לספק מידע על שלבי התפתחות נורמליים
- לעודד סגנון הורות חיובי וגבולות בריאים
- להפנות לאנשי מקצוע כשנדרש
הערה: אינו מחליף ייעוץ חינוכי או פסיכולוגי מקצועי.',
  ARRAY['age_range', 'parenting_focus'],
  'סוכן הורי עם אסטרטגיות חינוך, פעילויות וכלים מעשיים',
  ARRAY['מבוסס מחקר', 'מותאם גיל', 'כלים מעשיים', 'הפניה למקצועיים'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "parenting-agent"}'::jsonb,
  true
);

-- 28. Technical Writer Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_028',
  'סוכן כתיבה טכנית',
  'dev',
  'בניית סוכן AI לכתיבת תיעוד טכני',
  'צור סוכן כתיבה טכנית עבור {{product_or_technology}} בשפות {{languages}} לקהל {{audience_level}}.
הסוכן צריך:
- לכתוב תיעוד API ברור ומדויק
- ליצור מדריכי התחלה מהירה (Getting Started)
- לכתוב Tutorials שלב-אחרי-שלב
- ליצור FAQ ודפי פתרון בעיות (Troubleshooting)
- לתעד ארכיטקטורה ודיאגרמות מערכת
- לכתוב Release Notes ו-Changelogs
- לשמור על עקביות בסגנון ומונחים
- להתאים רמת פירוט לקהל היעד (מפתחים, משתמשים, מנהלים)',
  ARRAY['product_or_technology', 'languages', 'audience_level'],
  'סוכן תיעוד עם API docs, מדריכים, Tutorials ו-Release Notes',
  ARRAY['דיוק טכני', 'בהירות', 'עקביות', 'דוגמאות קוד'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "techwriter-agent"}'::jsonb,
  true
);

-- 29. Growth Hacker Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_029',
  'סוכן Growth Hacking',
  'marketing',
  'בניית סוכן AI לצמיחה מהירה ו-Growth Hacking',
  'צור סוכן Growth Hacking עבור {{product_type}} בשלב {{growth_stage}} עם תקציב {{budget_level}}.
הסוכן צריך:
- לזהות ערוצי צמיחה בעלי ROI גבוה
- לתכנן ניסויי צמיחה (Growth Experiments) בשיטת ICE
- לשפר Funnel ולזהות נקודות נשירה
- להציע אסטרטגיות ויראליות ו-Referral Programs
- לאופטם דפי נחיתה להמרה מקסימלית
- לנתח מדדי North Star ו-Pirate Metrics (AARRR)
- להציע Hacks יצירתיים בתקציב נמוך
- לתכנן לולאות צמיחה (Growth Loops) בני קיימא',
  ARRAY['product_type', 'growth_stage', 'budget_level'],
  'סוכן צמיחה עם ניסויים, אופטימיזציית Funnel ואסטרטגיות ויראליות',
  ARRAY['ניסויי צמיחה', 'מדדי AARRR', 'ROI מדיד', 'יצירתיות'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "growth-agent"}'::jsonb,
  true
);

-- 30. Community Manager Agent
INSERT INTO public_library_prompts (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'ab_030',
  'סוכן ניהול קהילה',
  'social',
  'בניית סוכן AI לניהול קהילה מקוונת',
  'צור סוכן ניהול קהילה עבור {{community_topic}} בפלטפורמת {{platform}} עם כ-{{community_size}} חברים.
הסוכן צריך:
- לנסח כללי קהילה ולאכוף אותם בעדינות
- ליצור תוכן שמעודד שיחה ומעורבות
- לקבל פני חברים חדשים ולשלב אותם
- לזהות ולטפח מנהיגי דעת קהל בקהילה
- לנהל דיונים ולפתור קונפליקטים
- לארגן אירועים ופעילויות קהילתיות
- לנתח מדדי קהילה - צמיחה, מעורבות, שימור
- לאסוף משוב ורעיונות מהקהילה לשיפור המוצר',
  ARRAY['community_topic', 'platform', 'community_size'],
  'סוכן קהילה עם ניהול שוטף, תוכן, אירועים וניתוח מדדים',
  ARRAY['כללי קהילה', 'מעורבות גבוהה', 'ניהול קונפליקטים', 'מדדי קהילה'],
  'AGENT_BUILDER',
  '{"name": "peroot-library", "category": "community-agent"}'::jsonb,
  true
);

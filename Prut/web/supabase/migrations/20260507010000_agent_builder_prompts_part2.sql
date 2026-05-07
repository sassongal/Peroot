-- Migration: Agent Builder Prompts — Part 2 (ab_059–ab_090)
-- 32 new AGENT_BUILDER prompts across: marketing, sales, education, general, creative

INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode)
VALUES

-- ═══ קטגוריה: marketing (ab_059–ab_066) ═══

('ab_059', 'סוכן יצירת מודעות ממומנות', 'marketing',
 'כתיבת Ad Creative לכל הפלטפורמות הדיגיטליות',
 'אתה קריאייטיב דיגיטלי בכיר. בנה סוכן שיכתוב מודעות ממומנות ל-{{product_name}} לקהל {{target_audience}} בפלטפורמות {{platforms}}.

עבור כל מודעה:
- Headline ראשי (30 תוים) + 2 חלופות
- Primary Text מותאם לפלטפורמה (Facebook/Instagram/LinkedIn/Google)
- CTA: פעולה ברורה ומניעה לפעולה
- Hook ראשוני: 3 שניות שמושכות תשומת לב
- Value Proposition: מה מבדיל מהמתחרים
- Social Proof: כיצד לשלב (אם רלוונטי)
- A/B Variants: 3 גרסאות לכל מודעה לבדיקה
- ציון Relevance Score מוערך לכל גרסה
- תקציב מוצע: {{budget}} — כיצד לחלק בין פלטפורמות',
 ARRAY['product_name', 'target_audience', 'platforms', 'budget'],
 'מודעות לכל פלטפורמה עם 3 A/B Variants + הצעת תקציב',
 ARRAY['Hook ראשוני', 'A/B Variants', 'CTA ברור', 'התאמה לפלטפורמה']),

('ab_060', 'סוכן השערות A/B Testing', 'marketing',
 'ניסוח השערות בדוקות לניסויי A/B',
 'אתה Growth Analyst. בנה סוכן שמנסח {{hypothesis_count}} השערות A/B לדף {{page_type}} עם המרה נוכחית של {{current_conversion}}%.

לכל השערה:
- If/Then/Because: מבנה מדויק
- מה משנים: אלמנט ספציפי (כותרת, CTA, תמונה, ניסוח)
- למה זה יעבוד: על בסיס פסיכולוגיה / Best Practice
- KPI ראשי: מה מודדים
- Sample Size הנדרש לסטטיסטיקה (p=0.05)
- משך ניסוי מוצע
- דרגת קדימות: Quick Win vs. Strategic Bet
- סדר ביצוע מומלץ בין ה-{{hypothesis_count}} ניסויים',
 ARRAY['page_type', 'current_conversion', 'hypothesis_count'],
 '{{hypothesis_count}} השערות A/B עם מבנה If/Then/Because + סדר ביצוע',
 ARRAY['מבנה If/Then/Because', 'Sample Size', 'KPI ברור', 'סדר ביצוע']),

('ab_061', 'סוכן תכנון השקת מוצר', 'marketing',
 'תכנון וביצוע Go-to-Market לכל שלבי ההשקה',
 'אתה CMO. בנה סוכן שמתכנן השקת מוצר של {{product_name}} לשוק {{target_market}} בתאריך {{launch_date}}.

תוכנית ההשקה:
- Pre-Launch (8 שבועות לפני): Waitlist, Teaser, Influencer Seeding
- Launch Day: Checklist שעה-אחר-שעה
- Post-Launch (4 שבועות): Follow-up, Reviews, Momentum
- תוכן לכל ערוץ: Email, Social, Blog, PR
- Key Messages: 3 נקודות ליבה + טיעון לכל Persona
- Objection Map: 5 התנגדויות צפויות + תשובות
- KPIs להשקה: מה הצלחה נראית כמוה ב-30/60/90 יום
- Budget Allocation: איך לחלק תקציב בין ערוצים',
 ARRAY['product_name', 'target_market', 'launch_date'],
 'תוכנית GTM מלאה עם Pre/Launch/Post + תוכן לכל ערוץ',
 ARRAY['Pre-Launch Checklist', 'Key Messages', 'KPIs ל-30/60/90 יום', 'הקצאת תקציב']),

('ab_062', 'סוכן עריכת Newsletter', 'marketing',
 'כתיבה ועריכה שבועית של ניוזלטר מותגי',
 'אתה עורך Newsletter מנוסה. בנה סוכן שכותב וועורך Newsletter שבועי עבור {{brand_name}} בנישת {{niche}} ל-{{subscriber_count}} מנויים בטון {{tone}}.

לכל גיליון:
- Subject Line: 3 אפשרויות + Preview Text לכל אחת
- Opening Hook: פתיחה שמשאירה קוראים עד הסוף
- תוכן מרכזי: 1 Story ראשי + 3 Nuggets קצרים
- Section קבוע: "מה שלמדנו השבוע" / "כלי שאנחנו משתמשים"
- CTA יחיד וברור — לא יותר מאחד לגיליון
- P.S. מקדד — הפסקה הנקראת ביותר
- Unsubscribe-Proof: אלמנט שמונע הסרה
- ציון Spam Risk לכל גיליון',
 ARRAY['brand_name', 'niche', 'subscriber_count', 'tone'],
 'גיליון Newsletter מלא עם Subject Lines, Hook, CTA ו-P.S.',
 ARRAY['3 Subject Lines', 'Opening Hook', 'CTA יחיד', 'Spam Risk Score']),

('ab_063', 'סוכן כתיבת הודעות PR', 'marketing',
 'כתיבת הודעות לעיתונות שעיתונאים ירצו לפרסם',
 'אתה PR Strategist. בנה סוכן שכותב הודעות לעיתונות עבור {{company_name}} בנושא {{news_topic}} לפרסומים {{target_publications}}.

ההודעה כוללת:
- כותרת: מה שעיתונאי יפרסם כמו שהוא
- תת-כותרת: Context נוסף
- Lead Paragraph: מי, מה, מתי, איפה, למה — ב-50 מילה
- Body: עובדות, נתונים, Background
- ציטוט מנהל: 2 גרסאות — רשמי ואנושי יותר
- Boilerplate: תיאור החברה ל-About Us
- Media Assets: רשימת מה להצמיד (לוגו, תמונות, וידאו)
- Pitch Email: 3 שורות לשלוח לעיתונאי בנפרד
- Embargo Policy אם רלוונטי',
 ARRAY['company_name', 'news_topic', 'target_publications'],
 'הודעת PR מלאה + Pitch Email + Boilerplate',
 ARRAY['Lead Paragraph מלא', 'ציטוט מנהל', 'Boilerplate', 'Pitch Email']),

('ab_064', 'סוכן מודיעין מתחרים', 'marketing',
 'ניתוח מתחרים וזיהוי פערים ומשמות שוק',
 'אתה Competitive Intelligence Analyst. בנה סוכן שמנתח מתחרים ל-{{company_name}} בסגמנט {{market_segment}}.

מתחרים לניתוח: {{competitors}}

לכל מתחרה:
- Positioning: איך הם מציגים את עצמם vs. אתכם
- Pricing: מודל, מחירים גלויים, הנחות ידועות
- Strengths: מה הם עושים טוב יותר (להיות כנים)
- Weaknesses: פערים בהצעת הערך שלהם
- Recent Moves: מה השתנה ב-6 חודשים אחרונים
- Vulnerability: לאן הם לא יכולים ללכת בקלות

סינתזה:
- Blue Ocean Opportunities: מה אף אחד לא עושה
- Battlecard: גיליון מוכן למכירות
- Win Strategy לכל מתחרה',
 ARRAY['company_name', 'market_segment', 'competitors'],
 'ניתוח מתחרים + Battlecard + Win Strategy לכל אחד',
 ARRAY['ניתוח לכל מתחרה', 'Blue Ocean', 'Battlecard', 'Win Strategy']),

('ab_065', 'סוכן שמירת קול מותג', 'marketing',
 'בדיקת עקביות קול המותג בכל תוכן יוצא',
 'אתה Brand Guardian. בנה סוכן שמוודא עקביות קול מותג של {{brand_name}} בסוגי תוכן {{content_types}}.

קול המותג: {{brand_voice_description}}

הסוכן בודק כל תוכן שנכנס:
- On-Brand Score: 1-10 עם פירוט
- סריקת אסורים: מילים, ביטויים, טון שלא הולמים
- סריקת מחויבים: אלמנטים שחייבים להיות בתוכן זה
- Consistency Check: השוואה ל-3 פיסות תוכן קודמות
- תיקונים ספציפיים: כל משפט עם "במקום / כתוב"
- Red/Yellow/Green Traffic Light לכל קטגוריה
- Approved Version: גרסה ערוכה מלאה ומוכנה לפרסום',
 ARRAY['brand_name', 'brand_voice_description', 'content_types'],
 'Brand Audit עם ציון, תיקונים ו-Approved Version',
 ARRAY['On-Brand Score', 'סריקת אסורים', 'Consistency Check', 'Approved Version']),

('ab_066', 'סוכן תכנון תוכנית Affiliate', 'marketing',
 'בניית תוכנית שותפים רווחית ומנוהלת',
 'אתה Affiliate Marketing Director. בנה סוכן לתכנון תוכנית שותפים ל-{{product_category}} עם מודל {{commission_model}} לשותפים מסוג {{target_affiliates}}.

תוכנית השותפים כוללת:
- מבנה עמלות: Tiers, Bonuses, Recurring לפי מודל {{commission_model}}
- Onboarding: מה שותף מקבל ב-Day 1 — Creative Assets, Link, Dashboard
- Content Guidelines: מה מותר, מה אסור בפרסום
- Tracking: Attribution Model, Cookie Duration, Fraud Prevention
- Communication: Cadence, Newsletter, Promo Calendar
- Top Affiliates: איך לזהות ולנרמל את ה-20% שמביאים 80%
- Payout Schedule ותנאי
- KPIs לתוכנית: מה מדידים חודשי',
 ARRAY['product_category', 'commission_model', 'target_affiliates'],
 'תוכנית Affiliate מלאה עם מבנה עמלות, Onboarding ו-KPIs',
 ARRAY['מבנה עמלות ברור', 'Onboarding Package', 'Fraud Prevention', 'KPIs']),

-- ═══ קטגוריה: sales (ab_067–ab_073) ═══

('ab_067', 'סוכן כישורי BANT', 'sales',
 'כשרות לידים שיטתית לפי מסגרת BANT',
 'אתה Sales Development Representative מנוסה. בנה סוכן שמכשיר לידים לפי BANT עבור {{product_name}} עם פרופיל לקוח אידיאלי {{ideal_customer_profile}} ומחיר {{price_range}}.

הסוכן מכשיר לפי:
- Budget: שאלות לגילוי תקציב ללא שאלה ישירה, אינדיקטורים עקיפים
- Authority: מיפוי מקבלי ההחלטות, Champion Mapping
- Need: חפירה לכאב אמיתי — 5 Why, Pain Discovery
- Timeline: דחיפות אמיתית vs. מנומסת — איך להבחין
- Disqualification: קריטריונים ברורים מתי לא לבזבז זמן
- Score: ציון BANT 0-4 עם המלצה — Pursue/Nurture/Disqualify
- Handoff: מה לכתוב לאיש המכירות עם כל ליד מכושר',
 ARRAY['product_name', 'ideal_customer_profile', 'price_range'],
 'סוכן כישורי לידים עם BANT Score + Handoff Notes',
 ARRAY['BANT Score', 'Pain Discovery', 'Disqualification Rules', 'Handoff Notes']),

('ab_068', 'סוכן בניית הצעות מחיר', 'sales',
 'יצירת הצעות מחיר מותאמות אישית שנסגרות',
 'אתה Senior Sales Executive. בנה סוכן לכתיבת הצעות מחיר ל-{{company_name}} שמציעה {{services_offered}} ב-{{pricing_tiers}}.

הצעת המחיר כוללת:
- Executive Summary: למה אנחנו, למה עכשיו, למה השקעה זו (1 עמוד)
- Understanding: הוכחה שהבנו את הבעיה של הלקוח
- Solution: מה מציעים בדיוק — Scope ברור, Deliverables
- Pricing Table: {{pricing_tiers}} עם מה כלול בכל רמה
- ROI Calculation: כמה הלקוח ירוויח/יחסוך
- Timeline: Milestones ומה הלקוח מחויב לספק
- Terms: תנאי תשלום, ביטול, SLA
- Social Proof: Case Study רלוונטי
- Next Step: CTA אחד ברור',
 ARRAY['company_name', 'services_offered', 'pricing_tiers'],
 'הצעת מחיר מלאה עם ROI, Pricing Table ו-CTA',
 ARRAY['Executive Summary', 'ROI Calculation', 'Scope ברור', 'CTA יחיד']),

('ab_069', 'סוכן ניתוח Win/Loss', 'sales',
 'ניתוח עסקאות שנסגרו ונפלו לשיפור תהליך המכירה',
 'אתה VP Sales Analytics. בנה סוכן לניתוח Win/Loss עבור {{product_name}} בגודל עסקה {{deal_size}} מול מתחרים {{main_competitors}}.

הסוכן מנתח:
- Win Patterns: מה משותף לעסקאות שנסגרו (Timing, Champion, Pain, Budget)
- Loss Patterns: מה משותף לעסקאות שנפלו — הסיבה האמיתית vs. הסיבה הנאמרת
- Competitor Win Rate: מול מי אנחנו מפסידים ולמה
- Deal Stage Analysis: היכן נופשות עסקאות ב-Pipeline
- Influencer Map: מי באמת מקבל החלטות
- Coaching Points: 3 שיפורים לכל rep על בסיס הנתונים
- Forecast Accuracy: כמה המנבא שלנו מדויק
- דוח חודשי: Trend + Action Items',
 ARRAY['product_name', 'deal_size', 'main_competitors'],
 'ניתוח Win/Loss מלא עם Patterns, Coaching Points ודוח חודשי',
 ARRAY['Win/Loss Patterns', 'Competitor Analysis', 'Coaching Points', 'Forecast Accuracy']),

('ab_070', 'סוכן Upsell וCross-sell', 'sales',
 'זיהוי הזדמנויות להגדלת עסקה עם לקוחות קיימים',
 'אתה Customer Success Manager. בנה סוכן לזיהוי Upsell ו-Cross-sell עבור {{product_catalog}} ללקוחות בסגמנט {{customer_segment}}.

דפוס רכישות קיים: {{purchase_history_pattern}}

הסוכן:
- מזהה Expansion Signals: שימוש גבוה, בקשות תמיכה, ביקורות חיוביות
- ממפה Next Best Offer לפי פרופיל לקוח
- מחשב Expansion Revenue Potential לכל לקוח
- מגדיר Playbook: מתי לפנות, מה להגיד, מה להציע
- מנסח Value Bridge: "כי אתם כבר עושים X, ה-Y הבא הגיוני הוא Z"
- מזהה At-Risk Accounts: לפני שמאחרים
- מייצר Prioritized List: לאיזה לקוחות לפנות השבוע
- כולל Script קצר לשיחת Expansion',
 ARRAY['product_catalog', 'customer_segment', 'purchase_history_pattern'],
 'Upsell Playbook עם Signals, Next Best Offer ו-Prioritized List',
 ARRAY['Expansion Signals', 'Next Best Offer', 'Value Bridge', 'Prioritized List']),

('ab_071', 'סוכן פנייה קרה מותאמת', 'sales',
 'כתיבת Cold Outreach מותאם אישית שמקבל תגובות',
 'אתה SDR מנוסה בפנייה קרה. בנה סוכן שכותב פניות קרות ל-{{prospect_role}} מ-{{sender_company}} עם הצעת ערך {{value_proposition}}.

לכל פנייה:
- Personalization Hook: משהו ספציפי על הפרוספקט (פוסט, פרסום, אירוע)
- Pain Bridge: קישור בין ה-Hook לכאב שאנחנו פותרים
- Value Statement: תוצאה קונקרטית (לא תכונות)
- Social Proof: 1 לקוח דומה ותוצאה מדידה
- CTA קל: שאלה כן/לא או בקשת 15 דקות
- Subject Lines: 5 אפשרויות שמובילות לפתיחה
- Sequence: Email 1 + Bump + LinkedIn Touch + Breakup Email
- Anti-Spam Score: לוודא שהמייל לא יגיע לספאם',
 ARRAY['sender_company', 'prospect_role', 'value_proposition'],
 'Sequence מלא 4 נגיעות עם 5 Subject Lines + Anti-Spam Score',
 ARRAY['Personalization Hook', 'CTA קל', 'Social Proof', 'Anti-Spam Score']),

('ab_072', 'סוכן אימון שיחת מכירה', 'sales',
 'תרגול ושיפור שיחות מכירה בסימולציה',
 'אתה Sales Coach בכיר. בנה סוכן לאימון שיחות מכירה של {{product_type}} עם התמודדות {{objection_types}} בשיטת {{selling_methodology}}.

הסוכן מדמה:
- 5 פרסונות לקוח שונות עם אישיות, כאב ורמת עניין שונה
- {{objection_types}} — התנגדויות אותנטיות עם עוצמה משתנה
- Interruptions: לקוחות שמפסיקים, מאחרים, מסיחים
- Silence Test: מה הנציג עושה כשהלקוח שותק

אחרי כל תרגול:
- ציון לפי {{selling_methodology}}: כל שלב בנפרד
- Quote Back: ציטוט מה שנאמר + מה היה עדיף
- One Big Win: הדבר הטוב ביותר שנעשה
- One Focus Area: שיפור אחד לתרגל',
 ARRAY['product_type', 'objection_types', 'selling_methodology'],
 'Simulator לשיחת מכירה עם 5 פרסונות + Scoring + Coaching',
 ARRAY['פרסונות מגוונות', 'ציון לפי שיטה', 'Quote Back', 'One Focus Area']),

('ab_073', 'סוכן ניהול Pipeline מכירות', 'sales',
 'ניתוח ועדכון Pipeline מכירות שוטף',
 'אתה Sales Operations Manager. בנה סוכן לניהול Pipeline מכירות ב-{{crm_tool}} עם {{deal_stages}} לצוות של {{team_size}} נציגים.

הסוכן מבצע שבועי:
- Pipeline Health Check: כמה עסקאות, ערך, זמן ממוצע בכל שלב
- Stale Deals: עסקאות שלא זזו ב-14+ ימים + סיבה משוערת
- Forecast Commit: מה בטוח, מה סביר, מה בסיכון
- Next Best Action לכל עסקה תקועה
- Velocity Metrics: זמן מחזור, Conversion Rate לכל שלב
- Rep Leaderboard: ביצועים לפי מדדים, לא רק Revenue
- Deal Review Agenda: מה לדון בפגישת Pipeline השבועית
- מייל מנהל: תקציר ב-5 bullet points',
 ARRAY['crm_tool', 'deal_stages', 'team_size'],
 'Pipeline Report שבועי עם Forecast, Stale Deals ו-Next Best Actions',
 ARRAY['Pipeline Health Check', 'Forecast Commit', 'Stale Deals', 'Rep Leaderboard']),

-- ═══ קטגוריה: education (ab_074–ab_079) ═══

('ab_074', 'סוכן תכנון קורס', 'education',
 'בניית תוכנית לימודים מלאה מאפס',
 'אתה Instructional Designer מנוסה. בנה סוכן לתכנון קורס ב-{{subject}} לגיל {{target_age}} למשך {{course_duration}} עם מטרות {{learning_goals}}.

הקורס כולל:
- מטרות לימוד: SMART לכל יחידה (Bloom Taxonomy)
- מפת לימוד: רצף יחידות עם תלויות ברורות
- לכל יחידה: תיאור, זמן, פעילויות, מטריאל, הערכה
- Differentiation: התאמות ל-3 רמות: מאתגר, ממוצע, דורש תמיכה
- הערכה: מתכונת לכל שלב + מחוון
- מיומנויות 21H Century: שילוב חשיבה ביקורתית, שיתוף פעולה
- Engagement: Hook לכל יחידה, דיסקושן קווסשנס
- תוכנית שיעור לדוגמה מלאה (יחידה ראשונה)',
 ARRAY['subject', 'target_age', 'course_duration', 'learning_goals'],
 'תוכנית לימודים מלאה + תוכנית שיעור לדוגמה',
 ARRAY['מטרות SMART', 'Bloom Taxonomy', 'Differentiation', 'תוכנית שיעור']),

('ab_075', 'סוכן מורה לשפה זרה', 'education',
 'הוראת שפה זרה בגישה תקשורתית ומותאמת',
 'אתה מורה לשפות מנוסה. בנה סוכן שמלמד {{target_language}} לדובר {{native_language}} ברמת {{student_level}}.

הסוכן מלמד:
- שיחה: Immersion Mode — שיחות אמיתיות בנושאים יומיומיים
- Grammar: הסבר בהקשר, לא כחוקים מנותקים
- Vocabulary Building: Spaced Repetition, מילה ביום
- Pronunciation: תיקון עדין ועידוד, לא ביקורת
- Error Correction: 3 רמות: תיקון מיידי / עיכוב / רק בסוף
- Cultural Notes: הקשר תרבותי לכל ביטוי
- Progress Tracker: מה נלמד, מה להתמקד בו הלאה
- Gamification: Streaks, Challenges, מיני-בחינות',
 ARRAY['target_language', 'native_language', 'student_level'],
 'סוכן שפה עם Immersion, Spaced Repetition ו-Progress Tracking',
 ARRAY['Immersion שיחתי', 'Error Correction מדורג', 'Cultural Notes', 'Gamification']),

('ab_076', 'סוכן תכנון לימוד אישי', 'education',
 'יצירת תוכנית לימוד מותאמת אישית למטרה ספציפית',
 'אתה Learning Coach. בנה סוכן שיוצר תוכנית לימוד אישית להשגת {{learning_goal}} עם {{available_hours_weekly}} שעות שבועיות ורמה נוכחית {{current_level}}.

התוכנית כוללת:
- Skill Gap Analysis: מה חסר בין עכשיו למטרה
- Learning Path: מסלול עם Milestones ל-30/60/90 יום
- Resource Curation: ספרים, קורסים, פודקאסטים — מדורגים לפי ROI
- שבוע לדוגמה: לוח שעות שבועי מפורט
- Active Learning: לא רק לצפות — תרגילים, פרויקטים, Teaching Others
- Accountability System: איך לא לנטוש
- Progress Metrics: כיצד לדעת שמתקדמים
- Plateau Protocol: מה לעשות כשמרגישים תקועים',
 ARRAY['learning_goal', 'available_hours_weekly', 'current_level'],
 'תוכנית לימוד ל-90 יום עם Resource Curation ו-Accountability',
 ARRAY['Skill Gap Analysis', 'Learning Path', 'Active Learning', 'Plateau Protocol']),

('ab_077', 'סוכן סיכום מחקר אקדמי', 'education',
 'סיכום וניתוח מאמרים אקדמיים לתובנות מעשיות',
 'אתה Research Analyst אקדמי. בנה סוכן שסוכם ומנתח מאמרים ב-{{research_field}} ברמת מורכבות {{complexity_level}} בפלט {{output_length}}.

לכל מאמר:
- TL;DR: מה המאמר עושה ב-3 משפטים
- Research Question: מה השאלה המרכזית
- Methodology: שיטת מחקר, Sample Size, Validity
- Key Findings: ממצאים ממוספרים לפי חשיבות
- Limitations: מה המחקר לא יכול לטעון
- Practical Implications: מה זה אומר בפועל
- Connections: קישור ל-3 מאמרים/תיאוריות קשורות
- Citation: פורמט APA/MLA/Chicago לפי {{complexity_level}}',
 ARRAY['research_field', 'complexity_level', 'output_length'],
 'סיכום מובנה עם TL;DR, Findings, Limitations ו-Implications',
 ARRAY['TL;DR ברור', 'Methodology Evaluation', 'Limitations', 'Practical Implications']),

('ab_078', 'סוכן מאמן כתיבה אקדמית', 'education',
 'שיפור כתיבה אקדמית ומדעית ברמה גבוהה',
 'אתה Academic Writing Coach. בנה סוכן לשיפור כתיבה אקדמית ל-{{academic_level}} בסגנון ציטוט {{citation_style}} בשפת {{language}}.

הסוכן עורך:
- Argument Structure: האם הטיעון ברור, מגובה, ומובנה
- Paragraph Logic: נושא, תמיכה, מסקנה — בכל פסקה
- Academic Tone: הסרת מילים לא פורמליות, חיזוק ניסוחים
- Citation Check: בדיקת פורמט {{citation_style}} לכל הפניה
- Hedging Language: שימוש נכון במייחסים אקדמיים
- Coherence: מעברים בין פסקאות ופרקים
- Abstract Writer: כתיבת/שיפור Abstract בלבד
- Feedback Levels: Macro (structure) → Micro (sentence) → Polish',
 ARRAY['academic_level', 'citation_style', 'language'],
 'עריכה אקדמית מלאה עם 3 רמות Feedback ו-Citation Check',
 ARRAY['Argument Structure', 'Citation Format', 'Academic Tone', '3 רמות Feedback']),

('ab_079', 'סוכן הכנה לבחינה', 'education',
 'הכנה ממוקדת ויעילה לבחינה ספציפית',
 'אתה Exam Prep Strategist. בנה סוכן שמכין ל-{{exam_name}} עם {{time_until_exam}} זמן פנוי, חולשות בתחומים {{weak_areas}}.

תוכנית ההכנה:
- Diagnostic Test: מבחן כניסה לאיתור פערים
- Study Plan: חלוקת החומר לפי עדיפות ומשקל בבחינה
- Active Recall: Flashcards, Feynman Technique, Practice Tests
- {{weak_areas}}: חיזוק ממוקד — הסבר, דוגמאות, תרגול
- Exam Strategy: ניהול זמן, סדר שאלות, איך לגשת לשאלות קשות
- Mental Prep: מניעת חרדת בחינות, Visualization
- Mock Exam: סימולציה מלאה בתנאי בחינה אמיתית
- Last 24h Checklist: מה לעשות ומה לא לעשות',
 ARRAY['exam_name', 'time_until_exam', 'weak_areas'],
 'תוכנית הכנה מלאה עם Diagnostic, Study Plan ו-Mock Exam',
 ARRAY['Diagnostic Test', 'Active Recall', 'Weak Areas Focus', 'Mock Exam']),

-- ═══ קטגוריה: general (ab_080–ab_086) ═══

('ab_080', 'סוכן עיבוד פגישות', 'general',
 'עיבוד הקלטות ותמלולי פגישות לתוצרים ניהולים',
 'אתה Executive Assistant מנוסה. בנה סוכן שמעבד {{meeting_type}} של {{participants_roles}} לפורמט {{action_items_format}}.

לכל פגישה:
- Summary: מה דנו ב-3 bullet points
- Decisions Made: רשימת החלטות עם מי קיבל וסיבה קצרה
- Action Items: מי, מה, מתי — בפורמט {{action_items_format}}
- Open Questions: מה נשאר פתוח לפגישה הבאה
- Parking Lot: רעיונות טובים שלא היה זמן לדון
- Follow-up Email: טיוטה מוכנה לשליחה לכל המשתתפים
- Next Meeting Agenda: הצעה לאג׳נדה הבאה על בסיס Parking Lot
- Sentiment Analysis: האם הפגישה הייתה פרודוקטיבית',
 ARRAY['meeting_type', 'participants_roles', 'action_items_format'],
 'פגישה מעובדת עם Decisions, Actions ו-Follow-up Email',
 ARRAY['Summary ברור', 'Action Items', 'Open Questions', 'Follow-up Email']),

('ab_081', 'סוכן ייעוץ OKR ו-KPI', 'general',
 'הגדרת יעדים ומדדי הצלחה עסקיים',
 'אתה OKR Coach מנוסה. בנה סוכן שמגדיר OKRs ו-KPIs עבור {{department}} ב-{{company_size}} לתקופה {{planning_period}}.

הסוכן:
- מגדיר 3-5 Objectives מעוררי השראה עבור {{department}}
- לכל Objective: 3-4 Key Results מדידים (מספר, לא פעולה)
- בודק OKRs לפי: Ambitious, Specific, Measurable, Time-bound
- מוודא יישור (Alignment) לאסטרטגיה הארגונית
- מבדיל: OKR (שאיפות) vs. KPI (בריאות שוטפת)
- מציע Leading Indicators לכל KPI
- בונה Check-in Template: שאלות לסקירה שבועית
- מזהה OKRs שסותרים בין צוותים',
 ARRAY['department', 'company_size', 'planning_period'],
 'סט OKRs מלא עם Key Results + KPIs + Check-in Template',
 ARRAY['3-5 Objectives', 'Key Results מדידים', 'Alignment', 'Check-in Template']),

('ab_082', 'סוכן כתיבת ביקורות ביצועים', 'general',
 'כתיבת סקירות ביצועים מאוזנות ומקצועיות לעובדים',
 'אתה HR Business Partner. בנה סוכן לכתיבת ביקורות ביצועים ל-{{employee_role}} בתקופת {{review_period}} לפי מסגרת {{performance_framework}}.

הסקירה כוללת:
- Executive Summary: 2 משפטי OverAll Performance
- Strengths: 3 חוזקות עם דוגמאות מהתקופה (STAR Method)
- Areas for Growth: 2-3 הזדמנויות פיתוח (לא חולשות)
- Goal Achievement: כמה מהיעדים שנקבעו הושגו
- Behavioral Competencies: ציון לפי {{performance_framework}}
- Development Plan: 3 פעולות קונקרטיות לתקופה הבאה
- Goals for Next Period: SMART Goals לתקופה הבאה
- Rating Justification: נימוק ציון סופי',
 ARRAY['employee_role', 'review_period', 'performance_framework'],
 'ביקורת ביצועים מלאה עם STAR, Development Plan ו-SMART Goals',
 ARRAY['STAR Method', 'Areas for Growth', 'Development Plan', 'SMART Goals']),

('ab_083', 'סוכן סיכום חוזה משפטי', 'general',
 'סיכום חוזים מורכבים לנקודות מרכזיות ורגלים',
 'אתה Legal Analyst. בנה סוכן לסיכום חוזי {{contract_type}} תחת דין {{jurisdiction}} עם רגישות סיכון {{risk_tolerance}}.

לכל חוזה:
- Summary: מה ההסכם ב-5 bullet points
- Key Obligations: מה כל צד חייב לעשות + מועדים
- Red Flags: סעיפים שדורשים תשומת לב משפטית
- Missing Protections: מה שאינו בחוזה ואמור להיות
- Renewal & Termination: תנאים, הודעות, עלות
- Liability & Indemnification: חשיפה מקסימלית
- Governing Law & Disputes: סמכות שיפוט, בוררות
- Plain Language: כל סעיף מורכב בעברית פשוטה

⚠️ אינו ייעוץ משפטי. לבחינה סופית יש להתייעץ עם עורך דין.',
 ARRAY['contract_type', 'jurisdiction', 'risk_tolerance'],
 'סיכום חוזה עם Red Flags, Missing Protections ו-Plain Language',
 ARRAY['Red Flags', 'Key Obligations', 'Missing Protections', 'Plain Language']),

('ab_084', 'סוכן תכנון תקציב', 'general',
 'בניית תוכנית תקציב מפורטת לארגון או מחלקה',
 'אתה CFO יועץ. בנה סוכן לתכנון תקציב עבור {{organization_type}} בגודל {{budget_size}} לשנת {{fiscal_year}}.

התקציב כולל:
- Revenue Forecast: 3 תרחישים — פסימי, בסיסי, אופטימי
- CapEx vs. OpEx: הפרדה ברורה + רציונל
- Cost Centers: חלוקה לפי מחלקות + % מהסה"כ
- Headcount Plan: כמה אנשים, מתי לגייס, עלות כוללת
- Contingency Fund: כמה לשמור ולמה
- Cash Flow Projection: חודשי לשנה קדימה
- KPIs פיננסיים: Burn Rate, Runway, Gross Margin
- Budget vs. Actual: תבנית לסקירה חודשית',
 ARRAY['organization_type', 'budget_size', 'fiscal_year'],
 'תקציב מלא עם 3 תרחישים, Cash Flow ו-KPIs פיננסיים',
 ARRAY['3 תרחישים', 'Cash Flow חודשי', 'KPIs פיננסיים', 'Budget vs. Actual']),

('ab_085', 'סוכן כתיבת נהלי עבודה', 'general',
 'כתיבת נהלים ותהליכי עבודה ברורים ומעשיים',
 'אתה Process Designer מנוסה. בנה סוכן לכתיבת נהלי עבודה עבור {{department}} בתהליך {{process_name}} לפי דרישות {{compliance_requirements}}.

הנוהל כולל:
- מטרה ותחום: מה הנוהל מסדיר ומה לא
- בעלי תפקידים: מי עושה מה — RACI Matrix
- צעדים: ממוספרים, ברורים, עם תנאי כניסה ויציאה לכל שלב
- טפסים ותבניות: כל דוקומנט נדרש עם הסבר
- Exceptions: מה לעשות כשמשהו לא עובד כרגיל
- Compliance: כיצד הנוהל עומד ב-{{compliance_requirements}}
- KPIs לתהליך: איך מודדים שהנוהל עובד
- Revision History: תבנית לעדכונים עתידיים',
 ARRAY['department', 'process_name', 'compliance_requirements'],
 'נוהל עבודה מלא עם RACI, Exceptions ו-KPIs לתהליך',
 ARRAY['RACI Matrix', 'Exceptions', 'Compliance', 'KPIs לתהליך']),

('ab_086', 'סוכן ניהול משבר ארגוני', 'general',
 'ניהול וטיפול במשברים ארגוניים בזמן אמת',
 'אתה Crisis Management Expert. בנה סוכן לניהול משבר מסוג {{crisis_type}} ב-{{organization_size}} עם {{stakeholders}} בעלי עניין.

פרוטוקול המשבר:
- Hour 1: 5 פעולות ראשונות שחובה לבצע
- Assessment: הערכת חומרה (1-5), היקף, מהירות התפשטות
- War Room: מי צריך להיות בחדר, תפקיד כל אחד
- Stakeholder Communication Plan: מה לאמר ל-{{stakeholders}}, מתי, באיזה ערוץ
- External Comms: הצהרה ציבורית מוכנה (טון: כנה, אחראי, פעיל)
- Internal Comms: עדכון עובדים — מה לאמר ומה לא
- Escalation Matrix: מתי לערב מי
- Post-Crisis Review: Lessons Learned בתוך 72 שעות',
 ARRAY['crisis_type', 'organization_size', 'stakeholders'],
 'פרוטוקול משבר מלא עם War Room, Comms Plan ו-Escalation Matrix',
 ARRAY['Hour 1 Actions', 'Stakeholder Comms', 'הצהרה ציבורית', 'Post-Crisis Review']),

-- ═══ קטגוריה: creative (ab_087–ab_090) ═══

('ab_087', 'סוכן כתיבת תסריטים', 'creative',
 'כתיבת תסריטים לסרטים, פרסומות ו-YouTube',
 'אתה תסריטאי מנוסה. בנה סוכן שכותב תסריטים ל-{{genre}} בפורמט {{duration_minutes}} דקות לפלטפורמת {{target_platform}}.

התסריט כולל:
- Logline: תמצית הסיפור במשפט אחד
- Structure: Act 1 (הצגה) / Act 2 (עימות) / Act 3 (פתרון) — Beats ברורים
- Characters: גיבור, אנטגוניסט, Mentor — עם Arc לכל אחד
- Scene Headers: INT/EXT, מיקום, זמן
- Action Lines: קצרות, ויזואליות, בהווה
- Dialogue: אותנטי, מקדם עלילה, In Character
- Subtext: מה שלא נאמר ישיר
- Hook: פתיחה שמחייבת להמשיך לצפות
- Ending Options: 2 אפשרויות סיום שונות',
 ARRAY['genre', 'duration_minutes', 'target_platform'],
 'תסריט מלא עם Structure, Characters ו-2 אפשרויות סיום',
 ARRAY['Logline', '3-Act Structure', 'Character Arc', 'Hook']),

('ab_088', 'סוכן סיפור מותג', 'creative',
 'בניית נרטיב מותג מרגש ואותנטי',
 'אתה Brand Storyteller. בנה סוכן שבונה נרטיב מותג עבור {{brand_name}} עם סיפור ייסוד {{founding_story}} וערכים {{brand_values}}.

הנרטיב כולל:
- Origin Story: הסיבה האמיתית שהמותג נוצר — הכאב, הרגע, ההחלטה
- Hero: מי הגיבור של הסיפור (הלקוח, לא החברה)
- Villain: מה הבעיה שנלחמים בה בעולם
- Transformation: מה משתנה ללקוח שבוחר בכם
- Brand Proof Points: 3 סיפורי לקוח אמיתיים בפורמט Before/After
- Manifesto: הצהרת אמונה של המותג — 250 מילה
- Tagline Options: 5 אפשרויות + הסבר לכל אחת
- About Us: 3 גרסאות — ארוך/קצר/Elevator Pitch',
 ARRAY['brand_name', 'founding_story', 'brand_values'],
 'נרטיב מותג מלא עם Manifesto, Taglines ו-3 גרסאות About Us',
 ARRAY['Origin Story', 'Hero/Villain', 'Manifesto', '5 Taglines']),

('ab_089', 'סוכן יצירת תוכן לילדים', 'creative',
 'יצירת תוכן חינוכי ומבדר לילדים בכל קבוצת גיל',
 'אתה יוצר תוכן לילדים מנוסה. בנה סוכן שיוצר {{content_type}} לגיל {{age_group}} בנושא {{topic}}.

התוכן:
- מותאם התפתחותית: מילון, מורכבות, אורך לגיל {{age_group}}
- Educational Hook: לימוד ובידור יחד — מה הילד לומד
- Characters: דמות ראשית שהילד מזדהה איתה
- Engagement: כל 3 דקות / פסקה — נקודת עניין חדשה
- Repetition & Rhythm: חזרות ולשון מקצבת לגיל צעיר
- Values: ערך אחד ברור (אחוות, עזרה, סקרנות)
- Safety Check: ללא תוכן מפחיד, מפלה, או לא מתאים
- Parent Notes: טיפ לסיום לשיחת הורה-ילד',
 ARRAY['age_group', 'topic', 'content_type'],
 'תוכן מותאם גיל עם Values, Engagement Points ו-Parent Notes',
 ARRAY['התאמה התפתחותית', 'Educational Hook', 'Safety Check', 'Parent Notes']),

('ab_090', 'סוכן כתיבת מילות שיר', 'creative',
 'כתיבת מילות שיר מקוריות לכל סגנון מוזיקלי',
 'אתה מחבר שירים מנוסה. בנה סוכן שכותב מילות שיר בסגנון {{genre}} על נושא {{theme}} בסגנון שפה {{language_style}}.

המילים כוללות:
- Verse 1: הצגת הנרטיב — 4-8 שורות
- Chorus: ה-Hook שנשאר בזיכרון — חזור על עצמו, רגשי, זכיר
- Verse 2: העמקה ופיתוח — זווית חדשה על אותו נושא
- Bridge: שבירת הדפוס — שינוי טון, נקודת מפנה רגשית
- Pre-Chorus: בניית מתח לפני הפזמון (אם מתאים)
- Rhyme Scheme: ABAB / AABB / מעורב — לפי הסגנון
- Meter: עקביות מוזיקלית בשורות
- Lyric Analysis: הסבר ל-3 שורות שהכי יצירתיות ולמה',
 ARRAY['genre', 'theme', 'language_style'],
 'שיר מלא עם Verse, Chorus, Bridge ו-Lyric Analysis',
 ARRAY['Hook זכיר', 'Rhyme Scheme', 'Bridge', 'Lyric Analysis'])

ON CONFLICT (id) DO NOTHING;

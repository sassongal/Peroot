-- ============================================
-- 90 Prompts for 6 New Categories - Peroot Public Library
-- Categories: cooking, travel, sports, personal-dev, greetings, music
-- 15 prompts per category
-- Language: Hebrew
-- ============================================

-- ============================================
-- COOKING (בישול) - 15 prompts
-- ============================================

-- 1
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תכנון תפריט שבועי למשפחה', 'תכנן לי תפריט שבועי מלא למשפחה עם ילדים, הכולל ארוחות בוקר, צהריים וערב. התפריט צריך להיות מגוון, מזין ומאוזן תזונתית. כלול מתכונים פשוטים שלא דורשים יותר מ-30 דקות הכנה ביום חול, ומתכונים מיוחדים יותר לשבת. ציין רשימת קניות מסודרת לפי מחלקות בסופר.', 'cooking', 'standard', true, 4.8, 450);

-- 2
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'המרת מתכון לטבעוני', 'קח את המתכון הבא והמר אותו לגרסה טבעונית מלאה, ללא שום מוצר מן החי. הצע תחליפים מדויקים לכל רכיב שאינו טבעוני, כולל כמויות מותאמות. הסבר איך התחליפים משפיעים על המרקם והטעם, ואילו התאמות נוספות נדרשות בזמני הבישול או הטמפרטורות.', 'cooking', 'standard', false, 4.5, 280);

-- 3
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מתכון מחומרים שיש בבית', 'יש לי בבית את החומרים הבאים. תציע לי 3 מתכונים שונים שאני יכול להכין מהם, מהקל ביותר למורכב ביותר. לכל מתכון תן הוראות הכנה מפורטות צעד אחר צעד, זמן הכנה משוער, ורמת קושי. אם חסר חומר קטן שאפשר לוותר עליו או להחליף, ציין זאת.', 'cooking', 'standard', false, 4.6, 320);

-- 4
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'התאמת מתכון לרגישות למזון', 'אני צריך להתאים מתכונים לאדם עם רגישות או אלרגיה למזון מסוים. עזור לי למצוא תחליפים בטוחים שישמרו על הטעם והמרקם המקוריים. הסבר על סיכוני חשיפה צולבת במטבח, ותן טיפים לבישול בטוח עבור אנשים עם אלרגיות מזון.', 'cooking', 'standard', false, 4.4, 180);

-- 5
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טכניקות בישול בסיסיות למתחילים', 'הסבר לי את טכניקות הבישול הבסיסיות שכל טבח ביתי צריך להכיר. כלול הסברים על טיגון, אפייה, בישול באדים, צלייה, והקפצה. לכל טכניקה תן דוגמה למנה פשוטה, טיפים להצלחה, וטעויות נפוצות שכדאי להימנע מהן. השתמש בשפה פשוטה ונגישה.', 'cooking', 'standard', false, 4.3, 210);

-- 6
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ארוחות הכנה מראש לשבוע עמוס', 'עזור לי לתכנן הכנת אוכל מראש ליום שישי, כך שיהיו לי ארוחות מוכנות לכל השבוע. אני רוצה 5 ארוחות צהריים ו-5 ארוחות ערב שאפשר לחמם בקלות. התמקד במתכונים שנשמרים טוב במקרר ובהקפאה, וסדר לי את העבודה ביום ההכנה בצורה יעילה.', 'cooking', 'standard', false, 4.7, 390);

-- 7
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מתכוני קינוחים בריאים', 'הצע לי 5 מתכוני קינוחים שהם גם טעימים וגם בריאים יחסית. אני רוצה קינוחים עם פחות סוכר מוסף, שמשתמשים בממתיקים טבעיים כמו תמרים או דבש. כלול ערכים תזונתיים משוערים לכל קינוח, זמן הכנה, ורמת קושי. לפחות אחד מהם צריך להיות ללא אפייה.', 'cooking', 'standard', false, 4.5, 260);

-- 8
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תפריט למסיבה ביתית', 'עזור לי לתכנן תפריט למסיבה ביתית של כ-20 אנשים. אני צריך מגוון מנות אצבע, סלטים, מנה עיקרית או שתיים, וקינוח. חלק מהאורחים צמחוניים וחלק לא אוכלים גלוטן. תכנן תפריט שמתאים לכולם, עם לוח זמנים להכנה כדי שהכל יהיה מוכן בזמן.', 'cooking', 'standard', false, 4.6, 300);

-- 9
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'בישול עם ילדים - מתכונים מהנים', 'הצע לי 5 מתכונים שאפשר להכין יחד עם ילדים בגילאי 4-10. המתכונים צריכים להיות בטוחים ללא שימוש בסכינים חדים או אש ישירה, מהנים ויצירתיים, וכאלה שהילדים באמת יאהבו לאכול. לכל מתכון ציין אילו משימות מתאימות לילדים ואילו לנוער או מבוגרים.', 'cooking', 'standard', false, 4.4, 190);

-- 10
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מדריך תיבול ותבלינים', 'צור לי מדריך מקיף לשימוש בתבלינים ועשבי תיבול במטבח. לכל תבלין עיקרי ציין מאיזה מטבח הוא מגיע, עם אילו מזונות הוא משתלב הכי טוב, כמויות מומלצות, ואילו תבלינים אחרים הם שותפים טובים שלו. כלול גם טיפים לאחסון נכון ולזמן חיי מדף של תבלינים.', 'cooking', 'deep_research', false, 4.7, 150);

-- 11
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ארוחת בוקר מזינה ומהירה', 'הצע לי 7 רעיונות לארוחות בוקר מזינות שלוקחות לא יותר מ-10 דקות הכנה. אני רוצה גיוון לכל יום בשבוע. כלול אפשרויות שאפשר להכין מהערב הקודם. לכל ארוחה ציין את הערך התזונתי המשוער וכמה היא תשביע אותי עד ארוחת הצהריים.', 'cooking', 'standard', false, 4.5, 340);

-- 12
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'בישול בתקציב מוגבל', 'עזור לי לתכנן תפריט שבועי מלא למשפחה של 4 בתקציב של 500 שקלים בלבד. המתכונים צריכים להיות מזינים, טעימים וחסכוניים. תן טיפים לקניות חכמות, ניצול שאריות, ושימוש בחומרי גלם זולים ליצירת מנות מרשימות. כלול רשימת קניות מדויקת עם הערכת מחירים.', 'cooking', 'standard', false, 4.6, 270);

-- 13
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מתכוני לחם ביתי', 'תן לי 3 מתכונים ללחם ביתי ברמות קושי שונות - לחם בסיסי למתחילים, לחם מחמצת לרמה בינונית, ופוקאצ''ה מקצועית. לכל מתכון הסבר את התהליך בפירוט, כולל הערות על הלישה, התפחה, טמפרטורות אפייה, וסימנים שהלחם מוכן. כלול גם טיפים לפתרון בעיות נפוצות.', 'cooking', 'standard', false, 4.8, 200);

-- 14
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מטבח ים תיכוני מסורתי', 'צור אוסף של 5 מתכונים קלאסיים מהמטבח הים-תיכוני, כולל סיפור הרקע של כל מנה. אני רוצה מתכונים אותנטיים עם חומרי גלם שזמינים בישראל. לכל מתכון הסבר את הטכניקות המסורתיות, ותן אפשרויות לקיצורי דרך מודרניים ללא פגיעה בטעם.', 'cooking', 'standard', false, 4.5, 230);

-- 15
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שימור וכבישה ביתית', 'הסבר לי את עקרונות השימור והכבישה הביתיים. אני רוצה ללמוד איך להכין כבושים, ריבות ורטבים ביתיים. תן לי 3 מתכונים מפורטים לכבושים שונים, עם הנחיות בטיחות חשובות, זמני אחסון, וסימנים שמשהו השתבש. כלול טיפים לעיקור צנצנות ולאחסון נכון.', 'cooking', 'standard', false, 4.3, 120);

-- ============================================
-- TRAVEL (טיולים) - 15 prompts
-- ============================================

-- 16
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תכנון טיול שבועי לאירופה', 'עזור לי לתכנן טיול של שבוע לאירופה. אני רוצה מסלול יום-יום מפורט הכולל אטרקציות, מסעדות מומלצות, אפשרויות תחבורה בין ערים ובתוכן, ולינה מומלצת. כלול הערכת תקציב יומית, טיפים לחיסכון, ואת הזמנים הכי טובים לביקור בכל אטרקציה כדי להימנע מתורים.', 'travel', 'deep_research', true, 4.9, 480);

-- 17
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'רשימת ארוז לטיול', 'צור לי רשימת אריזה מפורטת לטיול. ציין את סוג הטיול, היעד, משך הטיול ועונת השנה, ותן לי רשימה מסודרת לפי קטגוריות - ביגוד, מוצרי טואלטיקה, אלקטרוניקה, מסמכים, ופריטים שימושיים. כלול טיפים לאריזה חכמה שחוסכת מקום במזוודה.', 'travel', 'standard', false, 4.4, 310);

-- 18
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טיול בתקציב נמוך', 'אני רוצה לטייל בתקציב מוגבל. עזור לי למצוא דרכים לחסוך בטיסות, לינה, אוכל ותחבורה מקומית. הצע יעדים ידידותיים לתקציב, אפליקציות שימושיות למציאת מבצעים, וטיפים לחוויות חינמיות או זולות בכל יעד. כלול טעויות נפוצות שגורמות לבזבוז כסף בטיול.', 'travel', 'standard', false, 4.6, 350);

-- 19
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טיול עם ילדים', 'תכנן לי טיול משפחתי עם ילדים קטנים. אני צריך יעדים מתאימים לילדים, פעילויות שישעשעו את כל המשפחה, מסעדות ידידותיות לילדים, ולוח זמנים שמתחשב בקצב של ילדים קטנים. כלול טיפים לטיסה עם ילדים, ציוד חיוני, ואסטרטגיות להתמודדות עם מצבים מאתגרים.', 'travel', 'standard', false, 4.5, 290);

-- 20
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'חוויות מקומיות אותנטיות', 'אני רוצה לגלות את היעד שלי כמו מקומי ולא כמו תייר רגיל. הצע לי חוויות אותנטיות, שכונות פחות מוכרות, שווקים מקומיים, ומסעדות שהתושבים באמת אוהבים. תן לי ביטויים בסיסיים בשפה המקומית, נורמות תרבותיות חשובות, וטיפים להתנהגות מכבדת.', 'travel', 'standard', false, 4.7, 240);

-- 21
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מדריך טיולי שטח בישראל', 'הצע לי 5 מסלולי הליכה בטבע בישראל, מהקל למאתגר. לכל מסלול ציין את האורך, זמן ההליכה, רמת הקושי, עונה מומלצת, נקודות עניין לאורך הדרך, וכמה מים לקחת. כלול הנחיות בטיחות, מה לקחת, ואיפה אפשר לחנות בקרבת מקום.', 'travel', 'standard', false, 4.6, 380);

-- 22
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תכנון טיול רומנטי לזוג', 'עזור לי לתכנן חופשה רומנטית לזוג. אני רוצה הצעות ליעדים רומנטיים, מלונות מיוחדים, מסעדות אינטימיות, ופעילויות לזוגות. תכנן מסלול שמשלב הרפתקאות עם רגיעה, ותן רעיונות להפתעות רומנטיות שאפשר לשלב בטיול.', 'travel', 'standard', false, 4.5, 220);

-- 23
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הכנה לטיול ארוך בחוץ לארץ', 'אני מתכנן טיול ארוך של חודש או יותר. עזור לי עם רשימת הכנות מקיפה - ביטוח נסיעות, חיסונים, סידורים פיננסיים, הודעה לחברת אשראי, העתקי מסמכים, אפליקציות חיוניות, וטיפים לשמירה על קשר עם המשפחה. כלול גם עצות לעבודה מרחוק אם רלוונטי.', 'travel', 'deep_research', false, 4.4, 160);

-- 24
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טיולי יום באזור המרכז', 'הצע לי 5 רעיונות לטיולי יום מאזור המרכז בישראל, שמתאימים לכל המשפחה. לכל טיול ציין את זמן הנסיעה, עלות משוערת, שעות פעילות, ומה כדאי לקחת. כלול אפשרויות לאוכל באזור, חניונים, ופעילויות חלופיות למקרה של מזג אוויר לא מתאים.', 'travel', 'standard', false, 4.5, 420);

-- 25
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'צילום טיולים - טיפים ומיקומים', 'אני רוצה לצלם תמונות מדהימות בטיול שלי. תן לי טיפים לצילום נוף, אנשים ואוכל בטיול. הצע זמנים מומלצים לצילום, הגדרות מצלמה בסיסיות, וטיפים לקומפוזיציה. כלול גם המלצות לאפליקציות עריכה ודרכים לגיבוי התמונות בזמן הטיול.', 'travel', 'standard', false, 4.3, 170);

-- 26
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מדריך אוכל רחוב ביעד תיירותי', 'צור לי מדריך אוכל רחוב ליעד שאני מתכנן לבקר בו. אני רוצה לדעת אילו מאכלי רחוב מקומיים חובה לנסות, איפה למצוא אותם, כמה הם עולים בערך, מה לבדוק מבחינת היגיינה, ואילו מאכלים מתאימים לאנשים עם קיבה רגישה.', 'travel', 'standard', false, 4.6, 250);

-- 27
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טיול עם תרמיל גב', 'אני מתכנן טיול תרמילאים ראשון. עזור לי לבחור תרמיל מתאים, לדעת מה לארוז ומה לא, איך לתכנן מסלול גמיש, ואיך למצוא אכסניות וחדרים זולים. כלול טיפים לבטיחות אישית, שמירה על הציוד, ודרכים לפגוש מטיילים אחרים.', 'travel', 'standard', false, 4.4, 200);

-- 28
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'התמודדות עם ג''ט לג בטיול', 'אני טס ליעד עם הפרש שעות גדול ורוצה להתמודד עם הג''ט לג בצורה הכי טובה. תן לי תוכנית מפורטת - מה לעשות לפני הטיסה, במהלכה ואחריה. כלול טיפים לשינה, תזונה, חשיפה לאור, ופעילות גופנית שעוזרים להסתגל מהר למקום החדש.', 'travel', 'standard', false, 4.2, 130);

-- 29
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'טיול נגיש לבעלי מוגבלות', 'עזור לי לתכנן טיול נגיש לאדם עם מוגבלות פיזית. אני צריך מידע על יעדים נגישים, מלונות מותאמים, תחבורה נגישה, ואטרקציות שמתאימות לכיסא גלגלים. כלול טיפים לטיסה עם ציוד רפואי, ואיך לבדוק נגישות מראש.', 'travel', 'standard', false, 4.5, 100);

-- 30
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'השוואת יעדי טיול לחופשה', 'אני מתלבט בין מספר יעדים לחופשה הקרובה. עזור לי להשוות ביניהם לפי קריטריונים חשובים - עלות טיסה ולינה, מזג אוויר בתקופה המתוכננת, אטרקציות מרכזיות, בטיחות, אוכל, ונוחות הגעה. צור טבלת השוואה מסודרת עם המלצה סופית מנומקת.', 'travel', 'deep_research', false, 4.7, 310);

-- ============================================
-- SPORTS (ספורט) - 15 prompts
-- ============================================

-- 31
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תוכנית אימונים למתחילים', 'בנה לי תוכנית אימונים שבועית למתחילים שרוצים להיכנס לכושר. אני יכול להתאמן 3-4 פעמים בשבוע, כל אימון עד 45 דקות. כלול אימוני כוח, אירובי וגמישות. לכל תרגיל הסבר את הביצוע הנכון, מספר חזרות וסטים, ואיך להתקדם בהדרגה מדי שבוע.', 'sports', 'standard', true, 4.8, 460);

-- 32
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תזונת ספורטאים', 'צור לי תוכנית תזונה שתומכת באימונים שלי. אני מתאמן 4-5 פעמים בשבוע ורוצה לבנות מסת שריר. כלול דוגמאות לארוחות לפני ואחרי אימון, כמויות חלבון מומלצות, שילובי מזון אופטימליים, ורשימת מזונות שכדאי לצרוך ולהימנע מהם.', 'sports', 'standard', false, 4.6, 350);

-- 33
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מניעת פציעות באימון', 'הסבר לי איך למנוע פציעות ספורט נפוצות. כלול שגרת חימום נכונה, תרגילי מתיחות, טכניקות לביצוע תרגילים בצורה בטוחה, וסימני אזהרה שצריך להפסיק אימון. תן עצות ספציפיות לפציעות נפוצות כמו כאבי ברכיים, גב תחתון וכתפיים.', 'sports', 'standard', false, 4.5, 280);

-- 34
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תוכנית ריצה למרתון ראשון', 'בנה לי תוכנית אימוני ריצה ל-16 שבועות לקראת מרתון ראשון. אני יכול לרוץ כרגע 5 קילומטר ברצף. כלול אימוני מרווחים, ריצות ארוכות, ימי מנוחה, ושבוע טייפר לפני המרוץ. תן טיפים לבחירת נעליים, תזונה ביום המרוץ, ואסטרטגיית קצב.', 'sports', 'standard', false, 4.7, 220);

-- 35
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'אימון ביתי ללא ציוד', 'צור לי תוכנית אימון ביתית שלא דורשת שום ציוד. אני רוצה 5 אימונים שונים שעובדים על כל חלקי הגוף - חזה, גב, רגליים, כתפיים ובטן. כל אימון צריך לקחת 20-30 דקות. כלול וריאציות לרמות שונות ואפשרויות להחמרת התרגילים עם הזמן.', 'sports', 'standard', false, 4.6, 400);

-- 36
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שיפור טכניקת שחייה', 'אני רוצה לשפר את טכניקת השחייה שלי בסגנון חתירה. נתח את הטעויות הנפוצות ביותר בטכניקת שחייה, והסבר תרגילים ספציפיים לשיפור כל אלמנט - תנוחת גוף, תנועת ידיים, בעיטת רגליים ונשימה. כלול תוכנית אימונים שבועית לבריכה.', 'sports', 'standard', false, 4.4, 150);

-- 37
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'יוגה למתחילים - תוכנית 30 יום', 'צור לי תוכנית יוגה של 30 יום למתחילים מוחלטים. כל אימון צריך להיות 15-20 דקות. התחל מתנוחות בסיסיות והתקדם בהדרגה. לכל יום ציין את התנוחות, זמן החזקה, תרגילי נשימה, ומטרת האימון. כלול אזהרות בטיחות ומודיפיקציות לאנשים עם מגבלות.', 'sports', 'standard', false, 4.5, 330);

-- 38
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ניהול קבוצת ספורט חובבנית', 'אני מנהל קבוצת כדורגל חובבנית ואני צריך עזרה בארגון. עזור לי עם תוכנית אימונים שבועית, סידור הרכב ותורנויות, ניהול קופת הקבוצה, והתמודדות עם סכסוכים בין שחקנים. כלול טיפים למוטיבציה, בניית רוח קבוצתית, ותקשורת יעילה עם השחקנים.', 'sports', 'standard', false, 4.3, 120);

-- 39
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'התאוששות אחרי פציעת ספורט', 'אני חוזר מפציעת ספורט ורוצה לחזור לאימונים בצורה בטוחה. בנה לי תוכנית התאוששות הדרגתית שמתחילה מתרגילי שיקום קלים ומתקדמת בהדרגה לאימון מלא. כלול סימנים שמראים שאני מתקדם מהר מדי, תרגילי חיזוק לאזור הפגוע, ומתי כדאי לפנות לפיזיותרפיסט.', 'sports', 'standard', false, 4.4, 180);

-- 40
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'אימון כוח לנשים', 'בנה לי תוכנית אימוני כוח מותאמת לנשים, 3 פעמים בשבוע. אני רוצה לחזק את כל הגוף, לשפר יציבה ולעצב את הגוף. כלול תרגילים עם משקולות ובלי, הסברים מפורטים לטכניקה נכונה, ומיתוסים נפוצים על אימוני כוח לנשים שכדאי להפריך.', 'sports', 'standard', false, 4.7, 370);

-- 41
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הכנה לבדיקת כושר צבאית', 'אני צריך להתכונן לבדיקת כושר. עזור לי עם תוכנית אימונים של 8 שבועות שמשפרת סיבולת לב-ריאה, כוח עליון ותחתון, ויכולת ריצה. כלול מבחני ביניים למעקב אחרי ההתקדמות, ותוכנית תזונה תומכת שמתאימה לאימונים אינטנסיביים.', 'sports', 'standard', false, 4.5, 250);

-- 42
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'אימון גמישות ומתיחות', 'צור לי שגרת מתיחות וגמישות יומית של 15 דקות. אני יושב הרבה מול מחשב ורוצה לשפר את הגמישות ולהקל על כאבי גב וצוואר. כלול תרגילים לכל אזורי הגוף, זמני החזקה, ותרגילים ספציפיים למי שעובד בישיבה ממושכת.', 'sports', 'standard', false, 4.3, 290);

-- 43
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ציוד ספורט מומלץ למתחילים', 'אני מתחיל להתאמן ולא יודע איזה ציוד לקנות. עזור לי לבנות רשימת ציוד בסיסי לאימונים בחדר כושר ובבית. לכל פריט ציין למה הוא חשוב, טווח מחירים, ומה לחפש כשקונים. סדר לפי עדיפות - מה קריטי ומה אפשר להוסיף בהמשך.', 'sports', 'deep_research', false, 4.2, 190);

-- 44
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שיפור ביצועים בריצה', 'אני רץ חצי מרתון ב-2 שעות ורוצה לשפר ל-1:45. בנה לי תוכנית אימונים ממוקדת שכוללת אימוני מהירות, אימוני סף, ריצות קלות, ואימוני כוח משלימים. הסבר את העיקרון מאחורי כל סוג אימון ואיך הוא תורם לשיפור הזמן.', 'sports', 'standard', false, 4.6, 160);

-- 45
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'אימון לגיל השלישי', 'צור תוכנית אימונים בטוחה ויעילה לאנשים בגיל 60 ומעלה. התמקד בשיפור שיווי משקל, חיזוק עצמות, שמירה על מסת שריר, וגמישות. כלול אזהרות בטיחות, סימנים שצריך להפסיק, ואיך להתאים את האימון למגבלות בריאותיות שכיחות בגיל הזה.', 'sports', 'standard', false, 4.5, 140);

-- ============================================
-- PERSONAL-DEV (פיתוח אישי) - 15 prompts
-- ============================================

-- 46
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הגדרת מטרות שנתיות', 'עזור לי להגדיר מטרות שנתיות בצורה חכמה וברורה. אני רוצה לקבוע 3-5 מטרות מרכזיות לתחומי חיים שונים - קריירה, בריאות, יחסים, כלכלה ופיתוח אישי. לכל מטרה עזור לי להגדיר אותה לפי שיטת SMART, לפרק אותה לצעדים רבעוניים וחודשיים, ולהגדיר מדדי הצלחה.', 'personal-dev', 'standard', true, 4.8, 430);

-- 47
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'בניית הרגלים חדשים', 'אני רוצה לבנות הרגלים חדשים שיישארו לטווח ארוך. הסבר לי את המדע מאחורי יצירת הרגלים, ותן לי תוכנית מעשית ליישום. כלול טכניקות כמו צירוף הרגלים, עקרון ה-2 דקות, ומעקב אחרי התקדמות. עזור לי להבין למה הרגלים נכשלים ואיך להתגבר על מכשולים.', 'personal-dev', 'standard', false, 4.7, 380);

-- 48
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ניהול זמן אפקטיבי', 'אני מרגיש שאני לא מספיק את מה שאני רוצה ביום. עזור לי לבנות מערכת ניהול זמן שמתאימה לי. הצג שיטות שונות כמו Pomodoro, Time Blocking ומטריצת אייזנהאואר. עזור לי לזהות בזבזני זמן, לתעדף משימות, ולבנות שגרה יומית שמאזנת בין פרודוקטיביות למנוחה.', 'personal-dev', 'standard', false, 4.6, 350);

-- 49
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מדיטציה ומיינדפולנס למתחילים', 'אני רוצה להתחיל לתרגל מדיטציה ומיינדפולנס. צור לי תוכנית של 21 יום שמתחילה מ-5 דקות ביום ומתקדמת בהדרגה. לכל יום הסבר את התרגיל, על מה להתמקד, ואיך להתמודד עם מחשבות מסיחות. כלול גם תרגילי נשימה וטכניקות להרגעה מהירה בזמן לחץ.', 'personal-dev', 'standard', false, 4.5, 310);

-- 50
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'קידום קריירה ופיתוח מקצועי', 'אני רוצה לקדם את הקריירה שלי בשנה הקרובה. עזור לי למפות את הכישורים שיש לי ואת הפערים שצריך לסגור. הצע לי אסטרטגיות לנטוורקינג, שיפור קורות חיים, הכנה לראיונות עבודה, ודרכים להתבלט בעבודה הנוכחית. כלול משאבים ללמידה עצמית.', 'personal-dev', 'deep_research', false, 4.6, 260);

-- 51
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ניהול לחץ וחרדות יומיומיות', 'אני מתמודד עם לחץ ברמה גבוהה בעבודה ובחיים. תן לי כלים מעשיים להתמודדות עם לחץ ביומיום. כלול טכניקות נשימה, שינויים בשגרה היומית, תרגילים קוגניטיביים, ועצות לשינה טובה יותר. הבהר מתי כדאי לפנות לעזרה מקצועית.', 'personal-dev', 'standard', false, 4.7, 340);

-- 52
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שיפור כישורי תקשורת', 'אני רוצה לשפר את יכולת התקשורת שלי - בעבודה, ביחסים ובחיי החברתיים. הסבר עקרונות של תקשורת אפקטיבית, הקשבה פעילה, ותקשורת לא אלימה. תן דוגמאות מעשיות לשיחות קשות, משוב בונה, והצגת רעיונות בצורה משכנעת.', 'personal-dev', 'standard', false, 4.4, 230);

-- 53
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ניהול פיננסי אישי', 'עזור לי לסדר את הכספים שלי. אני רוצה ללמוד איך לבנות תקציב חודשי, לחסוך כסף, ולהתחיל להשקיע. הסבר עקרונות בסיסיים של ניהול כספים, כלל 50/30/20, קרן חירום, וצעדים ראשונים בהשקעות. כלול כלים ואפליקציות מומלצות למעקב אחרי הוצאות.', 'personal-dev', 'standard', false, 4.5, 290);

-- 54
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שגרת בוקר מנצחת', 'עזור לי לבנות שגרת בוקר שתעניק לי אנרגיה ומיקוד לכל היום. אני רוצה שגרה של 60-90 דקות שכוללת תנועה, מיינדפולנס, תכנון, ותזונה נכונה. הצג כמה אפשרויות בזמנים שונים ועזור לי להתאים את השגרה לסוג האדם שאני - ציפור מוקדמת או ינשוף לילה.', 'personal-dev', 'standard', false, 4.6, 360);

-- 55
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'פיתוח חשיבה חיובית', 'אני רוצה לפתח גישה חיובית יותר לחיים. הצג לי טכניקות מבוססות מחקר לפיתוח אופטימיות ואמונה עצמית. כלול תרגילי כתיבה כמו יומן הכרת תודה, שיטות לשינוי דפוסי חשיבה שליליים, ודרכים להתמודד עם ביקורת עצמית. תן דוגמאות מעשיות ליישום יומיומי.', 'personal-dev', 'standard', false, 4.4, 200);

-- 56
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'למידה עצמית אפקטיבית', 'אני רוצה ללמוד נושא חדש בצורה עצמאית. הסבר לי טכניקות למידה מבוססות מדע כמו חזרה מרווחת, שליפה פעילה ולמידה מלוכדת. עזור לי לבנות תוכנית למידה מסודרת, לבחור משאבים נכונים, ולשמור על מוטיבציה לאורך זמן. כלול כלים דיגיטליים שיעזרו לי.', 'personal-dev', 'standard', false, 4.5, 240);

-- 57
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'התמודדות עם דחיינות', 'אני סובל מדחיינות כרונית ורוצה להתגבר עליה. הסבר לי למה אנחנו דוחים דברים מנקודת מבט פסיכולוגית, ותן לי אסטרטגיות מעשיות להתגבר על זה. כלול טכניקת 5 הדקות, שבירת משימות גדולות לקטנות, מערכות אחריותיות, ודרכים ליצירת סביבה שמפחיתה דחיינות.', 'personal-dev', 'standard', false, 4.7, 410);

-- 58
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'פיתוח ביטחון עצמי', 'אני רוצה לחזק את הביטחון העצמי שלי. עזור לי להבין מאיפה חוסר ביטחון מגיע, ותן לי תרגילים יומיים לחיזוק ההערכה העצמית. כלול טכניקות לשפת גוף בטוחה, דיבור עצמי חיובי, ויציאה מאזור הנוחות בצעדים קטנים ומדידים.', 'personal-dev', 'standard', false, 4.5, 270);

-- 59
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'איזון בין עבודה לחיים', 'אני מרגיש שהעבודה משתלטת על כל החיים שלי. עזור לי למצוא איזון בריא בין עבודה, משפחה, תחביבים ומנוחה. הצע גבולות ברורים שאפשר להציב, שגרה שמאפשרת לנתק מעבודה, ודרכים לתקשר את הצרכים שלי למנהל ולמשפחה.', 'personal-dev', 'standard', false, 4.3, 180);

-- 60
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'כתיבה יומנית לפיתוח אישי', 'אני רוצה להתחיל לכתוב יומן אישי לצמיחה ופיתוח אישי. הצע לי מבנה יומני, שאלות מנחות לכל יום, ותבניות כתיבה שונות לימים שונים בשבוע. כלול טיפים לשמירה על עקביות, כמה זמן להקדיש, ודוגמאות לשאלות רפלקטיביות עמוקות.', 'personal-dev', 'standard', false, 4.4, 150);

-- ============================================
-- GREETINGS (ברכות) - 15 prompts
-- ============================================

-- 61
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת יום הולדת מרגשת', 'כתוב לי ברכת יום הולדת אישית ומרגשת. אני רוצה שהברכה תהיה חמה, כנה ומקורית - לא קלישאתית. כלול איחולים ספציפיים שמתאימים לאדם, זיכרון או חוויה משותפת שמחברת, ומשפט סיום מעורר השראה. הברכה צריכה להיות באורך של 4-6 משפטים.', 'greetings', 'standard', true, 4.7, 490);

-- 62
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת חתונה לזוג צעיר', 'כתוב ברכת חתונה מקורית ומרגשת לזוג שמתחתן. הברכה צריכה להביע שמחה כנה, לכלול איחולים לחיים משותפים מאושרים, ולהיות מתאימה לכתיבה בכרטיס. אפשר לשלב קצת הומור עדין לצד הרגש. הברכה צריכה להיות אישית ולא גנרית.', 'greetings', 'standard', false, 4.6, 350);

-- 63
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכה לראש השנה', 'כתוב ברכת שנה טובה מקורית שמתאימה לשליחה למשפחה, חברים ועמיתים לעבודה. הברכה צריכה לשלב איחולים מסורתיים עם מסר אישי ורלוונטי לזמן הנוכחי. כלול כמה גרסאות - רשמית, חברית, ומשפחתית. כל ברכה באורך של 3-5 משפטים.', 'greetings', 'standard', false, 4.5, 400);

-- 64
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מכתב תודה אישי', 'עזור לי לכתוב מכתב תודה כן ומרגש לאדם שעשה עבורי משהו משמעותי. אני רוצה להביע הכרת תודה עמוקה בלי להישמע מוגזם או מלאכותי. המכתב צריך לציין מה האדם עשה, איך זה השפיע עליי, ולמה אני מעריך את זה. שמור על טון חם ואותנטי.', 'greetings', 'standard', false, 4.6, 280);

-- 65
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'דברי ניחומים ותנחומים', 'עזור לי לכתוב דברי תנחומים לאדם שאיבד מישהו יקר. אני רוצה שהמילים יהיו מנחמות ותומכות, בלי קלישאות ריקות כמו "הזמן מרפא". כלול הכרה בכאב, זיכרון חיובי אם רלוונטי, והצעת תמיכה מעשית. שמור על רגישות ועדינות.', 'greetings', 'standard', false, 4.8, 180);

-- 66
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכה לחג פסח', 'כתוב ברכת פסח מקורית שמשלבת את מסר החירות והחידוש של החג עם איחולים אישיים. אני רוצה כמה גרסאות - לבני משפחה קרובים, לחברים, ולשליחה קבוצתית. כל ברכה צריכה להיות שונה ומקורית, בשפה עברית יפה ונגישה.', 'greetings', 'standard', false, 4.4, 320);

-- 67
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'נאום לאירוע משפחתי', 'עזור לי לכתוב נאום קצר לאירוע משפחתי כמו בר מצווה, יום הולדת עגול, או אירוע חגיגי אחר. הנאום צריך להיות מרגש אך לא ארוך מדי - כ-3 דקות. כלול פתיחה שתופסת תשומת לב, גוף עם סיפור אישי או זיכרון, ומסר מרגש לסיום.', 'greetings', 'standard', false, 4.5, 220);

-- 68
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת פרישה לגמלאות', 'כתוב ברכת פרישה מכבדת ומרגשת לעמית שיוצא לגמלאות. הברכה צריכה להוקיר את התרומה המקצועית שלו, להזכיר רגעים משמעותיים בדרך, ולאחל פרק חדש מלא בהנאה ומימוש חלומות. שמור על איזון בין כבוד מקצועי לחום אישי.', 'greetings', 'standard', false, 4.3, 110);

-- 69
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת לידה להורים טריים', 'כתוב ברכת מזל טוב ללידת תינוק. הברכה צריכה להביע שמחה אמיתית, להכיר במסע של ההורים, ולאחל בריאות ושמחה לתינוק ולכל המשפחה. כלול כמה גרסאות - לבן או בת, לתינוק ראשון, ולמשפחה שגדלה.', 'greetings', 'standard', false, 4.6, 260);

-- 70
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת הצלחה למיזם חדש', 'כתוב ברכת הצלחה לאדם שפותח עסק חדש או מתחיל בפרויקט משמעותי. הברכה צריכה להביע אמונה ביכולות שלו, לעודד אותו מול האתגרים, ולאחל הצלחה מעשית. שלב הערכה לאומץ שדורש צעד כזה, בלי להמעיט מהקשיים.', 'greetings', 'standard', false, 4.4, 170);

-- 71
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכה ליום השנה לזוג', 'כתוב ברכת יום נישואין מרגשת שחוגגת את הקשר בין בני הזוג. הברכה צריכה להכיר במסע המשותף, בצמיחה ההדדית, ובאהבה שגדלה עם השנים. אפשר לשלב קצת הומור על חיי הנישואין. כלול גרסאות ל-5, 10, 25 ו-50 שנות נישואין.', 'greetings', 'standard', false, 4.5, 200);

-- 72
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מכתב עידוד לחבר בקושי', 'עזור לי לכתוב מכתב עידוד ותמיכה לחבר שעובר תקופה קשה. אני רוצה להראות שאני שם בשבילו בלי לתת עצות שלא ביקש. כלול הכרה בקושי, הבעת אמונה ביכולת שלו לעבור את זה, והצעת עזרה קונקרטית. שמור על טון תומך ולא מתנשא.', 'greetings', 'standard', false, 4.7, 190);

-- 73
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת חנוכה מקורית', 'כתוב ברכת חנוכה שמשלבת את מסר האור, הנס והגבורה של החג עם איחולים אישיים ועדכניים. אני רוצה ברכה שמתאימה גם לשליחה בוואטסאפ וגם לכרטיס ברכה. כלול כמה גרסאות בטונים שונים - חגיגית, משפחתית ומצחיקה.', 'greetings', 'standard', false, 4.3, 250);

-- 74
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכת סיום לימודים', 'כתוב ברכה מרגשת למישהו שסיים תואר או קורס משמעותי. הברכה צריכה להוקיר את המאמץ, ההתמדה והמסירות, ולאחל הצלחה בהמשך הדרך. כלול הכרה באתגרים שהיו בדרך, ומבט אופטימי קדימה. מתאים לתואר ראשון, שני, או כל הישג לימודי.', 'greetings', 'standard', false, 4.5, 210);

-- 75
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ברכה עסקית רשמית', 'כתוב ברכות עסקיות מקצועיות למגוון אירועים - שנה חדשה, חגים, יום הולדת לשותף עסקי, וברכה ללקוח. הברכות צריכות להיות מכובדות, מקצועיות אך חמות, ומתאימות לשליחה בדוא"ל או כרטיס רשמי. כלול 5 ברכות שונות לאירועים שונים.', 'greetings', 'standard', false, 4.2, 130);

-- ============================================
-- MUSIC (מוזיקה) - 15 prompts
-- ============================================

-- 76
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'כתיבת מילים לשיר', 'עזור לי לכתוב מילים לשיר בעברית. אני רוצה שיר שמדבר על נושא שאני בוחר, עם חריזה טבעית ולא מאולצת. כלול בית, פזמון ובית שני לפחות. המילים צריכות להתאים לסגנון מוזיקלי מסוים ולהעביר רגש אמיתי. תן גם הצעות למבנה מלודי בסיסי.', 'music', 'standard', true, 4.7, 380);

-- 77
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'יסודות תורת המוזיקה', 'הסבר לי את יסודות תורת המוזיקה בצורה פשוטה ומובנת. התחל מסולמות מז''ור ומינור, אקורדים בסיסיים, מקצב ומשקל. השתמש בדוגמאות מוכרות משירים ישראליים ובינלאומיים. כלול תרגילים פרקטיים שאפשר לעשות גם בלי כלי נגינה.', 'music', 'standard', false, 4.5, 250);

-- 78
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'תוכנית תרגול לגיטרה למתחילים', 'צור לי תוכנית תרגול יומית לגיטרה למתחילים, 30 דקות ביום. חלק את הזמן בין תרגול אקורדים, מעברים, טכניקת יד ימין ויד שמאל, ושירים פשוטים. כלול רשימת 10 שירים ישראליים ובינלאומיים קלים שמתאימים למתחילים, עם האקורדים שלהם.', 'music', 'standard', false, 4.6, 320);

-- 79
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'יצירת פלייליסט לאירוע', 'עזור לי ליצור פלייליסט מושלם לאירוע. אני רוצה רשימת שירים מסודרת שיוצרת אווירה מתאימה ומתפתחת לאורך הערב. כלול שירי רקע, שירים להפעלת אנרגיה, שירי ריקוד, ושירים לסיום. תן לי 30-40 שירים עם השם, האמן, וההסבר למה כל שיר מתאים.', 'music', 'standard', false, 4.4, 290);

-- 80
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'ניתוח שיר מוזיקלי', 'נתח לי שיר מבחינה מוזיקלית ולירית. אני רוצה לדעת על המבנה המוזיקלי, הסולם, האקורדים העיקריים, הקצב, ומה הופך את השיר למיוחד. מבחינה לירית, נתח את הנושאים, המטפורות, מבנה החרוזים, והמסר שהכותב רצה להעביר. כלול הקשר היסטורי אם רלוונטי.', 'music', 'deep_research', false, 4.6, 170);

-- 81
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'לימוד פסנתר עצמאי', 'אני רוצה ללמוד פסנתר לבד בבית. צור לי מסלול למידה של 3 חודשים שמתחיל מאפס. כלול תרגילי אצבעות, קריאת תווים בסיסית, אקורדים פשוטים, וקטעים מוזיקליים שמתאימים לכל שלב. המלץ על משאבים חינמיים ברשת - סרטונים, אפליקציות ותווים.', 'music', 'standard', false, 4.5, 230);

-- 82
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הלחנת מנגינה פשוטה', 'עזור לי להלחין מנגינה פשוטה. הסבר לי את העקרונות הבסיסיים של הלחנה - איך לבחור סולם, ליצור מוטיב, לפתח אותו, וליצור מבנה של שיר שלם. תן לי תרגילים יצירתיים להתחיל, ודוגמאות למנגינות מפורסמות שנבנו על עקרונות פשוטים.', 'music', 'standard', false, 4.4, 140);

-- 83
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מוזיקה לריכוז ולמידה', 'המלץ לי על מוזיקה שעוזרת לריכוז ולמידה. הסבר את המדע מאחורי ההשפעה של מוזיקה על המוח, אילו סוגי מוזיקה מתאימים לאילו משימות, ומתי עדיף שקט. תן לי המלצות ספציפיות לאלבומים, פלייליסטים וז''אנרים שמשפרים תפוקה.', 'music', 'standard', false, 4.3, 260);

-- 84
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הקלטה ביתית איכותית', 'אני רוצה להקליט מוזיקה בבית באיכות טובה. הסבר לי על הציוד הבסיסי שצריך - מיקרופון, כרטיס קול, תוכנה, ואוזניות. תן טיפים לאקוסטיקה ביתית, הגדרות הקלטה, ותהליך הפקה בסיסי. כלול המלצות לציוד בתקציב מוגבל שנותן תוצאות טובות.', 'music', 'deep_research', false, 4.5, 150);

-- 85
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'הכרת סגנונות מוזיקליים', 'צור לי מדריך מקיף לסגנונות מוזיקליים עיקריים. לכל סגנון הסבר את המאפיינים, ההיסטוריה, אמנים מרכזיים, ו-5 שירים מייצגים שחובה להכיר. כלול ג''אז, רוק, היפ הופ, מוזיקה קלאסית, אלקטרונית, ומוזיקה ישראלית. הסבר את הקשרים בין הסגנונות.', 'music', 'deep_research', false, 4.7, 200);

-- 86
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'פיתוח שמיעה מוזיקלית', 'אני רוצה לפתח את האוזן המוזיקלית שלי. תן לי תרגילים יומיים לשיפור היכולת לזהות מרווחים, אקורדים, קצבים, וכלי נגינה. כלול תרגילים שאפשר לעשות תוך כדי הקשבה לשירים מוכרים, ואפליקציות או אתרים שעוזרים לאימון שמיעה.', 'music', 'standard', false, 4.4, 160);

-- 87
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'בחירת כלי נגינה ראשון', 'אני רוצה ללמוד לנגן ולא בטוח באיזה כלי להתחיל. עזור לי לבחור כלי נגינה מתאים לפי הגיל שלי, הזמן שיש לי לתרגל, התקציב, סוג המוזיקה שאני אוהב, ומה המטרות שלי. השווה בין 5-6 כלים נפוצים ותן לכל אחד יתרונות וחסרונות.', 'music', 'standard', false, 4.3, 190);

-- 88
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'כתיבת שיר ליום הולדת', 'עזור לי לכתוב שיר יום הולדת אישי ומצחיק למישהו שאני אוהב. השיר צריך להיות על מנגינה מוכרת שקל לשיר עליה, עם מילים שמתארות את האדם בצורה חמה ומשעשעת. כלול רפרנסים אישיים, הומור עדין, ומסר מרגש. תן לי כמה אפשרויות למנגינות מוכרות.', 'music', 'standard', false, 4.6, 340);

-- 89
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'מוזיקה לטקסים ואירועים', 'עזור לי לבחור מוזיקה לטקס או אירוע מיוחד - חתונה, בר מצווה, או טקס אחר. אני רוצה רשימת שירים לכל שלב באירוע - כניסה, הטקס עצמו, רגעים רגשיים, וחגיגה. כלול שירים ישראליים ובינלאומיים, ותן אלטרנטיבות לכל שלב.', 'music', 'standard', false, 4.5, 270);

-- 90
INSERT INTO public_library_prompts (id, title, prompt_text, category_id, capability_mode, is_featured, avg_rating, use_count)
VALUES (gen_random_uuid(), 'שיפור יכולת שירה', 'אני רוצה לשפר את יכולת השירה שלי. תן לי תוכנית תרגול שבועית שכוללת תרגילי חימום קולי, נשימה, הרחבת טווח, ודיוק גובה. הסבר טכניקות לשירה נכונה שלא פוגעת במיתרי הקול. כלול טיפים לשירה בציבור ולהתגברות על פחד במה.', 'music', 'standard', false, 4.4, 210);

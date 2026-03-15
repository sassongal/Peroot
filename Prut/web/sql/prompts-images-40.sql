-- ============================================================
-- 40 Image Generation Prompts for Peroot Public Library
-- Category: images | capability_mode: image_generation
-- ============================================================

-- Ensure the 'images' category exists
INSERT INTO public.library_categories (id, name_en, name_he, icon, sort_order)
VALUES ('images', 'Image Generation', 'יצירת תמונות', 'Image', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. Professional Portrait Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_001',
  'צילום פורטרט מקצועי',
  'images',
  'יצירת פורטרט מקצועי לפרופיל עסקי, לינקדאין, או אתר חברה',
  'Professional headshot portrait of a {gender} {age_range}, {ethnicity} appearance, wearing {clothing}, shot with an 85mm f/1.4 lens, shallow depth of field, soft studio lighting with a key light at 45 degrees, clean {background_color} background, natural skin texture, confident expression, corporate professional style, 4K, photorealistic',
  ARRAY['gender', 'age_range', 'ethnicity', 'clothing', 'background_color'],
  'תמונת פורטרט ברזולוציה גבוהה ביחס 3:4',
  ARRAY['תאורה טבעית ומחמיאה', 'רקע נקי', 'ביטוי פנים מקצועי', 'חדות גבוהה בפנים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 2. Landscape Photography - Golden Hour
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_002',
  'צילום נוף בשעת הזהב',
  'images',
  'יצירת תמונת נוף מרהיבה לשימוש כרקע אתר, פוסטר, או הדפסה',
  'Breathtaking {landscape_type} landscape at golden hour, {season} season, dramatic sky with warm orange and purple clouds, {foreground_element} in the foreground, shot with a wide-angle 16mm lens, deep depth of field, HDR, National Geographic quality, ultra-detailed, 8K resolution, cinematic color grading',
  ARRAY['landscape_type', 'season', 'foreground_element'],
  'תמונת נוף פנורמית ביחס 16:9',
  ARRAY['תאורה דרמטית', 'עומק שדה מלא', 'צבעים חמים ועשירים', 'חדות בכל התמונה'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 3. Product Photography - E-commerce
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_003',
  'צילום מוצר לחנות אונליין',
  'images',
  'יצירת תמונת מוצר מקצועית לאתר מסחר אלקטרוני או קטלוג',
  'Professional product photography of a {product_type}, {product_color} color, placed on a clean white infinity background, soft diffused studio lighting from three angles, subtle reflection on surface, sharp focus, commercial catalog style, high-end advertising quality, 4K, no shadows on background',
  ARRAY['product_type', 'product_color'],
  'תמונת מוצר על רקע לבן ביחס 1:1',
  ARRAY['רקע לבן נקי', 'תאורה אחידה ללא צללים חזקים', 'המוצר בפוקוס מלא', 'צבעים מדויקים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 4. Modern Logo Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_004',
  'עיצוב לוגו מודרני',
  'images',
  'יצירת לוגו מקצועי לעסק או מותג חדש',
  'Minimalist modern logo design for a {business_type} brand called {brand_name}, {style} style, using {color_palette} color palette, clean vector lines, scalable design, white background, professional branding, inspired by top design agencies, flat design, no gradients, balanced composition',
  ARRAY['business_type', 'brand_name', 'style', 'color_palette'],
  'לוגו וקטורי על רקע לבן ביחס 1:1',
  ARRAY['עיצוב נקי ומינימליסטי', 'קריא בכל גודל', 'פלטת צבעים מוגבלת', 'זכיר ומקורי'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 5. Social Media Post - Instagram
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_005',
  'גרפיקה לפוסט אינסטגרם',
  'images',
  'יצירת גרפיקה מעוצבת לפוסט ברשתות חברתיות',
  'Eye-catching Instagram post design about {topic}, {visual_style} aesthetic, vibrant {color_scheme} color scheme, modern typography overlay with text "{headline}", clean layout, trendy design elements, social media optimized, square format 1080x1080, professional graphic design, Instagram-worthy',
  ARRAY['topic', 'visual_style', 'color_scheme', 'headline'],
  'פוסט מרובע 1080x1080 לאינסטגרם',
  ARRAY['טקסט קריא', 'צבעים תואמים', 'עיצוב מותאם לרשתות חברתיות', 'מושך עין בפיד'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 6. Food Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_006',
  'צילום אוכל מקצועי',
  'images',
  'יצירת תמונת אוכל מפתה למסעדה, בלוג אוכל, או תפריט',
  'Mouth-watering food photography of {dish_name}, {cuisine_type} cuisine, beautifully plated on a {plate_style} plate, overhead flat lay angle, natural window light from the left, rustic wooden table surface, fresh herbs and ingredients scattered around, steam rising, shallow depth of field, editorial food magazine quality, appetizing colors',
  ARRAY['dish_name', 'cuisine_type', 'plate_style'],
  'תמונת אוכל מלמעלה ביחס 4:5',
  ARRAY['מראה מתאבן ומפתה', 'תאורה טבעית', 'סטיילינג מזון מקצועי', 'צבעים חמים ועשירים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 7. Architectural Visualization
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_007',
  'הדמיה אדריכלית',
  'images',
  'יצירת הדמיה אדריכלית ריאליסטית לפרויקט בניה או עיצוב פנים',
  'Photorealistic architectural visualization of a {building_type}, {architectural_style} style, exterior view at {time_of_day}, lush landscaping, {material} facade, floor-to-ceiling windows, dramatic lighting, urban context, people walking nearby for scale, V-Ray render quality, ultra-detailed, 8K resolution, architectural photography style',
  ARRAY['building_type', 'architectural_style', 'time_of_day', 'material'],
  'הדמיה אדריכלית ביחס 16:9',
  ARRAY['ריאליזם גבוה', 'פרופורציות נכונות', 'תאורה מדויקת לזמן ביום', 'חומרים וטקסטורות אמינים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 8. Fashion Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_008',
  'צילום אופנה',
  'images',
  'יצירת תמונת אופנה מקצועית לקמפיין או מגזין',
  'High fashion editorial photograph of a {model_description} wearing {clothing_description}, {pose_type} pose, shot in a {location} setting, dramatic {lighting_type} lighting, Vogue magazine style, fashion week quality, cinematic color grading, 85mm lens, shallow depth of field, stylish and edgy',
  ARRAY['model_description', 'clothing_description', 'pose_type', 'location', 'lighting_type'],
  'תמונת אופנה ביחס 2:3',
  ARRAY['פוזה דינמית ומעניינת', 'בגדים בפוקוס חד', 'תאורה דרמטית', 'אסתטיקה של מגזין אופנה'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 9. Abstract Art
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_009',
  'אמנות מופשטת',
  'images',
  'יצירת אמנות מופשטת להדפסה, קישוט קיר, או עיצוב פנים',
  'Abstract art painting, {art_movement} inspired, {color_palette} color palette, {texture_type} texture, expressive brushstrokes, {mood} mood, large canvas format, gallery quality, oil on canvas feel, rich layered composition, contemporary fine art, museum quality print',
  ARRAY['art_movement', 'color_palette', 'texture_type', 'mood'],
  'אמנות מופשטת ביחס 3:4 או 1:1',
  ARRAY['קומפוזיציה מאוזנת', 'צבעים הרמוניים', 'טקסטורה עשירה', 'עומק ושכבות'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 10. Book Cover Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_010',
  'עיצוב עטיפת ספר',
  'images',
  'יצירת עטיפת ספר מקצועית לרומן, ספר עיון, או ספר ילדים',
  'Professional book cover design for a {genre} book titled "{book_title}", {visual_theme} visual theme, {mood} atmosphere, compelling typography, {color_palette} color palette, bestseller quality design, front cover only, suitable for print and digital, eye-catching from thumbnail size, bookstore shelf appeal',
  ARRAY['genre', 'book_title', 'visual_theme', 'mood', 'color_palette'],
  'עטיפת ספר ביחס 2:3',
  ARRAY['כותרת קריאה בגודל קטן', 'מושכת תשומת לב על המדף', 'מתאימה לז''אנר', 'עיצוב מקצועי'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 11. Game Art - Character Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_011',
  'עיצוב דמות למשחק',
  'images',
  'יצירת עיצוב דמות מקצועי למשחק וידאו או הנפשה',
  'Detailed character design sheet for a {character_type} character, {art_style} art style, {setting} setting, showing front and side view, {armor_clothing} outfit, {weapon_accessory} accessory, dynamic pose, expressive face, rich detail, concept art quality, game-ready design, ArtStation trending, full body visible',
  ARRAY['character_type', 'art_style', 'setting', 'armor_clothing', 'weapon_accessory'],
  'גיליון עיצוב דמות ביחס 16:9',
  ARRAY['עיצוב עקבי מכל הזוויות', 'פרטים עשירים', 'סגנון מתאים לסוג המשחק', 'דמות מעניינת וזכירה'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 12. UI Mockup - Mobile App
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_012',
  'מוקאפ ממשק אפליקציה',
  'images',
  'יצירת מוקאפ ממשק משתמש לאפליקציית מובייל',
  'Clean modern mobile app UI mockup for a {app_type} application, {design_style} design style, iPhone screen displaying {screen_type} screen, {color_theme} color theme, professional UX layout, clear navigation, readable typography, consistent spacing, Material Design or iOS Human Interface Guidelines, Dribbble quality, high fidelity prototype look',
  ARRAY['app_type', 'design_style', 'screen_type', 'color_theme'],
  'מוקאפ ממשק מובייל ביחס 9:16',
  ARRAY['עיצוב נקי וקריא', 'ניווט אינטואיטיבי', 'טיפוגרפיה ברורה', 'עקביות ויזואלית'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 13. Children's Illustration
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_013',
  'איור לספר ילדים',
  'images',
  'יצירת איור צבעוני ומזמין לספר ילדים או חומר חינוכי',
  'Charming children''s book illustration of {scene_description}, whimsical {illustration_style} style, soft pastel colors with pops of {accent_color}, friendly and warm atmosphere, cute rounded characters, hand-drawn feel, storybook quality, suitable for ages {age_group}, joyful and imaginative, detailed background',
  ARRAY['scene_description', 'illustration_style', 'accent_color', 'age_group'],
  'איור ילדים ביחס 4:3 או כפולה',
  ARRAY['ידידותי ומזמין לילדים', 'צבעים רכים ונעימים', 'דמויות חמודות ומבטאות רגש', 'מתאים לגיל היעד'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 14. Real Estate Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_014',
  'צילום נדל"ן',
  'images',
  'יצירת תמונת נדל"ן מקצועית לפרסום דירה או בית',
  'Professional real estate photography of a {room_type} in a {property_style} home, {design_style} interior design, natural daylight streaming through large windows, wide-angle 14mm lens, HDR look, warm and inviting atmosphere, staged with modern furniture, clean and decluttered, straight vertical lines, real estate listing quality, bright and airy',
  ARRAY['room_type', 'property_style', 'design_style'],
  'תמונת נדל"ן ביחס 3:2',
  ARRAY['זווית רחבה של החדר', 'תאורה בהירה ומזמינה', 'קווים ישרים ומדויקים', 'חלל נקי ומסודר'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 15. Infographic Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_015',
  'עיצוב אינפוגרפיקה',
  'images',
  'יצירת אינפוגרפיקה ויזואלית להצגת מידע או נתונים',
  'Professional infographic design about {topic}, {visual_style} style, {color_scheme} color scheme, clear data visualization with icons and charts, {sections_count} main sections, modern flat design icons, clean typography hierarchy, vertical scrolling layout, easy to understand at a glance, corporate presentation quality, white background with colored accents',
  ARRAY['topic', 'visual_style', 'color_scheme', 'sections_count'],
  'אינפוגרפיקה אנכית ביחס 2:5 או 1:3',
  ARRAY['מידע ברור וקריא', 'היררכיה ויזואלית', 'אייקונים עקביים', 'זרימה לוגית של מידע'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 16. Wedding Photography Style
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_016',
  'צילום חתונה',
  'images',
  'יצירת תמונת חתונה רומנטית בסגנון מקצועי',
  'Romantic wedding photography scene, {couple_description} couple, {venue_type} venue, {time_of_day} lighting, dreamy bokeh background with fairy lights, soft warm tones, candid emotional moment, {wedding_style} wedding style, editorial quality, shallow depth of field, 70-200mm lens look, timeless and elegant',
  ARRAY['couple_description', 'venue_type', 'time_of_day', 'wedding_style'],
  'תמונת חתונה ביחס 3:2',
  ARRAY['רגע רגשי ואותנטי', 'תאורה רכה ורומנטית', 'בוקה יפה', 'אסתטיקה קלאסית'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 17. YouTube Thumbnail
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_017',
  'תמונה ממוזערת ליוטיוב',
  'images',
  'יצירת תמונה ממוזערת מושכת לסרטון יוטיוב',
  'Bold YouTube thumbnail design, {subject} as the main focus, {emotion} facial expression, bright {primary_color} and {secondary_color} color scheme, large bold text "{title_text}", dramatic lighting with rim light, slightly blurred background, high contrast, clickbait-worthy but professional, 1280x720 resolution, clean composition with text space on the right',
  ARRAY['subject', 'emotion', 'primary_color', 'secondary_color', 'title_text'],
  'תמונה ממוזערת 1280x720 ליוטיוב',
  ARRAY['בולטת בתוצאות חיפוש', 'טקסט קריא בגודל קטן', 'צבעים חזקים ומנוגדים', 'נושא ברור במבט ראשון'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 18. Podcast Cover Art
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_018',
  'עטיפת פודקאסט',
  'images',
  'יצירת עטיפה מקצועית לפודקאסט',
  'Professional podcast cover art for a {podcast_genre} podcast called "{podcast_name}", {design_style} style, {color_palette} color palette, bold readable title text, clean modern design, recognizable at small sizes, microphone or audio-related subtle design elements, square format 3000x3000, Apple Podcasts and Spotify optimized, memorable and brandable',
  ARRAY['podcast_genre', 'podcast_name', 'design_style', 'color_palette'],
  'עטיפת פודקאסט מרובעת 3000x3000',
  ARRAY['קריאה בגודל קטן', 'מזוהה עם נושא הפודקאסט', 'עיצוב מקצועי', 'בולטת בחנות האפליקציות'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 19. Flat Lay Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_019',
  'צילום Flat Lay',
  'images',
  'יצירת צילום שטוח מלמעלה של מוצרים או אביזרים בסידור אסתטי',
  'Aesthetic flat lay photography of {items_description}, arranged on a {surface_type} surface, {color_theme} color theme, overhead bird''s eye view, carefully curated composition, natural soft lighting, Instagram-worthy styling, negative space for text placement, clean and organized, lifestyle brand quality, {season} seasonal props',
  ARRAY['items_description', 'surface_type', 'color_theme', 'season'],
  'צילום Flat Lay מלמעלה ביחס 1:1',
  ARRAY['סידור מאוזן ואסתטי', 'חלל ריק לטקסט', 'תאורה אחידה', 'סגנון מותג לייפסטייל'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 20. Sci-Fi Concept Art
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_020',
  'אמנות קונספט מדע בדיוני',
  'images',
  'יצירת אמנות קונספט לפרויקט מדע בדיוני - סרט, משחק, או ספר',
  'Epic sci-fi concept art of {scene_description}, futuristic {environment_type} environment, {time_period} era, volumetric lighting with {light_color} neon accents, detailed machinery and technology, cinematic wide shot, matte painting quality, Syd Mead and Blade Runner inspired, atmospheric fog, 8K ultra-detailed, trending on ArtStation',
  ARRAY['scene_description', 'environment_type', 'time_period', 'light_color'],
  'אמנות קונספט ביחס 21:9 או 16:9',
  ARRAY['אווירה עתידנית משכנעת', 'פרטים טכנולוגיים עשירים', 'תאורה דרמטית', 'קנה מידה מרשים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 21. Watercolor Illustration
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_021',
  'איור בצבעי מים',
  'images',
  'יצירת איור בסגנון צבעי מים לכרטיסי ברכה, הזמנות, או עיצוב',
  'Delicate watercolor illustration of {subject}, soft translucent washes, {color_palette} palette, visible paper texture, gentle bleeding edges, botanical art influence, {mood} mood, hand-painted feel, fine detail work, white space as design element, elegant and refined, suitable for {use_purpose}',
  ARRAY['subject', 'color_palette', 'mood', 'use_purpose'],
  'איור צבעי מים ביחס 3:4',
  ARRAY['מעברי צבע עדינים', 'טקסטורת נייר נראית', 'תחושת ציור ידני', 'קומפוזיציה אלגנטית'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 22. Business Card Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_022',
  'עיצוב כרטיס ביקור',
  'images',
  'יצירת עיצוב כרטיס ביקור מקצועי ומודרני',
  'Premium business card design mockup for {profession}, {design_style} style, {color_scheme} color scheme, front and back view, clean modern typography, subtle {texture_effect} texture effect, rounded corners, printed on thick premium cardstock, professional layout with name, title, phone, email, and logo placeholder, minimalist and elegant',
  ARRAY['profession', 'design_style', 'color_scheme', 'texture_effect'],
  'כרטיס ביקור 90x50 מ"מ דו-צדדי',
  ARRAY['טקסט קריא', 'עיצוב מקצועי ונקי', 'פרטי קשר מסודרים', 'מראה פרימיום'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 23. T-Shirt Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_023',
  'עיצוב חולצת טי',
  'images',
  'יצירת עיצוב להדפסה על חולצה - למותג, אירוע, או חנות POD',
  'Creative t-shirt design, {design_theme} theme, {art_style} art style, "{slogan}" text integrated into design, {color_count} colors maximum for screen printing, centered chest placement, transparent background, bold and expressive, {target_audience} target audience, print-ready vector-style quality, trendy streetwear aesthetic',
  ARRAY['design_theme', 'art_style', 'slogan', 'color_count', 'target_audience'],
  'עיצוב חולצה על רקע שקוף',
  ARRAY['מתאים להדפסה', 'מספר צבעים מוגבל', 'עיצוב מרכזי וברור', 'מושך את קהל היעד'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 24. Social Media Story - Vertical
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_024',
  'עיצוב סטורי לרשתות חברתיות',
  'images',
  'יצירת עיצוב סטורי אנכי לאינסטגרם או פייסבוק',
  'Modern Instagram Story design for {business_type} brand, {content_type} content, vertical 1080x1920 format, {visual_style} visual style, {brand_colors} brand colors, bold headline "{headline}", call-to-action button at bottom, swipe-up friendly layout, engaging and scroll-stopping, mobile-first design, clean negative space',
  ARRAY['business_type', 'content_type', 'visual_style', 'brand_colors', 'headline'],
  'סטורי אנכי 1080x1920',
  ARRAY['עיצוב מותאם למובייל', 'CTA ברור', 'טקסט קריא על כל רקע', 'עוצר גלילה'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 25. Vintage / Retro Poster
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_025',
  'פוסטר בסגנון וינטג''',
  'images',
  'יצירת פוסטר בסגנון רטרו-וינטג'' לעיצוב, מסעדה, או אירוע',
  'Vintage retro poster design, {decade} era style, advertising {subject}, {color_palette} faded color palette, aged paper texture, halftone dot pattern, classic typography, slight grain and wear effects, {poster_size} poster format, nostalgic and charming, Art Deco or mid-century modern influence, collectible quality',
  ARRAY['decade', 'subject', 'color_palette', 'poster_size'],
  'פוסטר וינטג'' ביחס 2:3',
  ARRAY['אסתטיקה וינטג'' אותנטית', 'טיפוגרפיה מתקופתית', 'טקסטורת נייר ישן', 'קומפוזיציה קלאסית'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 26. Pet Portrait
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_026',
  'פורטרט חיית מחמד',
  'images',
  'יצירת פורטרט אמנותי של חיית מחמד להדפסה או מתנה',
  'Adorable {art_style} portrait of a {pet_type}, {breed} breed, {fur_color} fur, {expression} expression, {background_style} background, rich detail in fur texture, warm lighting, soulful eyes, high-quality fine art print style, suitable for framing, {size} canvas size, capturing the pet''s personality and charm',
  ARRAY['art_style', 'pet_type', 'breed', 'fur_color', 'expression', 'background_style', 'size'],
  'פורטרט חיית מחמד ביחס 1:1 או 3:4',
  ARRAY['פרוות מפורטת ומרקם עשיר', 'עיניים מבטאות אישיות', 'תאורה חמה', 'מתאים למיסגור'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 27. Website Hero Banner
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_027',
  'באנר ראשי לאתר',
  'images',
  'יצירת תמונת באנר ראשית לעמוד הבית של אתר',
  'Wide hero banner image for a {website_type} website, {visual_theme} theme, {color_scheme} color palette, professional and modern, large area of {overlay_side} side left clean for text overlay, subtle gradient fade, {imagery_type} imagery, optimized for web 1920x800 resolution, fast-loading friendly composition, brand-appropriate aesthetic',
  ARRAY['website_type', 'visual_theme', 'color_scheme', 'overlay_side', 'imagery_type'],
  'באנר רחב 1920x800 לאתר',
  ARRAY['שטח פנוי לטקסט', 'רזולוציה מתאימה לרוחב מסך', 'לא עמוס מדי', 'מתאים למותג'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 28. Isometric 3D Illustration
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_028',
  'איור איזומטרי תלת-ממדי',
  'images',
  'יצירת איור איזומטרי לאתר, מצגת, או חומרי שיווק',
  'Clean isometric 3D illustration of {scene_description}, {color_palette} color palette, soft shadows, {material_style} material style, cute miniature diorama feel, {detail_elements} as detail elements, white or light gray background, modern tech company aesthetic, friendly and approachable, Slack or Notion illustration style',
  ARRAY['scene_description', 'color_palette', 'material_style', 'detail_elements'],
  'איור איזומטרי ביחס 1:1 או 4:3',
  ARRAY['זווית איזומטרית מדויקת', 'צבעים עקביים', 'פרטים קטנים מקסימים', 'סגנון נקי ומודרני'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 29. Packaging Design - Product Box
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_029',
  'עיצוב אריזת מוצר',
  'images',
  'יצירת עיצוב אריזה מקצועי למוצר צרכני',
  'Premium product packaging design mockup for {product_type}, {brand_style} brand style, {color_scheme} color scheme, 3D box render at three-quarter angle, clean modern typography, {material} material texture, minimalist yet informative layout, shelf-ready design, showing front and one side panel, studio lighting, photorealistic render',
  ARRAY['product_type', 'brand_style', 'color_scheme', 'material'],
  'מוקאפ אריזה תלת-ממדי',
  ARRAY['עיצוב מקצועי ומזמין', 'טקסט קריא', 'חומרי אריזה ריאליסטיים', 'מתאים למדף'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 30. Event Invitation / Flyer
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_030',
  'עיצוב הזמנה לאירוע',
  'images',
  'יצירת הזמנה או פלייר מעוצבים לאירוע',
  'Elegant event invitation design for a {event_type}, {design_style} aesthetic, {color_palette} color palette, beautiful typography with event name "{event_name}", space for date, time, and venue details, {decorative_elements} decorative elements, printable A5 format, both digital and print friendly, sophisticated and eye-catching',
  ARRAY['event_type', 'design_style', 'color_palette', 'event_name', 'decorative_elements'],
  'הזמנה בגודל A5 או דיגיטלי',
  ARRAY['טקסט קריא', 'עיצוב מתאים לסוג האירוע', 'מקום לפרטי האירוע', 'אלגנטי ומזמין'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 31. Interior Design Visualization
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_031',
  'הדמיית עיצוב פנים',
  'images',
  'יצירת הדמיה ריאליסטית של חלל מעוצב לפרויקט עיצוב פנים',
  'Photorealistic interior design visualization of a {room_type}, {design_style} style, {color_scheme} color palette, {flooring_type} flooring, natural light from {window_direction}, carefully selected furniture and decor, cozy and lived-in feel, Architectural Digest quality, V-Ray or Corona render look, 4K resolution, warm ambient lighting',
  ARRAY['room_type', 'design_style', 'color_scheme', 'flooring_type', 'window_direction'],
  'הדמיית פנים ביחס 16:9 או 3:2',
  ARRAY['ריאליזם גבוה', 'סגנון עיצובי עקבי', 'תאורה טבעית', 'ריהוט מציאותי ומעוצב'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 32. Pixel Art / Retro Game Style
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_032',
  'אמנות פיקסל',
  'images',
  'יצירת אמנות פיקסל בסגנון משחקי רטרו',
  'Detailed pixel art of {subject}, {pixel_resolution} pixel resolution style, {color_palette} limited color palette, {scene_type} scene, clean pixel edges, retro {game_era} video game aesthetic, charming and nostalgic, suitable for game sprites or decorative prints, isometric or side-view perspective, no anti-aliasing, crisp pixels',
  ARRAY['subject', 'pixel_resolution', 'color_palette', 'scene_type', 'game_era'],
  'אמנות פיקסל ביחס 1:1 או 16:9',
  ARRAY['פיקסלים נקיים ומדויקים', 'פלטת צבעים מוגבלת', 'אסתטיקה רטרו אותנטית', 'פרטים חכמים בגודל קטן'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 33. Fitness / Sports Action Shot
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_033',
  'צילום ספורט וכושר',
  'images',
  'יצירת תמונת פעולה ספורטיבית לקמפיין כושר או מותג ספורט',
  'Dynamic sports action photography of {athlete_description} performing {activity}, {location} setting, frozen motion with fast shutter speed, dramatic {lighting} lighting, sweat and intensity visible, Nike or Adidas campaign quality, {camera_angle} camera angle, high energy and motivation, sharp focus on the athlete, motion blur in background',
  ARRAY['athlete_description', 'activity', 'location', 'lighting', 'camera_angle'],
  'תמונת ספורט ביחס 3:2 או 16:9',
  ARRAY['תנועה קפואה בחדות', 'אנרגיה ודינמיות', 'תאורה דרמטית', 'איכות קמפיין ספורט'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 34. Sticker / Emoji Design
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_034',
  'עיצוב סטיקר / אמוג''י',
  'images',
  'יצירת סטיקר מצויר לשימוש באפליקציות הודעות או מדבקות',
  'Cute sticker design of {character_description}, {emotion} emotion expression, {art_style} art style, thick black outline, vibrant colors, transparent background, slightly chibi proportions, expressive and fun, suitable for messaging app sticker pack, die-cut sticker shape, high resolution, kawaii influence',
  ARRAY['character_description', 'emotion', 'art_style'],
  'סטיקר על רקע שקוף',
  ARRAY['קו מתאר ברור', 'ביטוי רגשי מובן', 'צבעים חיים', 'מתאים לגודל קטן'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 35. Nature Macro Photography
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_035',
  'צילום מאקרו טבע',
  'images',
  'יצירת צילום מאקרו מפורט של אלמנט מהטבע',
  'Stunning macro photography of {subject}, extreme close-up, {lens}mm macro lens, razor-thin depth of field, {lighting_type} lighting, visible fine details like {detail_description}, dewdrops or water droplets, vibrant natural colors, {background_color} creamy bokeh background, National Geographic quality, tack sharp focus on subject',
  ARRAY['subject', 'lens', 'lighting_type', 'detail_description', 'background_color'],
  'צילום מאקרו ביחס 1:1 או 4:5',
  ARRAY['חדות קיצונית בנושא', 'בוקה חלק וקרמי', 'פרטים מיקרוסקופיים נראים', 'צבעים טבעיים ועשירים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 36. Album Cover Art
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_036',
  'עיצוב עטיפת אלבום מוזיקה',
  'images',
  'יצירת עטיפת אלבום מקצועית לזמר, להקה, או פלייליסט',
  'Iconic album cover art for a {music_genre} album titled "{album_title}" by {artist_type}, {visual_style} visual style, {mood} mood, {color_palette} color palette, square format, vinyl record quality artwork, culturally resonant imagery, bold artistic statement, memorable and iconic, suitable for Spotify and physical release, high contrast',
  ARRAY['music_genre', 'album_title', 'artist_type', 'visual_style', 'mood', 'color_palette'],
  'עטיפת אלבום מרובעת',
  ARRAY['זכירה ואייקונית', 'מתאימה לז''אנר המוזיקלי', 'עובדת בגודל קטן', 'אמירה אמנותית חזקה'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 37. Map / Fantasy World
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_037',
  'מפה של עולם פנטזיה',
  'images',
  'יצירת מפה מאוירת של עולם פנטזיה לספר, משחק תפקידים, או פרויקט יצירתי',
  'Hand-drawn fantasy world map, {map_style} cartography style, parchment paper texture, showing {terrain_features}, {number_of_kingdoms} kingdoms or regions labeled, compass rose, sea monsters in the ocean, mountain ranges with shading, forests represented as tiny trees, {color_style} coloring, Lord of the Rings or D&D quality, detailed coastlines and rivers',
  ARRAY['map_style', 'terrain_features', 'number_of_kingdoms', 'color_style'],
  'מפת פנטזיה ביחס 4:3 או 16:9',
  ARRAY['סגנון קרטוגרפי אותנטי', 'טקסטורת קלף', 'פרטים עשירים', 'שמות קריאים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 38. Jewelry / Accessory Product Shot
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_038',
  'צילום תכשיטים ואביזרים',
  'images',
  'יצירת צילום מוצר מקצועי לתכשיט או אביזר אופנה',
  'Luxurious jewelry product photography of a {jewelry_type}, {metal_type} metal with {gemstone} stones, placed on {surface_type} surface, soft focused sparkle and light reflections, macro detail showing craftsmanship, {lighting_setup} lighting setup, elegant and premium feel, Tiffany or Cartier catalog quality, shallow depth of field, 4K ultra-detailed',
  ARRAY['jewelry_type', 'metal_type', 'gemstone', 'surface_type', 'lighting_setup'],
  'צילום תכשיט ביחס 1:1 או 4:5',
  ARRAY['נצנוצים וברק טבעי', 'פרטי מלאכה נראים', 'מראה יוקרתי', 'חדות מקסימלית'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 39. Presentation Slide Background
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_039',
  'רקע למצגת',
  'images',
  'יצירת רקע מעוצב למצגת עסקית או חינוכית',
  'Professional presentation slide background, {theme} theme, {color_scheme} color scheme with subtle gradient, {pattern_type} pattern or abstract shapes, large clean area for text content, corporate and modern feel, non-distracting yet visually appealing, 1920x1080 resolution, suitable for PowerPoint or Google Slides, {style} style, light and dark variants',
  ARRAY['theme', 'color_scheme', 'pattern_type', 'style'],
  'רקע מצגת 1920x1080',
  ARRAY['שטח פנוי לתוכן', 'לא מסיח תשומת לב', 'מקצועי ומודרני', 'צבעים תואמים'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

-- ============================================================
-- 40. Street Art / Mural
-- ============================================================
INSERT INTO public.public_library_prompts
  (id, title, category_id, use_case, prompt, variables, output_format, quality_checks, capability_mode, source_metadata, is_active)
VALUES (
  'img_040',
  'אמנות רחוב וציורי קיר',
  'images',
  'יצירת עיצוב בסגנון אמנות רחוב או ציור קיר',
  'Vibrant street art mural on a {wall_type} wall, {art_style} style by a famous street artist, depicting {subject}, {color_palette} bold colors, spray paint texture, drips and splatters, {message} as visual theme, urban environment context, photographed straight-on, Banksy or Shepard Fairey quality, powerful and thought-provoking, weathered brick showing through',
  ARRAY['wall_type', 'art_style', 'subject', 'color_palette', 'message'],
  'ציור קיר ביחס 16:9 או 3:2',
  ARRAY['טקסטורת ספריי אותנטית', 'צבעים חזקים ובולטים', 'מסר ויזואלי חזק', 'הקשר עירוני משכנע'],
  'IMAGE_GENERATION',
  '{"name": "Prut Original", "url": "https://prut.co.il", "license": "proprietary"}'::jsonb,
  true
);

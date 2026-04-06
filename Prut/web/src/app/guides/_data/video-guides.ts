import type { Guide } from './image-guides';

export const VIDEO_GUIDES: Guide[] = [
  /* ──────────────────────────────────────────────
   * 1. Runway Gen-4
   * ────────────────────────────────────────────── */
  {
    slug: "runway",
    title: "מדריך פרומפטים ל-Runway Gen-4 — המדריך המלא",
    metaTitle: "מדריך פרומפטים ל-Runway Gen-4 — תנועת מצלמה, מבנה וטיפים | Peroot",
    metaDescription:
      "למד ליצור סרטוני AI עם Runway Gen-4 — Director Mode, תנועת מצלמה מקצועית, מבנה 4 רכיבים ודוגמאות מעשיות",
    platform: "Runway Gen-4",
    category: "video",
    color: "#06b6d4",
    icon: "🎬",
    readTime: "8 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["kling", "sora", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, הייתי משוכנע שמספיק לכתוב "אדם הולך ברחוב" ולקבל תוצאה קולנועית. אחרי עשרות ניסיונות כושלים ב-Runway, הבנתי שליצירת וידאו מקצועי צריך לחשוב כמו במאי — לא כמו מישהו שמתאר תמונה.</p>
<p>Runway Gen-4 שינה את הכללים. מנוע ה-Director Mode מאפשר שליטה מלאה בתנועת מצלמה, בתנועת נושאים ובאווירה הכללית. המדריך הזה מבוסס על מאות ניסויים שלי — כל טיפ כאן נבדק בפועל.</p>`,

    whatIs: `<p>Runway Gen-4 הוא מודל יצירת וידאו מתקדם מבית Runway שמייצר סרטוני AI באיכות גבוהה. הפלטפורמה מציעה שני מצבים: Standard לשימוש מהיר ו-Director Mode לשליטה מלאה בתנועת מצלמה.</p>
<p>בשונה מפלטפורמות אחרות, Runway לא תומך בפרומפטים שליליים — הכל צריך להיות מנוסח בצורה חיובית. זו למעשה יתרון: במקום לומר "ללא רעידות" אתה אומר "תנועת מצלמה חלקה ויציבה", מה שנותן למודל הנחיה ברורה יותר.</p>
<p>Gen-4 Turbo הוא גרסה מהירה יותר שמתאימה לאיטרציה מהירה — כשאתה מנסה כיוונים שונים, התחל עם Turbo ועבור ל-Gen-4 Standard לתוצאה הסופית.</p>`,

    structure: `<p>המבנה האופטימלי לפרומפט ב-Runway מורכב מ-<strong>4 רכיבים מרכזיים</strong>. תמיד התחל עם סוג השוט:</p>
<ol>
<li><strong>Subject Motion</strong> — מה הנושא עושה? "אישה צעירה מרימה כוס קפה לשפתיים"</li>
<li><strong>Camera Motion</strong> — איך המצלמה נעה? "slow dolly in from medium shot to close-up"</li>
<li><strong>Scene Motion</strong> — מה קורה ברקע? "leaves gently falling, steam rising from cup"</li>
<li><strong>Style</strong> — מה האסתטיקה? "soft golden hour light, shallow depth of field, cinematic color grade"</li>
</ol>
<p>סדר הרכיבים חשוב — Runway נותן משקל גבוה יותר למילים הראשונות בפרומפט. לכן תמיד התחל בסוג השוט (close-up, medium shot, wide shot) ואז עבור לתנועה.</p>
<p><strong>אוצר מילים למצלמה:</strong> pan (ימינה/שמאלה), tilt (למעלה/למטה), dolly (קדימה/אחורה), tracking (עוקב אחרי נושא), crane (תנועה אנכית), orbital (סיבוב סביב נושא), handheld (רעידה טבעית), static (מצלמה קבועה), zoom (שינוי פוקוס), dolly zoom (Vertigo effect).</p>
<p><strong>משך:</strong> 5 שניות או 10 שניות. <strong>יחס:</strong> 16:9, 9:16, 1:1.</p>`,

    rules: [
      "תמיד התחל עם סוג השוט — close-up, medium shot, wide establishing shot. זה הסימן הראשון ל-Runway איך לקמפז את הסצנה.",
      "השתמש בניסוח חיובי בלבד — אין negative prompts ב-Runway. במקום 'no blur' כתוב 'sharp focus throughout'.",
      "תאר תנועת מצלמה בצורה ספציפית — 'slow dolly in' עדיף על 'camera moves forward'. כלול מהירות (slow, medium, fast).",
      "הגבל את הפרומפט ל-2-3 פעולות מרכזיות — Runway עובד הכי טוב עם מיקוד ברור, לא עם 10 דברים שקורים בו-זמנית.",
      "השתמש ב-Gen-4 Turbo לאיטרציה מהירה ואז עבור ל-Standard לתוצאה הסופית — זה חוסך 60% מהזמן.",
      "בחר את משך הסרטון לפי מורכבות התנועה — 5 שניות לתנועות פשוטות, 10 שניות לסצנות מורכבות עם שינויי מצלמה.",
    ],

    params: [
      { name: "Duration", values: "5s / 10s", description: "משך הסרטון — 5 שניות לתנועות פשוטות, 10 שניות לסצנות מורכבות" },
      { name: "Aspect Ratio", values: "16:9 / 9:16 / 1:1", description: "יחס גובה-רוחב — 16:9 לקולנועי, 9:16 לריילס, 1:1 לסושיאל" },
      { name: "Mode", values: "Standard / Director", description: "Standard למהירות, Director לשליטה מלאה בתנועת מצלמה" },
      { name: "Model", values: "Gen-4 / Gen-4 Turbo", description: "Turbo מהיר יותר לאיטרציות, Standard לאיכות מקסימלית" },
    ],

    examples: [
      {
        concept: "דיוקן קולנועי",
        prompt:
          "Close-up shot. A woman in her 30s slowly turns her head toward the camera, soft smile forming. Slow dolly in. Warm golden hour sunlight wrapping around her face, shallow depth of field with bokeh in the background. Cinematic film grain, natural skin tones.",
        explanation:
          "מתחיל בסוג השוט (close-up), אחריו תנועת נושא (turns head), אחריו תנועת מצלמה (dolly in), ולבסוף סגנון (golden hour, film grain). מבנה 4 הרכיבים בפעולה.",
      },
      {
        concept: "נוף עירוני דינמי",
        prompt:
          "Wide establishing shot. Aerial view of a neon-lit cyberpunk city at night. Slow crane shot descending between skyscrapers. Flying cars streaming through the air, holographic billboards flickering. Rain-slicked streets reflecting neon colors. Blade Runner aesthetic, anamorphic lens flare.",
        explanation:
          "פותח ב-wide establishing shot שנותן ל-Runway להבין את הסקופ. תנועת crane descending מוסיפה דרמה. אלמנטי רקע (flying cars, holograms) נותנים חיים לסצנה.",
      },
      {
        concept: "תנועה אתלטית",
        prompt:
          "Medium shot, side angle. A parkour athlete launches off a concrete wall, spinning mid-air in slow motion. Tracking shot following the movement. Urban rooftop environment, dust particles catching sunlight. High contrast, desaturated tones, 120fps slow motion feel.",
        explanation:
          "Tracking shot עוקב אחרי התנועה ומייצר תחושת מהירות. 'slow motion' ו-'120fps feel' אומרים ל-Runway להאט את הפעולה — גם בלי פרמטר טכני.",
      },
      {
        concept: "אוכל premium",
        prompt:
          "Extreme close-up. Rich dark chocolate being poured slowly over a layered cake, viscous flow catching studio light. Static camera. Steam rising gently. Black marble surface, single spotlight from above, deep shadows. Commercial food photography style, 4K sharp.",
        explanation:
          "Static camera מאפשר למודל להתמקד בתנועת הנוזל. 'viscous flow' הוא מונח פיזיקלי שעוזר למודל לייצר תנועה ריאליסטית של שוקולד.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת 'no shaking, no blur, not dark' — ניסוח שלילי",
        good: "כתיבת 'steady camera, sharp focus, well-lit scene' — ניסוח חיובי",
        why: "Runway לא תומך בפרומפטים שליליים. המודל מתעלם מ-'no' ועלול דווקא לייצר את מה שביקשת להימנע ממנו. תמיד נסח בצורה חיובית.",
      },
      {
        bad: "שימוש ב-'cinematic video of a city' בלי לציין סוג שוט או תנועת מצלמה",
        good: "שימוש ב-'Wide establishing shot. Slow orbital pan around a glowing city skyline at dusk'",
        why: "בלי הנחיות ספציפיות לתנועה, Runway בוחר אקראית — לפעמים מצלמה סטטית, לפעמים תנועה מוזרה. תן הוראה מדויקת לתוצאה צפויה.",
      },
      {
        bad: "דחיסת 5 פעולות בפרומפט אחד: 'A man walks, sits down, drinks coffee, reads a book, and stands up'",
        good: "מיקוד בפעולה אחת: 'Medium shot. A man slowly lifts a coffee cup and takes a sip, steam curling upward. Static camera.'",
        why: "ב-5-10 שניות אין זמן ל-5 פעולות. Runway ינסה לדחוס הכל ויקבל תנועה מעוותת. מקד כל סרטון בפעולה אחת ברורה.",
      },
    ],

    personalTip:
      "הטריק הכי חזק שלי ב-Runway: תמיד התחל עם Gen-4 Turbo ב-5 שניות כדי לבדוק את הקומפוזיציה. כשמצאת כיוון טוב, עבור ל-Gen-4 Standard ב-10 שניות. זה חוסך לי שעות של ניסוי וטעייה. גם, שימו לב שהמילים ב-20 התווים הראשונים הן הכי משפיעות — לכן תמיד מתחיל בסוג השוט.",

    faq: [
      {
        question: "מה ההבדל בין Gen-4 Standard ל-Gen-4 Turbo?",
        answer:
          "Gen-4 Turbo מהיר פי 3-4 אבל באיכות מעט נמוכה יותר. הוא מושלם לאיטרציה מהירה — לבדוק קומפוזיציות, כיוונים ותנועות. כשמצאת את הכיוון הנכון, עבור ל-Standard לתוצאה הסופית באיכות מקסימלית.",
      },
      {
        question: "איך לשלוט בתנועת מצלמה ב-Director Mode?",
        answer:
          "ב-Director Mode אתה מגדיר את תנועת המצלמה בנפרד מהפרומפט הטקסטואלי. אפשר לשלב עד 2-3 תנועות — למשל dolly in + tilt up. אבל יותר מ-3 תנועות בו-זמנית גורם לתוצאות לא צפויות. התחל עם תנועה אחת ברורה.",
      },
      {
        question: "למה הסרטון שלי נראה 'AI-שי' עם תנועה לא טבעית?",
        answer:
          "הסיבה הנפוצה ביותר היא פרומפט עמוס מדי. הגבל את עצמך ל-1-2 פעולות מרכזיות. סיבה שנייה: חוסר בפרטי פיזיקה — תוסיף 'natural weight', 'realistic momentum', 'subtle body sway'. סיבה שלישית: העדר סגנון — תוסיף 'cinematic lighting', 'film grain', 'shallow depth of field'.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 2. Kling 3.0
   * ────────────────────────────────────────────── */
  {
    slug: "kling",
    title: "מדריך פרומפטים ל-Kling 3.0 — פיזיקה ותנועה מדויקת",
    metaTitle: "מדריך פרומפטים ל-Kling 3.0 — מבנה 6 רכיבים, 4K ואודיו | Peroot",
    metaDescription:
      "למד ליצור סרטונים עם Kling 3.0 — מבנה 6 רכיבים, תנועה פיזיקלית מדויקת, 4K, אודיו מקורי, Motion Brush ודוגמאות",
    platform: "Kling 3.0",
    category: "video",
    color: "#f43f5e",
    icon: "🎯",
    readTime: "9 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["runway", "veo", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, הבעיה הגדולה ביותר הייתה פיזיקה — שיער שמרחף באוויר, ידיים שעוברות דרך חפצים, גופים שגולשים על הרצפה. Kling 3.0 שינה את זה לגמרי.</p>
<p>מה שמפריד את Kling מהמתחרים הוא ההבנה הפיזיקלית העמוקה. הפלטפורמה מבינה משקל, מומנטום, גרביטציה ואינטראקציה בין אובייקטים. כשאתה כותב "כדור נופל על שולחן זכוכית" — הכדור באמת קופץ, הזכוכית רוטטת, והצללים מגיבים בהתאם.</p>`,

    whatIs: `<p>Kling 3.0 הוא מודל יצירת וידאו מתקדם מבית Kuaishou (חברת הטכנולוגיה הסינית) שמתמחה בתנועה פיזיקלית מדויקת. הוא תומך ברזולוציית 4K מקורית, אודיו מובנה, ומגוון משכי סרטון מ-3 עד 15 שניות.</p>
<p>היתרון הגדול של Kling הוא כלי <strong>Motion Brush</strong> — שמאפשר לסמן אזורים ספציפיים בתמונה ולהגדיר להם תנועה עצמאית. למשל, לסמן רק את השיער ולבקש שינוע ברוח בזמן שהגוף נשאר קבוע.</p>
<p>Kling גם תומך בפרומפטים שליליים (negative prompts), מה שנותן שליטה נוספת על התוצאה — אפשר לבקש "no morphing, no warping, no extra fingers" כדי להימנע מעיוותים נפוצים.</p>`,

    structure: `<p>המבנה האופטימלי ב-Kling מורכב מ-<strong>6 רכיבים</strong>:</p>
<ol>
<li><strong>Shot type + Camera</strong> — "Medium close-up, slow push in"</li>
<li><strong>Subject</strong> — מי או מה בפריים? "A ceramic artist in her 50s"</li>
<li><strong>Action + Physics</strong> — מה קורה, עם דגש על פיזיקה: "hands shaping wet clay on a spinning wheel, clay deforming under finger pressure, water splashing subtly"</li>
<li><strong>Environment</strong> — סביבה ואווירה: "sunlit pottery studio, shelves of finished pieces in the background"</li>
<li><strong>Lighting + Style</strong> — תאורה ואסתטיקה: "warm natural window light, dust particles in the air, documentary style"</li>
<li><strong>Technical</strong> — פרמטרים טכניים: "4K resolution, 24fps cinematic"</li>
</ol>
<p>המפתח הוא רכיב 3 — <strong>Action + Physics</strong>. ככל שתתאר יותר אינטראקציות פיזיקליות (משקל, חיכוך, גרביטציה), התוצאה תהיה ריאליסטית יותר.</p>
<p><strong>Negative prompt:</strong> הגבל ל-3-7 פריטים מקסימום. יותר מדי פריטים שליליים מבלבלים את המודל.</p>
<p><strong>משך:</strong> 3-15 שניות, גמיש לפי הצורך.</p>`,

    rules: [
      "תאר פיזיקה במפורש — 'water dripping with gravity', 'fabric swaying with weight', 'hair bouncing with momentum'. Kling מגיב מצוין למונחים פיזיקליים.",
      "השתמש ב-Motion Brush לתנועה סלקטיבית — סמן רק את האזור שאתה רוצה שינוע ותן לשאר להיות סטטי. זה מונע עיוותים מיותרים.",
      "הגבל negative prompt ל-3-7 פריטים — 'no morphing, no warping, no extra limbs, no blurry motion'. יותר מ-7 פריטים גורם לתוצאות לא צפויות.",
      "לסרטוני 4K השתמש במשך קצר יותר (3-5 שניות) — ב-4K הרזולוציה גבוהה מאוד והמודל מתמודד טוב יותר עם סצנות קצרות.",
      "תאר אינטראקציות בין אובייקטים — 'ball bouncing off wooden surface', 'liquid pouring into glass'. Kling מצטיין באינטראקציות פיזיקליות.",
      "לתוצאות עם אודיו, תאר צלילים במפורש — 'sound of rain on metal roof', 'footsteps on gravel'. Kling מייצר אודיו מותאם.",
    ],

    params: [
      { name: "Duration", values: "3s–15s", description: "משך גמיש — 3s לתנועות קצרות, 10-15s לסצנות מורכבות" },
      { name: "Resolution", values: "720p / 1080p / 4K", description: "4K מקורי — השתמש ל-hero shots, 1080p לעבודה יומיומית" },
      { name: "Mode", values: "Standard / Pro", description: "Pro לאיכות מקסימלית ופיזיקה מדויקת יותר" },
      { name: "Motion Brush", values: "On / Off", description: "סימון אזורי תנועה ידני — שליטה מלאה בתנועה סלקטיבית" },
      { name: "Negative Prompt", values: "טקסט חופשי", description: "3-7 פריטים מקסימום — מה לא לכלול בתוצאה" },
    ],

    examples: [
      {
        concept: "סצנת מים פיזיקלית",
        prompt:
          "Close-up shot, static camera. A single drop of water falls from a faucet into a still pool. The drop creates concentric ripples expanding outward, tiny secondary droplets bouncing upward from the impact point. Surface tension visible on the water. Macro lens, soft diffused lighting from above, dark background. Hyper-realistic, 4K.",
        explanation:
          "כל מילה מתארת התנהגות פיזיקלית: 'concentric ripples', 'secondary droplets bouncing', 'surface tension'. Kling מתרגם את זה לסימולציה מדויקת של מים.",
      },
      {
        concept: "סצנת אקשן ספורט",
        prompt:
          "Wide shot, tracking camera following the action. A skateboarder launches off a half-pipe ramp, board rotating beneath their feet in a kickflip. Gravity pulling them back down, knees absorbing the impact on landing, wheels gripping the concrete. Late afternoon sun casting long shadows. Urban skatepark, graffiti walls. Gritty documentary style, slight desaturation.\n\nNegative prompt: morphing, distorted limbs, unnatural movement",
        explanation:
          "תנועה ספורטיבית עם פיזיקה מורכבת: 'gravity pulling', 'knees absorbing impact', 'wheels gripping'. ה-negative prompt קצר ומדויק — רק 3 פריטים.",
      },
      {
        concept: "תנועת בד וטקסטיל",
        prompt:
          "Medium shot, slow motion. A silk scarf is tossed into the air, unfurling gracefully with fabric weight and air resistance. Light passing through the semi-transparent material, creating color shifts. The scarf slowly descends, folding under its own weight. White studio background, single soft light from the right. Fashion editorial aesthetic, clean and minimal.\n\nNegative prompt: stiff fabric, no movement, blurry",
        explanation:
          "תיאור פיזיקה של בד: 'fabric weight', 'air resistance', 'folding under its own weight'. Kling מצטיין בסימולציית טקסטיל כי הוא מבין מאפיינים פיזיקליים של חומרים.",
      },
      {
        concept: "אינטראקציה בין חפצים",
        prompt:
          "Top-down shot, static camera. Dominos arranged in a spiral pattern on a wooden table. The first domino is pushed, triggering a chain reaction. Each domino falls with realistic weight and momentum, creating a satisfying cascade. The sound of clicking wood. Warm overhead lighting, shallow depth of field blurring the edges. ASMR aesthetic, 4K resolution.\n\nNegative prompt: floating objects, no physics, frozen motion",
        explanation:
          "אינטראקציה מושלמת בין אובייקטים: 'chain reaction', 'realistic weight and momentum'. תיאור סאונד ('clicking wood') מפעיל את מנוע האודיו של Kling.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת negative prompt ארוך עם 15+ פריטים: 'no blur, no noise, no artifacts, no morphing, no warping, no extra limbs, no bad hands...'",
        good: "3-7 פריטים ממוקדים: 'no morphing, no warping, no extra limbs'",
        why: "יותר מ-7 פריטים שליליים מבלבלים את המודל ולפעמים דווקא גורמים לעיוותים. מקד ב-3 הבעיות הכי נפוצות שאתה רוצה להימנע מהן.",
      },
      {
        bad: "לא לתאר פיזיקה: 'A ball hits a table' — תיאור גנרי בלי פרטים פיזיקליים",
        good: "תיאור פיזיקלי מפורט: 'A rubber ball bounces off oak table, compressing on impact, rebounding with decreasing height'",
        why: "Kling מצטיין בפיזיקה — אבל רק אם אתה נותן לו מספיק מידע. 'bounces', 'compressing', 'rebounding' הם מילות מפתח שמפעילות את מנוע הפיזיקה.",
      },
      {
        bad: "בקשת סרטון 4K ב-15 שניות עם 5 דמויות בתנועה מורכבת",
        good: "4K ב-5 שניות עם 1-2 נושאים, או 1080p ב-15 שניות עם סצנה מורכבת יותר",
        why: "יש trade-off בין רזולוציה, משך ומורכבות. ב-4K עדיף סרטונים קצרים וממוקדים. למשכים ארוכים עם הרבה פעולה, 1080p נותן תוצאות יציבות יותר.",
      },
    ],

    personalTip:
      "הטריק שלי ב-Kling: אני תמיד כותב 'Physics note:' בסוף הפרומפט ומוסיף 2-3 הנחיות פיזיקליות ספציפיות. למשל 'Physics note: liquid has viscosity of honey, fabric has weight of wet cotton, hair follows natural gravity.' זה נשמע מוזר אבל עובד מעולה — Kling קורא את ההנחיות האלה ומשפר משמעותית את ריאליזם התנועה.",

    faq: [
      {
        question: "מה זה Motion Brush ואיך להשתמש בו?",
        answer:
          "Motion Brush הוא כלי שמאפשר לסמן אזורים ספציפיים בתמונת מקור ולהגדיר להם כיוון ומהירות תנועה. למשל, אתה יכול לסמן רק את השיער ולבקש שינוע ימינה, בזמן שהפנים נשארות יציבות. זה מושלם לסצנות שבהן אתה רוצה תנועה סלקטיבית — רוח שמזיזה רק עלים, או מים זורמים בחלק מהפריים.",
      },
      {
        question: "איך Kling 3.0 שונה מ-2.0?",
        answer:
          "Kling 3.0 הביא שלושה שיפורים מהותיים: רזולוציית 4K מקורית (במקום upscale), מנוע פיזיקה משופר שמבין חומרים שונים (זכוכית, מתכת, בד, נוזל), ואודיו מקורי מובנה שמייצר סאונד מתאים לפעולה בסרטון. בנוסף, משך הסרטון התרחב ל-15 שניות.",
      },
      {
        question: "מתי להשתמש ב-Kling ומתי ב-Runway?",
        answer:
          "Kling עדיף לסצנות שדורשות פיזיקה מדויקת — נוזלים, תנועת גוף, אינטראקציות בין חפצים. Runway עדיף לסצנות קולנועיות עם תנועת מצלמה מורכבת ושליטה ב-Director Mode. אם אתה יוצר סרטון של מים זורמים — Kling. אם אתה יוצר שוט סינמטי עם crane shot — Runway.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 3. Sora 2
   * ────────────────────────────────────────────── */
  {
    slug: "sora",
    title: "מדריך פרומפטים ל-Sora 2 — סטוריבורד קולנועי",
    metaTitle: "מדריך פרומפטים ל-Sora 2 — מבנה, דיאלוג ו-character refs | Peroot",
    metaDescription:
      "למד ליצור סרטונים עם Sora 2 — מבנה סטוריבורד מובנה, דיאלוג מסונכרן, character references, עד 20 שניות ודוגמאות מעשיות",
    platform: "Sora 2 (OpenAI)",
    category: "video",
    color: "#a855f7",
    icon: "🌀",
    readTime: "7 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["runway", "kling", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, Sora של OpenAI היה השם הראשון שכולם הזכירו. אחרי חודשים של עבודה עם Sora 2, הבנתי שהיתרון האמיתי שלו הוא לא באיכות הטכנית — אלא במבנה הסטוריבורד.</p>
<p>Sora 2 חושב כמו תסריטאי. הוא מבין מבנה סצנה, תזמון דיאלוג, ומעברים בין שוטים. כשאתה כותב פרומפט ב-Sora, אתה בעצם כותב תסריט מקוצר — וזה בדיוק הכוח שלו.</p>
<p><strong>חשוב לדעת:</strong> אפליקציית Sora נסגרת באפריל 2026, אבל ה-API זמין עד ספטמבר 2026. אם אתה משתמש ב-Sora, מומלץ לעבוד דרך ה-API או כלים שמשתמשים בו.</p>`,

    whatIs: `<p>Sora 2 הוא מודל יצירת וידאו של OpenAI שנבנה על ארכיטקטורת diffusion transformer. בשונה ממתחרים שמתמקדים בריאליזם פיזיקלי, Sora 2 מתמקד ב<strong>סיפור חזותי</strong> — מבנה סצנה, תזמון פעולות, ודיאלוג מסונכרן.</p>
<p>Sora 2 תומך ב-<strong>Character References</strong> — מאפשר להעלות תמונת ייחוס של דמות ולשמור על עקביות שלה לאורך מספר סרטונים. זה קריטי לסיפורים מרובי סצנות.</p>
<p>משכי סרטון זמינים: 4, 8, 12, 16, או 20 שניות. רזולוציה: 720p ב-sora-2, ו-1080p ב-sora-2-pro.</p>`,

    structure: `<p>המבנה האופטימלי ב-Sora 2 הוא <strong>פורמט סטוריבורד מובנה</strong>:</p>
<ol>
<li><strong>Scene</strong> — תיאור הסצנה: "Interior of a dimly lit jazz club, 1950s New York"</li>
<li><strong>Cinematography</strong> — שוט ומצלמה: "Medium shot from a corner booth, slight handheld movement"</li>
<li><strong>Actions</strong> — פעולות עם timing beats (פעלים מובילים): "A saxophonist RISES from his chair, LIFTS the instrument, BEGINS a slow melodic solo"</li>
<li><strong>Dialogue</strong> — דיאלוג מסונכרן (אופציונלי): "The bartender murmurs: 'He plays like that every Friday night...'"</li>
</ol>
<p>שימו לב ל-<strong>timing beats</strong>: שימוש בפעלים גדולים (RISES, LIFTS, BEGINS) עוזר ל-Sora לתזמן את הפעולות לאורך הסרטון.</p>
<p>טיפ חשוב: הגדר <strong>3-5 עוגני צבע</strong> (color anchors) כדי לשמור על פלטת צבעים עקבית. למשל: "Color palette: warm amber, deep burgundy, smoke gray."</p>`,

    rules: [
      "השתמש במבנה Scene → Cinematography → Actions → Dialogue — הסדר הזה נותן ל-Sora הקשר לפני שהוא מתחיל לייצר.",
      "כתוב timing beats עם פעלים בולטים — 'TURNS', 'REACHES', 'PAUSES'. Sora משתמש בפעלים כנקודות ציון לתזמון האנימציה.",
      "הגדר 3-5 עוגני צבע בסוף הפרומפט — 'palette: midnight blue, warm gold, soft cream'. זה שומר על עקביות צבעונית.",
      "השתמש ב-Character References לעקביות דמויות בין סרטונים — העלה תמונת ייחוס ברורה עם תאורה אחידה.",
      "התאם משך סרטון למורכבות — 4-8 שניות לשוט בודד, 12-20 שניות לסצנה עם מעבר או דיאלוג.",
      "בדיאלוג, כתוב משפטים קצרים וברורים — Sora מסנכרן שפתיים טוב יותר עם משפטים של 5-10 מילים.",
    ],

    params: [
      { name: "Duration", values: "4 / 8 / 12 / 16 / 20 שניות", description: "משכים קבועים — בחר לפי מורכבות הסצנה" },
      { name: "Resolution", values: "720p (sora-2) / 1080p (sora-2-pro)", description: "sora-2-pro לאיכות מקסימלית" },
      { name: "Character Ref", values: "תמונת ייחוס", description: "שמירה על עקביות דמות בין סרטונים" },
    ],

    examples: [
      {
        concept: "סצנת דרמה בבית קפה",
        prompt:
          "Scene: A cozy Parisian café on a rainy afternoon. Warm interior, condensation on windows, vintage espresso machine on the counter.\n\nCinematography: Close-up, slowly pulling back to medium shot. Shallow depth of field.\n\nActions: A woman in her 40s STARES at an unopened letter on the table. She REACHES for it, HESITATES, then PICKS it up with trembling hands. She TEARS open the envelope.\n\nDialogue: She whispers under her breath: \"Finally...\"\n\nColor palette: warm amber, cream white, rain gray, aged paper yellow.",
        explanation:
          "מבנה סטוריבורד מלא עם 4 רכיבים. שימו לב ל-timing beats בפעלים: STARES → REACHES → HESITATES → PICKS → TEARS — כל פועל הוא נקודת ציון בזמן. 5 עוגני צבע שומרים על אחידות.",
      },
      {
        concept: "סצנת מדע בדיוני",
        prompt:
          "Scene: The bridge of a massive spaceship. Holographic star maps floating in the air, crew stations with glowing interfaces.\n\nCinematography: Wide establishing shot, slow orbital camera move around the captain's chair.\n\nActions: The captain STANDS from her chair, WALKS toward the main viewport. She RAISES her hand and the holographic map ZOOMS into a distant planet.\n\nColor palette: deep space blue, hologram cyan, warm bridge amber, alert red accent.",
        explanation:
          "Sora מצוין לסצנות מדע בדיוני עם אלמנטים מוארים. ה-orbital camera move נותן תחושת עומק, והאינטראקציה עם ההולוגרמה (RAISES hand → map ZOOMS) יוצרת סיבתיות ברורה.",
      },
      {
        concept: "סצנת מוזיקה חיה",
        prompt:
          "Scene: Underground jazz club, exposed brick walls, single spotlight on stage, cigarette smoke drifting.\n\nCinematography: Medium shot from audience perspective, subtle handheld sway.\n\nActions: A pianist CLOSES his eyes, TAKES a deep breath, then BEGINS playing. His fingers DANCE across the keys with intensity. The audience LEANS in.\n\nDialogue: A voice from the crowd: \"This is the one they'll remember.\"\n\nColor palette: smoky amber, deep shadow black, spotlight warm white, brick red.",
        explanation:
          "דמויות מרובות עם תיחום ברור — הפסנתרן פעיל, הקהל מגיב. הדיאלוג מהקהל מוסיף שכבה נרטיבית. 'fingers DANCE' הוא ניסוח אקספרסיבי שעוזר ל-Sora ליצור תנועה אמינה.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת פרומפט שטוח בלי מבנה: 'A woman in a café reads a letter and looks surprised'",
        good: "שימוש במבנה Scene → Cinematography → Actions עם timing beats ועוגני צבע",
        why: "Sora 2 נבנה לעבוד עם מבנה סטוריבורד. פרומפט שטוח נותן תוצאה גנרית. המבנה הוא מה שמבדיל 'סרטון AI' מ'סרט קצר'.",
      },
      {
        bad: "דיאלוג ארוך: 'She says: I've been waiting for this moment for so long and now that it's finally here I don't know what to feel'",
        good: "דיאלוג קצר: 'She whispers: Finally...'",
        why: "Sora מסנכרן שפתיים הרבה יותר טוב עם משפטים קצרים (5-10 מילים). משפטים ארוכים גורמים לתנועת שפתיים לא מסונכרנת שנראית מוזרה.",
      },
      {
        bad: "שימוש ב-20 שניות לשוט סטטי פשוט של דמות יושבת",
        good: "4-8 שניות לשוט פשוט, 16-20 שניות לסצנה עם התקדמות דרמטית",
        why: "20 שניות זה הרבה זמן — אם אין מספיק פעולה, Sora ימציא תנועות מיותרות. התאם את המשך למספר ה-timing beats בפרומפט.",
      },
    ],

    personalTip:
      "הטריק הכי חזק שלי ב-Sora: אני כותב את הפרומפט כאילו אני כותב רשימת שוטים לצלם בפלייט. כל פועל גדול (CAPS) הוא 'action beat' שאני מצפה שיקרה בנקודה מסוימת בזמן. ב-12 שניות, אני שם 3-4 beats. ב-20 שניות, 5-6. השיטה הזו נותנת לי שליטה מפתיעה בתזמון.",

    faq: [
      {
        question: "האם Sora עדיין זמין לשימוש?",
        answer:
          "אפליקציית Sora הייעודית נסגרת באפריל 2026, אבל ה-API נשאר פעיל עד ספטמבר 2026. אם אתה רוצה להמשיך להשתמש ב-Sora, עבוד דרך ה-API ישירות או דרך כלים שמשתמשים בו (כמו Peroot). מומלץ גם להכיר את Runway ו-Kling כחלופות מצוינות.",
      },
      {
        question: "איך Character References עובד?",
        answer:
          "מעלים תמונת ייחוס של דמות (רצוי עם תאורה אחידה ורקע נקי), ו-Sora שומר על מאפייני הדמות — מבנה פנים, שיער, גוון עור — לאורך סרטונים שונים. זה מאפשר ליצור סיפור עם דמות עקבית. הטיפ: העלו תמונה חדה, חזיתית, עם תאורה טבעית.",
      },
      {
        question: "מה ההבדל בין sora-2 ל-sora-2-pro?",
        answer:
          "sora-2 מייצר ב-720p והוא מהיר יותר — מתאים לאיטרציות ולבדיקת כיוונים. sora-2-pro מייצר ב-1080p עם איכות גבוהה יותר, פרטים חדים יותר, ותנועה חלקה יותר. השתמשו ב-sora-2 לניסיונות ו-sora-2-pro לתוצאה הסופית.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 4. Google Veo 3.1
   * ────────────────────────────────────────────── */
  {
    slug: "veo",
    title: "מדריך פרומפטים ל-Google Veo 3.1 — וידאו עם אודיו מקורי",
    metaTitle: "מדריך פרומפטים ל-Veo 3.1 — אודיו מקורי, SFX ודיאלוג | Peroot",
    metaDescription:
      "למד ליצור סרטונים עם Google Veo 3.1 — הפלטפורמה היחידה עם אודיו מקורי. מדריך למבנה 7 רכיבים, Audio block עם דיאלוג/SFX/אמביינט/מוזיקה",
    platform: "Google Veo 3.1",
    category: "video",
    color: "#22c55e",
    icon: "🎵",
    readTime: "8 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["kling", "runway", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, הבעיה הכי גדולה הייתה השקט. כל סרטון יצא ללא קול, ואז הייתי צריך לחפש SFX בנפרד, להוסיף מוזיקה בעריכה, ולנסות לסנכרן הכל. Veo 3.1 של Google שינה את הכל.</p>
<p>Veo 3.1 הוא <strong>הפלטפורמה היחידה שמייצרת אודיו מקורי</strong> כחלק אינטגרלי מהסרטון. דיאלוג, אפקטים קוליים, אמביינט ומוזיקה — הכל נוצר ביחד, מסונכרן בצורה מושלמת. אבל — ויש פה 'אבל' גדול — אם לא תכתוב הנחיות אודיו, Veo ימציא צלילים משלו. ולפעמים הוא ממציא דברים מוזרים, כמו צחוק של קהל סטודיו שלא ביקשת.</p>`,

    whatIs: `<p>Google Veo 3.1 הוא מודל יצירת וידאו מבית Google DeepMind שמייצר סרטונים <strong>עם אודיו מקורי מובנה</strong>. זהו ההבדל העיקרי שלו מכל מתחרה — הסרטון נולד עם סאונד.</p>
<p>הפלטפורמה תומכת ב-<strong>Ingredients to Video</strong> — אפשר להעלות עד 4 תמונות ייחוס שמשמשות כ"מרכיבים" לסצנה. למשל, תמונה של דמות + תמונה של מיקום + תמונה של פריט = סצנה שלמה.</p>
<p><strong>משכי סרטון:</strong> 4, 6, או 8 שניות. <strong>רזולוציה:</strong> 1080p או 4K.</p>
<p><strong>אזהרה קריטית:</strong> אם לא תכלול סקשן Audio בפרומפט, Veo יזהל (hallucinate) צלילים מעצמו — הבעיה הנפוצה ביותר היא הוספת צחוק של "קהל סטודיו חי" שלא ביקשת. תמיד כתוב מה אתה <em>רוצה</em> לשמוע.</p>`,

    structure: `<p>המבנה האופטימלי ב-Veo מורכב מ-<strong>7 רכיבים</strong>, כולל סקשן אודיו חובה:</p>
<ol>
<li><strong>Shot type</strong> — "Wide establishing shot" / "Close-up" / "Medium two-shot"</li>
<li><strong>Subject</strong> — מי בסצנה: "A street musician in her 20s with a violin"</li>
<li><strong>Action</strong> — מה קורה: "She begins playing a melancholic melody, eyes closed, swaying gently"</li>
<li><strong>Environment</strong> — סביבה: "Cobblestone street corner in Prague, evening, old buildings in warm light"</li>
<li><strong>Camera motion</strong> — תנועת מצלמה: "Slow dolly in from wide to medium shot"</li>
<li><strong>Visual style</strong> — אסתטיקה: "Golden hour warmth, shallow depth of field, anamorphic lens flare"</li>
<li><strong>Audio</strong> (חובה!) — בארבעה משפטים נפרדים:
  <ul>
    <li><em>Dialogue:</em> מה נאמר (אם יש דיאלוג)</li>
    <li><em>SFX:</em> אפקטים קוליים — "sound of violin strings, bow on strings"</li>
    <li><em>Ambient:</em> אמביינט — "distant city sounds, occasional footsteps on cobblestone"</li>
    <li><em>Music:</em> מוזיקה — "no background music, only live violin performance"</li>
  </ul>
</li>
</ol>
<p><strong>חשוב:</strong> כל אחד מ-4 רכיבי האודיו צריך להיות במשפט נפרד. Veo מפרסר את זה טוב יותר כשכל ערוץ מופרד.</p>`,

    rules: [
      "תמיד כלול סקשן Audio בפרומפט — בלי הנחיות אודיו, Veo ממציא צלילים לא רצויים. הבעיה הנפוצה: 'צחוק קהל סטודיו' שמופיע מאין ומאיין.",
      "הפרד את 4 ערוצי האודיו למשפטים נפרדים — Dialogue, SFX, Ambient, Music. כל אחד בשורה משלו.",
      "אם אין דיאלוג, כתוב את זה במפורש — 'No dialogue in this scene.' אחרת Veo עלול להוסיף דיבור מומצא.",
      "אם אין מוזיקה, כתוב 'No background music.' — בלי זה, Veo ייצור מוזיקת רקע שלא ביקשת.",
      "השתמש ב-Ingredients to Video להעלאת עד 4 תמונות ייחוס — דמות, מיקום, פריט, טקסטורה. זה משפר דרמטית את העקביות.",
      "הגבל משך ל-4-6 שניות לסצנות עם דיאלוג — 8 שניות עם דיבור נוטה לגרום לדה-סינכרון של שפתיים.",
    ],

    params: [
      { name: "Duration", values: "4 / 6 / 8 שניות", description: "4-6 שניות לדיאלוג, 8 שניות לסצנות ויזואליות" },
      { name: "Resolution", values: "1080p / 4K", description: "1080p לעבודה יומיומית, 4K לתוצאה סופית" },
      { name: "Ingredients", values: "עד 4 תמונות ייחוס", description: "Ingredients to Video — תמונות שמנחות את הסצנה" },
    ],

    examples: [
      {
        concept: "סצנת נוף עם אמביינט",
        prompt:
          "Wide establishing shot. A tranquil mountain lake at dawn, mist hovering above the water surface, pine trees framing the scene. A lone canoe rests at a wooden dock. Static camera. Soft pastel light, cool blue and warm pink tones, landscape photography style, 4K.\n\nAudio — Dialogue: No dialogue. SFX: Gentle water lapping against the dock, a distant bird call. Ambient: Morning forest atmosphere, faint wind through pine needles. Music: No background music, natural sounds only.",
        explanation:
          "כל 4 ערוצי אודיו מוגדרים במפורש. 'No dialogue' ו-'No background music' מונעים מ-Veo להמציא. SFX ו-Ambient יוצרים שכבת סאונד טבעית ואותנטית.",
      },
      {
        concept: "סצנת דיאלוג במטבח",
        prompt:
          "Medium two-shot. A father and daughter cooking together in a bright kitchen. The father stirs a pot while the daughter chops vegetables on a wooden board. Natural window light, warm and inviting. Slow push in. Lifestyle commercial aesthetic, warm color grade.\n\nAudio — Dialogue: Father says: \"Add a little more salt.\" Daughter laughs and says: \"You always say that!\" SFX: Chopping sounds on cutting board, bubbling pot, stirring spoon. Ambient: Quiet kitchen hum, distant birdsong from open window. Music: No background music.",
        explanation:
          "דיאלוג קצר וטבעי (שני משפטים קצרים). SFX מפורט — חיתוך, בישול, ערבוב. Ambient עדין שנותן תחושת בית. 'No background music' שומר על אותנטיות.",
      },
      {
        concept: "סצנת רחוב עם מוזיקה",
        prompt:
          "Medium shot, handheld camera style. A street drummer performing on a busy sidewalk, crowd gathered in a semicircle. The drummer is energetic, sticks flying. Golden hour, urban energy, documentary film style, slight grain.\n\nAudio — Dialogue: No dialogue. SFX: Sharp drum hits, cymbal crashes, sticks clicking on drum rims. Ambient: City street noise, crowd murmurs, occasional car honking in the distance. Music: Rhythmic drum solo, energetic and percussive, street performance style.",
        explanation:
          "כאן ה-Music הוא חלק מהסצנה עצמה (הנגן מתופף). SFX מתאר את הצלילים הספציפיים של התיפוף. Ambient מוסיף שכבת עיר. שימו לב שאין דיאלוג — מצוין במפורש.",
      },
      {
        concept: "סצנת מוצר עם SFX",
        prompt:
          "Extreme close-up, slow motion. A glass perfume bottle being placed on a marble surface, golden liquid catching the light. Camera slowly orbits the bottle. Single studio spotlight creating dramatic shadows, luxury commercial aesthetic, black and gold palette.\n\nAudio — Dialogue: No dialogue. SFX: Glass touching marble with a soft clink, liquid gently sloshing inside the bottle. Ambient: Complete silence except for SFX. Music: Soft ambient synthesizer pad, luxurious and minimal, fading in slowly.",
        explanation:
          "סצנת מוצר שבה כל SFX מוסיף תחושת luxury — הצלצול העדין של זכוכית על שיש, הנוזל בתוך הבקבוק. המוזיקה מינימלית ותומכת בתחושת היוקרה.",
      },
    ],

    mistakes: [
      {
        bad: "לא לכלול סקשן Audio בפרומפט בכלל — לסמוך על Veo שיבחר צלילים מתאימים",
        good: "תמיד לכלול Audio עם 4 ערוצים נפרדים, גם אם חלקם 'No dialogue' או 'No music'",
        why: "ללא הנחיות אודיו, Veo מזהל (hallucinate) צלילים לא קשורים. הבעיה הנפוצה ביותר: צחוק של 'live studio audience' שמופיע בסצנות שקטות. תמיד תן הנחיות מפורשות.",
      },
      {
        bad: "כתיבת Audio בלוק אחד: 'Audio: birds, wind, some music, a person talking'",
        good: "הפרדה ל-4 ערוצים: Dialogue: ... SFX: ... Ambient: ... Music: ...",
        why: "Veo מפרסר אודיו לפי ערוצים. כשהכל מעורבב במשפט אחד, התוצאה עמומה. ערוצים נפרדים נותנים שליטה מדויקת — כמו מיקסר שמע.",
      },
      {
        bad: "בקשת דיאלוג ארוך ב-8 שניות: 'She delivers a 30-second monologue about her childhood'",
        good: "דיאלוג קצר: 'She says quietly: I remember this place.' ב-4-6 שניות",
        why: "ב-4-8 שניות יש מקום ל-1-2 משפטים קצרים. דיאלוג ארוך גורם לדה-סינכרון שפתיים ולתנועות פה לא טבעיות. פחות = יותר.",
      },
    ],

    personalTip:
      "הטריק שלי ב-Veo: אני תמיד כותב את ה-Audio block לפני שאני מסיים את החלק הויזואלי. למה? כי הסאונד משפיע על הסיפור. כשאני מחליט שצריך 'distant thunder' באמביינט, זה גורם לי להוסיף 'dark clouds gathering' בויז'ואל. הסאונד מנחה את הסצנה — לא רק מלווה אותה.",

    faq: [
      {
        question: "למה Veo מוסיף צחוק של קהל שלא ביקשתי?",
        answer:
          "זו הבעיה הנפוצה ביותר ב-Veo. כשאין הנחיות Audio מפורשות, המודל מזהל (hallucinate) צלילים. 'Live studio audience laughter' הוא פרט תדיר מנתוני אימון. הפתרון: תמיד כלול Audio block מפורש עם כל 4 הערוצים, גם אם חלקם 'None' או 'Silence'.",
      },
      {
        question: "מה זה Ingredients to Video?",
        answer:
          "Ingredients to Video מאפשר להעלות עד 4 תמונות ייחוס שמשמשות כ'מרכיבים' לסצנה. למשל: תמונה 1 = דמות, תמונה 2 = מיקום, תמונה 3 = חפץ, תמונה 4 = טקסטורה/סגנון. Veo מרכיב את הכל לסרטון אחד מלוכד. זה הרבה יותר מדויק מלתאר הכל במילים.",
      },
      {
        question: "Veo או Kling לסרטונים עם אודיו?",
        answer:
          "Veo הוא הבחירה הברורה אם אודיו הוא קריטי — הוא הפלטפורמה היחידה עם מנוע אודיו מקורי שמייצר דיאלוג, SFX, אמביינט ומוזיקה. Kling 3.0 מוסיף אודיו בסיסי אבל הוא פחות מדויק ולא תומך בדיאלוג מסונכרן. לסרטונים שקטים או שהאודיו פחות חשוב, Kling מנצח בפיזיקה.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 5. Minimax Hailuo 2.3
   * ────────────────────────────────────────────── */
  {
    slug: "minimax",
    title: "מדריך פרומפטים ל-Minimax Hailuo 2.3 — הבעות פנים ותנועת גוף",
    metaTitle:
      "מדריך פרומפטים ל-Minimax Hailuo 2.3 — כוריאוגרפיה, [מצלמה] וטיפים | Peroot",
    metaDescription:
      "למד ליצור סרטונים עם Minimax Hailuo 2.3 — סינטקס [מצלמה] ייחודי, תנועות גוף מדויקות, הבעות פנים ומיקרו-אקספרשנס",
    platform: "Minimax Hailuo 2.3",
    category: "video",
    color: "#f59e0b",
    icon: "💃",
    readTime: "7 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["kling", "veo", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, הבעיה הכי מתסכלת הייתה הבעות פנים. כל הפלטפורמות ייצרו פנים 'קפואות' או חיוכים גנריים. אז גיליתי את Minimax Hailuo 2.3 — והכל השתנה.</p>
<p>Minimax מתמחה במה שקשה הכי הרבה ל-AI: תנועות גוף אנושיות ו-micro-expressions. כשאתה כותב "she furrows her brow slightly before breaking into a reluctant smile" — Minimax מייצר בדיוק את הניואנס הזה. הקמטוט הקל, ההיסוס, ואז החיוך. זה ברמה שפלטפורמות אחרות פשוט לא מסוגלות.</p>
<p>בנוסף, ל-Minimax יש <strong>סינטקס [סוגריים מרובעים]</strong> ייחודי לתנועת מצלמה — שונה לחלוטין מכל פלטפורמה אחרת.</p>`,

    whatIs: `<p>Minimax Hailuo 2.3 הוא מודל יצירת וידאו מבית MiniMax שמתמחה בתנועות גוף אנושיות, הבעות פנים, ומיקרו-אקספרשנס. הפלטפורמה נחשבת למובילה ביצירת סצנות שדורשות ניואנס רגשי.</p>
<p>התכונה הייחודית ביותר היא <strong>סינטקס הסוגריים המרובעים [brackets]</strong> לתנועת מצלמה. במקום לכתוב "camera pans left" בטקסט חופשי, כותבים <code>[Pan left]</code> — וזה נותן ל-Minimax הנחיה מדויקת.</p>
<p><strong>תנועות מצלמה זמינות:</strong> [Truck left/right], [Pan left/right], [Push in/Pull out], [Pedestal up/down], [Tilt up/down], [Zoom in/out], [Shake], [Tracking shot], [Static shot]. אפשר לשלב עד 3 תנועות.</p>
<p><strong>משכי סרטון:</strong> 6 שניות ב-1080p, או 10 שניות ב-768p בלבד.</p>`,

    structure: `<p>המבנה האופטימלי ב-Minimax מתמקד <strong>בתנועת גוף והבעות פנים</strong>:</p>
<ol>
<li><strong>[Camera]</strong> — סינטקס מצלמה בסוגריים: "[Push in], [Tilt down slightly]"</li>
<li><strong>Subject description</strong> — תיאור מפורט של הדמות: "A ballerina in her 20s, dark hair in a tight bun, wearing a white practice leotard"</li>
<li><strong>Body movement</strong> — תנועת גוף כוריאוגרפית: "She rises onto pointe, arms lifting in a port de bras, fingers extending gracefully"</li>
<li><strong>Facial expression</strong> — הבעת פנים + מיקרו-אקספרשנס: "Her expression shifts from focused concentration to a fleeting moment of joy, eyes brightening, the corners of her mouth lifting subtly"</li>
<li><strong>Environment + Style</strong> — "Empty dance studio, wooden floor, large mirrors, soft natural light from tall windows. Intimate documentary style."</li>
</ol>
<p><strong>כלל הזהב:</strong> ככל שתתאר יותר ניואנסים רגשיים בהבעות הפנים, התוצאה תהיה מרשימה יותר. Minimax הוא הפלטפורמה שמשתלם בה הכי הרבה לכתוב פרטי הבעה.</p>`,

    rules: [
      "השתמש בסינטקס [סוגריים] למצלמה — [Push in], [Pan left], [Tracking shot]. זה סינטקס ייחודי ל-Minimax שנותן שליטה מדויקת.",
      "שלב עד 3 תנועות מצלמה — '[Push in], [Pan left], [Tilt up]'. יותר מ-3 גורם לתנועות סותרות.",
      "תאר micro-expressions במפורט — 'a slight furrowing of the brow', 'the corner of her lip twitches', 'eyes narrow almost imperceptibly'. זה מה ש-Minimax עושה הכי טוב.",
      "כתוב כוריאוגרפיה של תנועת גוף — במקום 'she dances', כתוב 'she extends her right arm overhead, pivots on her left foot, and sweeps into a low arabesque'. פרטים כוריאוגרפיים = תנועה מדויקת.",
      "ב-1080p מוגבל ל-6 שניות, ב-768p מקבל 10 שניות — בחר רזולוציה לפי צורך: 1080p לקלוזאפים, 768p לסצנות ארוכות.",
      "תן עדיפות לדמות אחת בפריים — Minimax מצטיין בניואנסים של דמות בודדת. שתי דמויות ומעלה מפחיתות את רמת הפרטים.",
    ],

    params: [
      { name: "Duration", values: "6s (1080p) / 10s (768p)", description: "6 שניות באיכות מלאה, 10 שניות ברזולוציה מופחתת" },
      { name: "Resolution", values: "1080p / 768p", description: "1080p ל-6 שניות בלבד, 768p לעד 10 שניות" },
      { name: "[Camera]", values: "סינטקס סוגריים", description: "עד 3 תנועות מצלמה בסוגריים מרובעים" },
    ],

    examples: [
      {
        concept: "הבעת פנים מורכבת",
        prompt:
          "[Push in slowly], [Static shot]. Close-up of a woman in her 30s receiving unexpected news on her phone. Her expression transitions through surprise — eyebrows shooting up, mouth falling slightly open — then processing — eyes darting side to side, a deep breath — then a slow dawning smile, eyes welling with tears of joy. She presses her hand to her mouth. Indoor, soft side lighting, shallow depth of field. Intimate documentary feel.",
        explanation:
          "שלושה שלבי רגש מתוארים בפירוט: surprise → processing → joy. כל שלב כולל micro-expressions ספציפיות. [Push in slowly] מתקרב לפנים תוך כדי המעבר הרגשי.",
      },
      {
        concept: "כוריאוגרפיה של תנועת גוף",
        prompt:
          "[Tracking shot], [Tilt up]. A contemporary dancer in black performs in an empty warehouse. She DROPS to her knees, slides forward with momentum, then SPIRALS upward — one arm reaching to the ceiling, the other trailing behind. Her fingers splay wide, chest lifting, head tilting back. Concrete floor, industrial windows casting dramatic side light. Raw and emotional, high contrast, desaturated tones.",
        explanation:
          "כוריאוגרפיה מפורטת: DROPS → slides → SPIRALS. כל חלק בגוף מתואר — זרועות, אצבעות, חזה, ראש. [Tracking shot] עוקב אחרי התנועה, [Tilt up] עולה עם הספירלה.",
      },
      {
        concept: "מיקרו-אקספרשנס בשיחה",
        prompt:
          "[Static shot]. Medium close-up of an elderly man sitting across a table, listening. His expression is composed but his eyes reveal everything — a slight narrowing when he disagrees, a tiny nod almost to himself, the ghost of a smile when he remembers something. His weathered hands rest on the table, fingers occasionally tapping once. Warm kitchen lighting, steam from a tea cup drifting up. Nostalgic, warm tones, shallow depth of field.",
        explanation:
          "סצנה 'שקטה' שמלאה בניואנסים: 'slight narrowing', 'tiny nod', 'ghost of a smile', 'fingers occasionally tapping'. Minimax הופך את הניואנסים האלה לאנימציה מאוד אנושית.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת תנועת מצלמה בטקסט חופשי: 'the camera moves to the left and zooms in'",
        good: "שימוש בסינטקס סוגריים: '[Pan left], [Zoom in]'",
        why: "Minimax מפרסר את הסוגריים המרובעים כפקודות מצלמה ישירות. טקסט חופשי מתורגם פחות מדויק ולפעמים מתעלם לחלוטין מהבקשה.",
      },
      {
        bad: "שימוש ב-5 תנועות מצלמה: '[Push in], [Pan left], [Tilt up], [Shake], [Zoom out]'",
        good: "2-3 תנועות מקסימום: '[Push in], [Pan left]'",
        why: "יותר מ-3 תנועות בו-זמנית גורם לתנועות סותרות — המצלמה 'מבולבלת'. בחר 2-3 תנועות שמשלימות אחת את השנייה.",
      },
      {
        bad: "תיאור כללי של רגש: 'she looks happy' או 'he seems sad'",
        good: "תיאור micro-expressions: 'her eyes crinkle at the corners, a dimple forms on her left cheek, her shoulders drop with relief'",
        why: "Minimax בנוי לפרטי הבעה. 'looks happy' נותן חיוך גנרי. micro-expressions נותנים תוצאה שנראית אנושית ומורכבת — וזה היתרון הגדול של Minimax.",
      },
    ],

    personalTip:
      "הטריק שלי ב-Minimax: אני מדמיין שאני במאי שנותן הנחיות לשחקן. במקום 'she is sad', אני כותב את מה שהייתי אומר לשחקנית: 'Take a breath. Let your eyes drop to the floor. Now slowly look up — but don't smile yet. Let the emotion build in your eyes before it reaches your mouth.' Minimax מתרגם הנחיות שחקנות לאנימציה ברמה מדהימה.",

    faq: [
      {
        question: "מה ההבדל בין [Push in] ל-[Zoom in]?",
        answer:
          "[Push in] הוא dolly — המצלמה עצמה נעה קדימה, מה שמשנה את הפרספקטיבה (אובייקטים ברקע משתנים). [Zoom in] משנה רק את אורך המוקד, כמו להשתמש בזום אופטי — המצלמה נשארת במקום. Push in נותן תחושה קולנועית יותר, Zoom in נותן תחושת תיעודי. לרוב, [Push in] עדיף לקלוזאפים רגשיים.",
      },
      {
        question: "למה ברזולוציה 768p אני מקבל 10 שניות וב-1080p רק 6?",
        answer:
          "זו מגבלה טכנית של Minimax — ככל שהרזולוציה גבוהה יותר, נדרשת יותר חישוב לכל פריים, מה שמגביל את המשך. הטיפ: אם אתה צריך סרטון ארוך יותר ב-1080p, חלק אותו ל-2 קליפים של 6 שניות וערוך יחד.",
      },
      {
        question: "Minimax או Kling לתנועת גוף?",
        answer:
          "תלוי בסוג התנועה. Minimax עדיף להבעות פנים, ריקוד, ותנועות עדינות — כל מה שדורש ניואנס רגשי. Kling עדיף לתנועות פיזיקליות — אינטראקציה עם חפצים, ספורט, פיזיקה של חומרים. אם הסצנה היא אדם רוקד ברגש — Minimax. אם הסצנה היא אדם קופץ מגובה ונופל במים — Kling.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 6. מדריך כללי — סרטונים
   * ────────────────────────────────────────────── */
  {
    slug: "video-prompts",
    title: "מדריך כללי ליצירת סרטונים עם AI — כל מה שצריך לדעת",
    metaTitle:
      "מדריך יצירת סרטוני AI — ארכיטקטורת 7 שכבות, השוואה וטיפים | Peroot",
    metaDescription:
      "המדריך המלא ליצירת סרטוני AI — ארכיטקטורת 7 שכבות הפרומפט, השוואה בין Runway, Kling, Sora, Veo ו-Minimax, וטיפים אוניברסליים",
    platform: "כל הפלטפורמות",
    category: "video",
    color: "#64748b",
    icon: "🎥",
    readTime: "10 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["runway", "kling", "veo", "image-prompts"],

    intro: `<p>כשהתחלתי ליצור סרטונים עם AI, חשבתי שזה כמו יצירת תמונות — רק עם תנועה. טעיתי לגמרי. וידאו AI הוא עולם שלם בפני עצמו, עם כללים משלו, ארכיטקטורה משלו, ומלכודות ייחודיות.</p>
<p>אחרי מאות סרטונים בכל הפלטפורמות המובילות — Runway, Kling, Sora, Veo ו-Minimax — בניתי מתודולוגיה שעובדת בכל מקום. במדריך הזה אני חולק את ארכיטקטורת 7 השכבות האוניברסלית, השוואה מפורטת בין כל הפלטפורמות, וטיפים שחוסכים שעות של ניסוי וטעייה.</p>`,

    whatIs: `<p>יצירת סרטונים עם AI היא תהליך שבו מודלי Generative AI ממירים טקסט (ולפעמים תמונות ייחוס) לקליפ וידאו. בשונה מתמונות, כאן צריך לחשוב על <strong>זמן, תנועה, מצלמה, פיזיקה, ואודיו</strong> — כל אלמנט מוסיף שכבת מורכבות.</p>
<p>בשנת 2026, 5 פלטפורמות מובילות את השוק, כל אחת עם חוזקות שונות:</p>
<ul>
<li><strong>Runway Gen-4</strong> — שליטה בתנועת מצלמה (Director Mode)</li>
<li><strong>Kling 3.0</strong> — פיזיקה מדויקת ותנועה ריאליסטית</li>
<li><strong>Sora 2</strong> — סטוריבורד קולנועי ודיאלוג</li>
<li><strong>Veo 3.1</strong> — אודיו מקורי (הפלטפורמה היחידה)</li>
<li><strong>Minimax Hailuo 2.3</strong> — הבעות פנים ותנועת גוף</li>
</ul>`,

    structure: `<p>ארכיטקטורת <strong>7 השכבות האוניברסלית</strong> — המבנה שעובד בכל פלטפורמה:</p>
<ol>
<li><strong>Shot Type</strong> — סוג השוט: close-up, medium, wide, extreme close-up, establishing shot</li>
<li><strong>Subject</strong> — הנושא המרכזי: מי או מה נמצא בפריים, עם תיאור מפורט</li>
<li><strong>Action / Motion</strong> — מה קורה: פעולות, תנועות, אינטראקציות</li>
<li><strong>Camera Movement</strong> — תנועת מצלמה: pan, tilt, dolly, tracking, crane, orbital, static</li>
<li><strong>Environment</strong> — סביבה ומיקום: interior/exterior, זמן ביום, מזג אוויר, פרטי רקע</li>
<li><strong>Visual Style</strong> — סגנון ואסתטיקה: תאורה, צבעים, עומק שדה, film grain, אסתטיקה כללית</li>
<li><strong>Audio</strong> (כשרלוונטי) — סאונד: דיאלוג, SFX, אמביינט, מוזיקה</li>
</ol>
<p>לא כל שכבה חייבת להופיע בכל פרומפט — אבל ככל שתכלול יותר שכבות, התוצאה תהיה מדויקת ומקצועית יותר.</p>

<h3>טבלת השוואה בין הפלטפורמות</h3>
<table style="width:100%; border-collapse:collapse; font-size:14px;">
<thead>
<tr style="border-bottom:2px solid currentColor;">
<th style="text-align:right; padding:8px;">תכונה</th>
<th style="text-align:center; padding:8px;">Runway Gen-4</th>
<th style="text-align:center; padding:8px;">Kling 3.0</th>
<th style="text-align:center; padding:8px;">Sora 2</th>
<th style="text-align:center; padding:8px;">Veo 3.1</th>
<th style="text-align:center; padding:8px;">Minimax 2.3</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">משך מקסימלי</td>
<td style="text-align:center; padding:8px;">10s</td>
<td style="text-align:center; padding:8px;">15s</td>
<td style="text-align:center; padding:8px;">20s</td>
<td style="text-align:center; padding:8px;">8s</td>
<td style="text-align:center; padding:8px;">10s</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">רזולוציה מקסימלית</td>
<td style="text-align:center; padding:8px;">1080p</td>
<td style="text-align:center; padding:8px;">4K</td>
<td style="text-align:center; padding:8px;">1080p</td>
<td style="text-align:center; padding:8px;">4K</td>
<td style="text-align:center; padding:8px;">1080p</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">אודיו מקורי</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">בסיסי</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">מלא</td>
<td style="text-align:center; padding:8px;">-</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">Negative prompt</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">נתמך</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">-</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">תנועת מצלמה</td>
<td style="text-align:center; padding:8px;">Director Mode</td>
<td style="text-align:center; padding:8px;">טקסט</td>
<td style="text-align:center; padding:8px;">טקסט</td>
<td style="text-align:center; padding:8px;">טקסט</td>
<td style="text-align:center; padding:8px;">[סוגריים]</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">חוזקה מרכזית</td>
<td style="text-align:center; padding:8px;">שליטת מצלמה</td>
<td style="text-align:center; padding:8px;">פיזיקה</td>
<td style="text-align:center; padding:8px;">סטוריבורד</td>
<td style="text-align:center; padding:8px;">אודיו</td>
<td style="text-align:center; padding:8px;">הבעות פנים</td>
</tr>
<tr>
<td style="padding:8px; font-weight:bold;">תמונת ייחוס</td>
<td style="text-align:center; padding:8px;">Image-to-Video</td>
<td style="text-align:center; padding:8px;">Image + Motion Brush</td>
<td style="text-align:center; padding:8px;">Character Refs</td>
<td style="text-align:center; padding:8px;">עד 4 Ingredients</td>
<td style="text-align:center; padding:8px;">Image-to-Video</td>
</tr>
</tbody>
</table>`,

    rules: [
      "תמיד התחל עם סוג השוט — זו האינפורמציה הראשונה שכל מודל וידאו צריך. Close-up, medium, wide — זה קובע את כל הקומפוזיציה.",
      "מקד כל סרטון בפעולה אחת מרכזית — ב-5-10 שניות אין מקום ל-5 אירועים. פעולה אחת ברורה עם ניואנסים עדיפה על 5 פעולות שטחיות.",
      "תאר תנועת מצלמה במונחים מקצועיים — pan, tilt, dolly, tracking, crane, orbital. מונחים קולנועיים מתורגמים טוב יותר מתיאורים כלליים.",
      "כלול שכבת סגנון ואסתטיקה — 'cinematic', 'documentary', 'commercial'. ללא סגנון, כל מודל בוחר ברירת מחדל שלו שנראית גנרית.",
      "התאם את הפרומפט לפלטפורמה — Runway רוצה ניסוח חיובי בלבד, Kling אוהב פיזיקה, Sora רוצה סטוריבורד, Veo חייב Audio block, ו-Minimax משתמש ב-[סוגריים].",
      "משך סרטון צריך להתאים למורכבות — שוט סטטי ב-4-5 שניות, סצנה עם תנועה ב-8-10, סיפור עם מעבר ב-15-20 שניות.",
    ],

    params: [],

    examples: [
      {
        concept: "שוט מוצר אוניברסלי (עובד בכל פלטפורמה)",
        prompt:
          "Extreme close-up, slow orbit around product. A luxury watch resting on dark slate stone. Light catching the sapphire crystal face, reflections moving as camera orbits. Single dramatic side light, deep shadows. Black background, minimal. Product commercial aesthetic, 4K sharp, shallow depth of field.",
        explanation:
          "7 שכבות בפעולה: Shot (extreme close-up) → Subject (watch) → Action (light catching crystal) → Camera (slow orbit) → Environment (dark slate) → Style (commercial, 4K). ללא Audio כי זה שוט מוצר שקט. עובד בכל פלטפורמה.",
      },
      {
        concept: "סצנת טבע עם אמביינט (מותאם ל-Veo)",
        prompt:
          "Wide establishing shot, static camera. A thunderstorm approaching over golden wheat fields. Dark clouds rolling in from the horizon, lightning flickering in the distance. Wind bending the wheat in waves. Dramatic landscape photography, high dynamic range, deep golden and storm gray palette.\n\nAudio — Dialogue: None. SFX: Distant thunder rumbles, wheat stalks rustling. Ambient: Strong wind, building intensity. Music: No music, nature sounds only.",
        explanation:
          "סצנת טבע שמנצלת את ייחודיות Veo — האודיו הופך שוט טבע טוב לחוויה סנסורית מלאה. הרעמים הרחוקים והרוח יוצרים אווירה שאי אפשר להשיג בפלטפורמות אחרות.",
      },
      {
        concept: "סצנת דמות עם רגש (מותאם ל-Minimax)",
        prompt:
          "[Push in slowly]. Close-up of a young man receiving exam results on his laptop screen. His face transitions from anxious anticipation — biting his lower lip, eyes scanning rapidly — to overwhelming relief — his shoulders drop, he exhales deeply, eyes closing, then opening with a wide genuine smile. His hand comes up to cover his mouth. Room with desk lamp creating warm side light. Authentic and emotional.",
        explanation:
          "סצנה שמנצלת את החוזקה של Minimax — מעבר רגשי מורכב עם micro-expressions מפורטות. [Push in slowly] מתקרב לפנים בדיוק ברגע שהרגש מתגלה.",
      },
    ],

    mistakes: [
      {
        bad: "שימוש באותו פרומפט בכל הפלטפורמות — copy-paste ללא התאמה",
        good: "התאמה לפלטפורמה: הוספת [סוגריים] ל-Minimax, Audio block ל-Veo, negative prompt ל-Kling, ניסוח חיובי ל-Runway",
        why: "כל פלטפורמה מפרסרת פרומפטים אחרת. פרומפט גנרי עובד 'בסדר' בכולן אבל לא מנצל אף חוזקה. התאמה ספציפית נותנת תוצאה טובה פי 3.",
      },
      {
        bad: "תיאור ארוע שלם ב-5 שניות: 'A car race starts, crashes happen, a winner crosses the finish line'",
        good: "מיקוד ברגע אחד: 'Close-up of a race car wheel spinning, gravel flying, camera tracking the tire at ground level'",
        why: "5 שניות = רגע אחד. תחשוב על שוט בסרט — לא על סיפור שלם. בחר את הרגע הכי ויזואלי ותן לו את כל תשומת הלב.",
      },
      {
        bad: "לא לציין תנועת מצלמה — לסמוך על ברירת מחדל של הפלטפורמה",
        good: "תמיד לבחור במפורש — 'static camera' או 'slow dolly in' או '[Tracking shot]'",
        why: "ללא הנחיית מצלמה, כל מודל בוחר תנועה אקראית — ולפעמים זה תנועה מוזרה שהורסת את הסצנה. גם 'static camera' היא בחירה מכוונת שכדאי לכתוב.",
      },
    ],

    personalTip:
      "הטיפ הכי חשוב שלי אחרי מאות סרטונים: תחשוב על AI Video כמו על צילום סטילס עם מימד זמן. כל פרומפט טוב מתחיל בשאלה: 'מה הפריים הראשון שאני רוצה לראות?' ואז: 'מה משתנה ב-5-10 השניות הבאות?' אם אתה יודע את הפריים הראשון ואת השינוי — יש לך את הפרומפט.",

    faq: [
      {
        question: "איזו פלטפורמה הכי טובה למתחילים?",
        answer:
          "Runway Gen-4 עם Gen-4 Turbo. הממשק הכי אינטואיטיבי, תוצאות מהירות, ואין צורך בפרומפטים שליליים או סינטקס מיוחד. התחל עם 5 שניות, פרומפט פשוט, ותראה תוצאה תוך שניות. כשתרגיש בנוח, תנסה Director Mode.",
      },
      {
        question: "איזו פלטפורמה לבחור לפי סוג הסרטון?",
        answer:
          "סרטון מוצר → Runway (שליטת מצלמה). סצנה פיזיקלית (ספורט, נוזלים) → Kling (פיזיקה). סיפור עם דיאלוג → Sora (סטוריבורד). סרטון עם סאונד חשוב → Veo (אודיו מקורי). סצנה רגשית עם דמות → Minimax (הבעות פנים).",
      },
      {
        question: "האם אפשר לחבר סרטונים מפלטפורמות שונות?",
        answer:
          "כן, וזה בעצם הגישה המקצועית. למשל: צלם שוט רחב ב-Runway, קלוזאפ רגשי ב-Minimax, וסצנה עם סאונד ב-Veo — ואז ערוך הכל ביחד. כל פלטפורמה מצטיינת במשהו אחר. הטריק: שמור על עקביות צבעים ותאורה בין הפרומפטים.",
      },
      {
        question: "מה משך הסרטון האידיאלי?",
        answer:
          "תלוי במורכבות. כלל אצבע: שוט סטטי עם תנועה קלה = 4-5 שניות. שוט עם תנועת מצלמה + פעולה = 8-10 שניות. סצנה עם התקדמות דרמטית או דיאלוג = 12-20 שניות (רק Sora ו-Kling). סרטונים קצרים וממוקדים כמעט תמיד טובים יותר מסרטונים ארוכים ומעורפלים.",
      },
      {
        question: "מה ההבדל בין פרומפט לתמונה לפרומפט לוידאו?",
        answer:
          "פרומפט לתמונה מתאר רגע קפוא — קומפוזיציה, תאורה, סגנון. פרומפט לוידאו מוסיף מימד זמן: מה קורה, מה משתנה, איך המצלמה נעה, ומה נשמע. חשוב על זה ככה: תמונה = צילום, וידאו = צילום + תנועה + זמן + אולי אודיו. הפרומפט צריך לתאר את השינוי, לא רק את המצב.",
      },
    ],
  },
];

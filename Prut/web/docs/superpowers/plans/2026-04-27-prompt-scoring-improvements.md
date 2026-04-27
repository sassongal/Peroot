# Prompt Scoring Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the client-side prompt input scorer with three targeted upgrades: Hebrew keyword expansion in all dimension functions, 3-level density tiers replacing binary detection, and a cross-dimension specificity bonus.

**Architecture:** All changes are in two files: `src/lib/engines/scoring/prompt-dimensions.ts` (dimension scoring logic reused by both InputScorer and EnhancedScorer) and `src/lib/engines/scoring/input-scorer.ts` (orchestration + specificity bonus). No new files, no new architecture, no AI calls.

**Tech Stack:** TypeScript, regex patterns, existing scoring infrastructure.

---

## Files

- Modify: `src/lib/engines/scoring/prompt-dimensions.ts` — Tasks 1–2 (Hebrew expansion for all visual + text dimension functions)
- Modify: `src/lib/engines/scoring/input-scorer.ts` — Task 3 (density tiers in DIMS) + Task 4 (cross-dimension specificity bonus)

---

### Task 1: Hebrew expansion — visual dimension functions in prompt-dimensions.ts

The visual dimension functions (`scoreVisualSubject`, `scoreVisualStyle`, `scoreVisualComposition`, `scoreVisualLighting`, `scoreVisualColor`, `scoreVisualMotion`) currently have almost no Hebrew patterns. A user writing "תמונה של אישה יושבת ליד חלון, שחורלבן, תאורת בוקר רכה" would score near zero. This task fixes that.

**Files:**
- Modify: `src/lib/engines/scoring/prompt-dimensions.ts`

- [ ] **Step 1: Expand `scoreVisualSubject` (lines ~823–842)**

Replace the function body with:

```typescript
function scoreVisualSubject(t: string): DimensionScoreChunk {
  const key = 'subject';
  const maxPoints = 15;
  const tipHe = 'תאר את הנושא המרכזי (מראה, תנוחה, ביטוי)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/person|woman|man|child|character|portrait|face|figure|אישה|איש|גבר|ילד|ילדה|פנים|דמות|אדם|נער|נערה|תינוק|זקן|זקנה/i.test(t)) {
    matched.push('סוג נושא');
    pts += 5;
  }
  if (/wearing|dressed|hair|eyes|skin|clothes|expression|pose|לובש|לובשת|שיער|עיניים|בגד|ביטוי|תנוחה|עור|זקן|מבט/i.test(t)) {
    matched.push('מראה');
    pts += 5;
  } else missing.push('פירוט מראה');
  if (/car|building|landscape|forest|city|ocean|room|table|product|animal|flower|sky|mountain|tree|מכונית|בניין|נוף|יער|עיר|חדר|שולחן|מוצר|חיה|פרח|שמים|הר|עץ|ים|נחל|שדה|ביתן|רחוב|גשר|מדבר|אי/i.test(t)) {
    matched.push('אובייקט / סצנה');
    pts += 5;
  }
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}
```

- [ ] **Step 2: Expand `scoreVisualStyle` (lines ~845–861)**

Replace the function body with:

```typescript
function scoreVisualStyle(t: string): DimensionScoreChunk {
  const key = 'style';
  const maxPoints = 15;
  const tipHe = 'ציין סגנון אמנותי (צילום, ציור שמן, 3D, אנימה)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/photo|realistic|illustration|painting|3d|render|anime|watercolor|digital art|צילום|ציור|איור|רישום|תלת\s*מימד|אנימציה|קולנועי|קריקטורה|מנגה|גרפי|ריאליסטי|מופשט|ספר|פסטל|שמן/i.test(t)) {
    matched.push('מדיום');
    pts += 8;
  } else missing.push('מדיום');
  if (/style of|בסגנון|aesthetic|art deco|cyberpunk|minimalist|vintage|retro|modern|cinematic|noir|fantasy|sci-fi|אסתטיקה|ויינטג|רטרו|מינימליסטי|פנטזיה|מדע\s*בדיוני|קלאסי|מסורתי|עתידני|אורבני/i.test(t)) {
    matched.push('אסתטיקה');
    pts += 7;
  } else missing.push('התייחסות אסתטית');
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}
```

- [ ] **Step 3: Expand `scoreVisualComposition` (lines ~863–884)**

Replace the function body with:

```typescript
function scoreVisualComposition(t: string): DimensionScoreChunk {
  const key = 'composition';
  const maxPoints = 12;
  const tipHe = 'הוסף זווית מצלמה, מסגור, ויחס גובה-רוחב';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/close-up|wide shot|aerial|medium shot|full body|low angle|high angle|תקריב|זווית|זווית\s*נמוכה|זווית\s*גבוהה|עין\s*ציפור|מבט\s*מלמעלה|מבט\s*מלמטה|מסגור|פריים|שדה\s*ראייה|מלא\s*גוף|פנים\s*בלבד|ראש\s*כתפיים/i.test(t)) {
    matched.push('סוג צילום');
    pts += 4;
  } else missing.push('סוג צילום');
  if (/rule of thirds|centered|symmetr|diagonal|foreground|background|depth|bokeh|שדה|רקע|קדמה|עומק|סימטרי|אסימטרי|אלכסוני|מרכזי|מדורג|שכבות/i.test(t)) {
    matched.push('קומפוזיציה');
    pts += 4;
  } else missing.push('מסגור');
  if (/--ar\s*\d+:\d+|\[(?:aspectRatio|size|aspect)\s*[:=]\s*\S+|\d{3,4}\s*[x×]\s*\d{3,4}|aspect\s*ratio|\d+:\d+\s*(ratio|aspect)|portrait|landscape|square|vertical|horizontal|פורטרט|אופקי|אנכי|ריבועי|יחס|גובה.רוחב/i.test(t)) {
    matched.push('יחס גובה־רוחב');
    pts += 4;
  } else missing.push('יחס גובה־רוחב');
  return { key, maxPoints, tipHe, score: Math.min(12, pts), matched, missing };
}
```

- [ ] **Step 4: Expand `scoreVisualLighting` (lines ~886–902)**

Replace the function body with:

```typescript
function scoreVisualLighting(t: string): DimensionScoreChunk {
  const key = 'lighting';
  const maxPoints = 15;
  const tipHe = 'תאר תאורה (שעת זהב, סטודיו, ניאון, כיוון האור)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/golden hour|sunset|sunrise|natural light|studio|neon|backlight|rim light|volumetric|שעת\s*זהב|תאורה|אור|שקיעה|זריחה|בוקר|ערב|לילה|נר|אש|ניאון|סטודיו|שמש|ירח|חלון|פנס|להב/i.test(t)) {
    matched.push('סוג תאורה');
    pts += 8;
  } else missing.push('סוג תאורה');
  if (/soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high key|low key|רך|חם|קר|דרמטי|עדין|חזק|ניגוד|צל|מפוזר|עמעום|בהיר|כהה|חשוך|מואר/i.test(t)) {
    matched.push('איכות אור');
    pts += 7;
  } else missing.push('מצב אור');
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}
```

- [ ] **Step 5: Expand `scoreVisualColor` (lines ~904–920)**

Replace the function body with:

```typescript
function scoreVisualColor(t: string): DimensionScoreChunk {
  const key = 'color';
  const maxPoints = 10;
  const tipHe = 'ציין פלטת צבעים ואווירה';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/red|blue|green|yellow|purple|orange|amber|teal|crimson|magenta|cyan|#[0-9a-f]{3,6}|אדום|כחול|ירוק|צהוב|כתום|סגול|ורוד|חום|שחור|לבן|אפור|טורקיז|זהוב|כסוף|בורדו|זית|בז|חאקי|תכלת|לילך|מנטה|קורל|שזוף|כרם/i.test(t)) {
    matched.push('צבעים ספציפיים');
    pts += 5;
  } else missing.push('פלטת צבעים');
  if (/mood|atmosphere|vibe|feeling|cinematic|monochrome|pastel|warm tones|cool tones|אווירה|מצב\s*רוח|קולנועי|מונוכרום|פסטל|טון\s*חם|טון\s*קר|גווני|צבעוני|עמום|תוסס|קודר/i.test(t)) {
    matched.push('אווירה');
    pts += 5;
  } else missing.push('אווירה');
  return { key, maxPoints, tipHe, score: Math.min(10, pts), matched, missing };
}
```

- [ ] **Step 6: Expand `scoreVisualMotion` (lines ~961–981)**

Replace the function body with:

```typescript
function scoreVisualMotion(t: string): DimensionScoreChunk {
  const key = 'motion';
  const maxPoints = 13;
  const tipHe = 'הוסף תנועת מצלמה, תנועת נושא והשפעות סביבתיות';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/dolly|pan|tracking|zoom|crane|handheld|steadicam|orbit|תנועת\s*מצלמה|מצלמה\s*נעה|פאן|זום|מתקרב|מתרחק|סיבוב|מקיף|מעגלי|מעוף/i.test(t)) {
    matched.push('תנועת מצלמה');
    pts += 5;
  } else missing.push('תנועת מצלמה');
  if (/walks|runs|jumps|glides|sprints|rises|falls|turns|flies|swims|dances|הולך|הולכת|רץ|רצה|קופץ|קופצת|מרחף|שוחה|רוקד|רוקדת|מסתובב|ניגש|עולה|יורד|נע|מתנועע|זורם|גולש/i.test(t)) {
    matched.push('תנועת נושא');
    pts += 4;
  } else missing.push('פעלים של נושא');
  if (/rain|snow|smoke|dust|particles|mist|wind|fog|waves|fire|גשם|שלג|ערפל|עשן|אבק|רוח|גלים|אש|להבות|עלים\s*נושרים|נהר|מפל|ענן|ברק/i.test(t)) {
    matched.push('תנועה סביבתית');
    pts += 4;
  } else missing.push('תנועה סביבתית');
  return { key, maxPoints, tipHe, score: Math.min(13, pts), matched, missing };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/scoring/prompt-dimensions.ts
git commit -m "feat(scoring): Hebrew keyword expansion for all visual dimension functions"
```

---

### Task 2: Hebrew expansion — text dimension functions in prompt-dimensions.ts

**Files:**
- Modify: `src/lib/engines/scoring/prompt-dimensions.ts`

- [ ] **Step 1: Expand `scoreConstraints` (lines ~307–343)**

In the `scoreConstraints` function, find the negative-constraints check:
```typescript
} else if (/אל\s+ת|אסור|ללא|בלי|don'?t|avoid|never|without/i.test(t)) {
```

Replace with:
```typescript
} else if (/אל\s+ת|אסור|ללא|בלי|אין\s+ל|שלא\s+|לא\s+לכלול|לא\s+להזכיר|הימנע|מבלי|ללא\s+שימוש|אין\s+להשתמש|don'?t|avoid|never|without|refrain|exclude/i.test(t)) {
```

And find the tone check:
```typescript
if (/טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(t)) {
```

Replace with:
```typescript
if (/טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי|רשמי|לא\s*רשמי|ישיר|עדין|חד|נחרץ|אישי|אובייקטיבי|נייטרלי|חם|קר/i.test(t)) {
```

And the language check:
```typescript
if (/שפה|language|בעברית|באנגלית/i.test(t)) {
```

Replace with:
```typescript
if (/שפה|language|בעברית|באנגלית|בערבית|בצרפתית|בספרדית|בגרמנית|בלבד|רק\s+ב|only\s+in|in\s+(?:hebrew|english|arabic|french|spanish|german)/i.test(t)) {
```

- [ ] **Step 2: Expand `scoreGroundedness` (lines ~450–469)**

Find the citation check:
```typescript
if (/צטט|מקור|cite|source|reference|based\s+on/i.test(t)) {
```

Replace with:
```typescript
if (/צטט|מקור|ציין\s*מקור|הסתמך\s*על|בהתבסס\s*על|לפי|עיגן|בסס\s*על|cite|source|reference|based\s+on|according\s+to|grounded\s+in|cite\s+sources/i.test(t)) {
```

Find the uncertainty check:
```typescript
if (/אם לא בטוח|אל תמציא|don'?t\s+fabricate|if\s+unsure|אינני בטוח|i\s+don'?t\s+know|הסתמך על|admit\s+(?:when\s+)?uncertain|say\s+(?:you\s+)?don'?t\s+know|הודה\s+שאינ|acknowledge\s+(?:when\s+)?uncertain/i.test(t)) {
```

Replace with:
```typescript
if (/אם\s+לא\s+בטוח|אל\s+תמציא|לא\s+ידוע\s+לך|הודה\s+שאינ|ציין\s+אי.וודאות|במקרה\s+של\s+אי.ודאות|אם\s+אינ\s+בטוח|don'?t\s+fabricate|if\s+unsure|i\s+don'?t\s+know|admit\s+(?:when\s+)?uncertain|say\s+(?:you\s+)?don'?t\s+know|acknowledge\s+(?:when\s+)?uncertain|flag\s+uncertainty|mark\s+as\s+uncertain/i.test(t)) {
```

Find the facts check:
```typescript
if (/עובדות|fact|ground|אמת|verify/i.test(t)) {
```

Replace with:
```typescript
if (/עובדות|עובדתי|מאומת|מוכח|אמיתי|fact|ground|אמת|verify|verified|factual|accurate|evidence.based|מבוסס\s+על\s+ראיות|בדוק/i.test(t)) {
```

- [ ] **Step 3: Expand `scoreSafety` (lines ~471–513)**

Find the scope check:
```typescript
if (/מחוץ לתחום|out\s+of\s+scope|not\s+covered|לא בתחום/i.test(t)) {
```

Replace with:
```typescript
if (/מחוץ\s+לתחום|לא\s+בתחום|גבול\s+תחום|מגבלת\s+תחום|out\s+of\s+scope|not\s+covered|beyond\s+scope|outside\s+my\s+(?:scope|expertise)/i.test(t)) {
```

Find the edge case check:
```typescript
if (/מקרה קצה|edge\s+case|exception|חריג/i.test(t)) {
```

Replace with:
```typescript
if (/מקרה\s+קצה|מקרי\s+קצה|חריג|יוצא\s+דופן|מצב\s+חריג|edge\s+case|exception|corner\s+case|fallback|אם\s+.*\s+אז|במקרה\s+ש|כאשר\s+.*\s+אז/i.test(t)) {
```

- [ ] **Step 4: Expand `scoreFormat` (lines ~286–305)**

Find the format check:
```typescript
if (/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|csv/i.test(t)) {
```

Replace with:
```typescript
if (/פורמט|מבנה|טבלה|עמודות|רשימה|ממוספר|לא\s*ממוספר|bullet|markdown|json|csv|xml|html|תבנית|סעיפים|כותרות|פרקים|שורות\s+של|מחולק\s+ל/i.test(t)) {
```

Find the length check:
```typescript
if (/אורך|מילים|שורות|פסקאות|words|sentences|paragraphs|short|long|קצר|ארוך/i.test(t)) {
```

Replace with:
```typescript
if (/אורך|מילים|שורות|פסקאות|תווים|words|sentences|paragraphs|characters|short|long|brief|concise|קצר|ארוך|תמציתי|מפורט|מורחב|תקציר/i.test(t)) {
```

Find the section headers check:
```typescript
if (/כותרת|סעיפים|חלקים|header|section|intro|summary/i.test(t)) {
```

Replace with:
```typescript
if (/כותרת|כותרות|סעיפים|חלקים|פרק|מבוא|תקציר|סיכום|מסקנות|header|section|intro|summary|conclusion|breakdown|חלק\s+ראשון|חלק\s+שני/i.test(t)) {
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/scoring/prompt-dimensions.ts
git commit -m "feat(scoring): Hebrew keyword expansion for text dimension functions"
```

---

### Task 3: Density tiers in DIMS (input-scorer.ts)

Replace binary 0/1 ratios with 3-level scoring in the `DIMS` object. The model: `0.4` = signal keyword only, `0.75` = keyword + modifier/context, `1.0` = keyword + specifics/full expression.

**Files:**
- Modify: `src/lib/engines/scoring/input-scorer.ts`

- [ ] **Step 1: Upgrade `constraints` DIMS entry (lines ~212–222)**

Replace the `constraints` entry in `DIMS`:

```typescript
constraints: {
  key: 'constraints',
  label: 'מגבלות',
  tip: 'הוסף מגבלות שליליות: "אל ת…", "ללא…", "בלי…"',
  test: (p) => {
    if (hasNegativeConstraints(p)) {
      const hasTone = /טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי|רשמי|לא\s*רשמי/i.test(p.text);
      const hasLang = /שפה|language|בעברית|באנגלית|in\s+(?:hebrew|english)/i.test(p.text);
      if (hasTone && hasLang) return { ratio: 1, matched: ['negative constraints', 'tone', 'language'], missing: [] };
      if (hasTone || hasLang) return { ratio: 0.75, matched: ['negative constraints', hasTone ? 'tone' : 'language'], missing: [hasTone ? 'language' : 'tone'] };
      return { ratio: 0.4, matched: ['negative constraints'], missing: ['tone spec', 'language spec'] };
    }
    // Partial: has tone/style but no explicit negation
    const hasToneOnly = /טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(p.text);
    if (hasToneOnly) return { ratio: 0.25, matched: ['tone mentioned'], missing: ['explicit do/don\'t rules'] };
    return { ratio: 0, matched: [], missing: ['do/don\'t rules'] };
  },
},
```

- [ ] **Step 2: Upgrade `style` DIMS entry (lines ~497–501)**

Replace the `style` entry in `DIMS`:

```typescript
style: {
  key: 'style',
  label: 'סגנון',
  tip: 'ציין מדיום/סגנון (צילום, איור, אנימציה, cinematic ...)',
  test: (p) => {
    if (!hasImageStyle(p)) return { ratio: 0, matched: [], missing: ['style / medium'] };
    // Full: medium + aesthetic reference
    const hasAesthetic = /style\s+of|בסגנון|aesthetic|art\s+deco|cyberpunk|minimalist|vintage|retro|modern|cinematic|אסתטיקה|ויינטג|רטרו|מינימליסטי|פנטזיה|עתידני|קלאסי/i.test(p.text);
    if (hasAesthetic) return { ratio: 1, matched: ['medium', 'aesthetic'], missing: [] };
    return { ratio: 0.5, matched: ['medium'], missing: ['aesthetic reference (בסגנון X)'] };
  },
},
```

- [ ] **Step 3: Upgrade `lighting` DIMS entry (lines ~519–525)**

Replace the `lighting` entry in `DIMS`:

```typescript
lighting: {
  key: 'lighting',
  label: 'תאורה',
  tip: 'תאר תאורה (golden hour, soft light, rim, Rembrandt ...)',
  test: (p) => {
    if (!hasImageLighting(p)) return { ratio: 0, matched: [], missing: ['lighting'] };
    // Full: lighting type + quality/direction
    const hasQuality = /soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high\s+key|low\s+key|רך|חם|קר|דרמטי|עדין|ניגוד|צל|עמעום|מפוזר/i.test(p.text);
    if (hasQuality) return { ratio: 1, matched: ['lighting type', 'quality'], missing: [] };
    return { ratio: 0.5, matched: ['lighting type'], missing: ['lighting quality (soft/dramatic/warm...)'] };
  },
},
```

- [ ] **Step 4: Upgrade `color` DIMS entry (lines ~528–535)**

Replace the `color` entry in `DIMS`:

```typescript
color: {
  key: 'color',
  label: 'צבע',
  tip: 'פרט פלטת צבעים / מצב-רוח צבעוני',
  test: (p) => {
    if (!hasImageColor(p)) return { ratio: 0, matched: [], missing: ['color palette'] };
    // Full: specific colors + mood/atmosphere
    const hasMood = /mood|atmosphere|vibe|cinematic|monochrome|pastel|אווירה|מצב\s*רוח|קולנועי|מונוכרום|פסטל|גווני|טון\s*חם|טון\s*קר/i.test(p.text);
    if (hasMood) return { ratio: 1, matched: ['colors', 'mood'], missing: [] };
    return { ratio: 0.5, matched: ['colors specified'], missing: ['color mood / atmosphere'] };
  },
},
```

- [ ] **Step 5: Upgrade `subject` DIMS entry (lines ~483–491)**

Replace the `subject` entry in `DIMS`:

```typescript
subject: {
  key: 'subject',
  label: 'נושא',
  tip: 'תאר בבהירות מה נמצא בתמונה (מי/מה/איפה)',
  test: (p) => {
    if (!hasImageSubject(p)) return { ratio: 0, matched: [], missing: ['subject'] };
    // Full: subject + appearance/attribute described
    const hasAttribute = /wearing|dressed|hair|eyes|expression|pose|color|לובש|שיער|עיניים|ביטוי|תנוחה|בגד|גובה|גיל|young|old|tall|small|גדול|קטן|צעיר|מבוגר/i.test(p.text);
    if (hasAttribute && p.wordCount >= 8) return { ratio: 1, matched: ['subject described', 'attributes'], missing: [] };
    if (p.wordCount >= 8) return { ratio: 0.75, matched: ['subject described'], missing: ['subject attributes (appearance/pose)'] };
    return { ratio: 0.4, matched: ['subject mentioned'], missing: ['more subject detail'] };
  },
},
```

- [ ] **Step 6: Upgrade `examples` DIMS entry (lines ~288–295)**

Replace the `examples` entry in `DIMS`:

```typescript
examples: {
  key: 'examples',
  label: 'דוגמאות',
  tip: 'הוסף בלוק דוגמה מופרד: "דוגמה: ..."',
  test: (p) => {
    if (hasExampleBlock(p)) return { ratio: 1, matched: ['example block'], missing: [] };
    // Partial: keyword mention without full block
    const hasMention = /דוגמה|example|sample|template|תבנית|כמו\s+ל|כמו\s+זה|למשל/i.test(p.text);
    if (hasMention) return { ratio: 0.4, matched: ['example mentioned'], missing: ['full example block'] };
    return { ratio: 0, matched: [], missing: ['concrete example'] };
  },
},
```

- [ ] **Step 7: Upgrade `measurability` DIMS entry (lines ~298–305)**

Replace the `measurability` entry in `DIMS`:

```typescript
measurability: {
  key: 'measurability',
  label: 'מדידות',
  tip: 'הוסף קריטריון הצלחה מספרי (X מילים, Y פריטים, טווח Z)',
  test: (p) => {
    if (!hasMeasurableQuantity(p)) {
      return { ratio: 0, matched: [], missing: ['success metric'] };
    }
    // Full: has both a min and max, or an explicit range
    const hasMin = /לפחות|מינימום|at\s+least|minimum/i.test(p.text);
    const hasMax = /מקסימום|לכל\s+היותר|up\s+to|at\s+most|עד\s+\d+/i.test(p.text);
    const hasRange = /בין\s+\d+\s+ל|between\s+\d+\s+and|\d+[-–]\d+\s*(מילים|words|items|פריטים)/i.test(p.text);
    if (hasRange || (hasMin && hasMax)) return { ratio: 1, matched: ['measurable range'], missing: [] };
    if (hasMin || hasMax) return { ratio: 0.7, matched: ['one-sided limit'], missing: ['add matching min/max for full range'] };
    return { ratio: 0.5, matched: ['measurable quantity'], missing: ['explicit min/max range'] };
  },
},
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/engines/scoring/input-scorer.ts
git commit -m "feat(scoring): 3-level density tiers for constraints, style, lighting, color, subject, examples, measurability"
```

---

### Task 4: Cross-dimension specificity bonus in scoreInput

Numbers, quoted text, and proper nouns appearing in a prompt make it measurably more specific regardless of dimension. This bonus rewards cross-cutting specificity with up to +5 points, capped at 100.

**Files:**
- Modify: `src/lib/engines/scoring/input-scorer.ts`

- [ ] **Step 1: Add specificity bonus computation after the anti-gaming section**

In `scoreInput`, find the anti-gaming buzzword penalty block (lines ~877–888):

```typescript
  // Anti-gaming: buzzword inflation penalty — heavy buzzword use with no
  // concrete specs/examples gets a global deduction beyond the per-dimension hit
  const buzzCount = countBuzzwords(p);
  if (buzzCount >= 3 && !hasMeasurableQuantity(p) && !hasExampleBlock(p)) {
    const densityPenalty = Math.min(8, buzzCount * 1.5);
    totalRaw = Math.max(0, totalRaw - densityPenalty);
  }
```

Add the specificity bonus **immediately after** that block:

```typescript
  // Cross-dimension specificity bonus: numbers, quoted text, proper nouns signal
  // concrete specificity beyond what individual dimension scores capture (+0..+5)
  let specificityBonus = 0;
  if (/\d+/.test(text)) specificityBonus += 1;
  if (/[""״«»][^""״«»]{3,}[""״«»]/.test(text)) specificityBonus += 2;
  if (hasSpecificityProperNouns(p)) specificityBonus += 2;
  if (specificityBonus > 0) {
    totalRaw = Math.min(100, totalRaw + Math.min(5, specificityBonus));
  }
```

- [ ] **Step 2: Verify the bonus doesn't fire on empty/trivial prompts**

The existing `if (p.wordCount === 0)` guard returns early before this code is reached, so no change needed. The word count caps (`if (p.wordCount < 5) total = Math.min(total, 30)`) apply after `totalRaw` is rounded, providing a natural ceiling.

- [ ] **Step 3: Commit**

```bash
git add src/lib/engines/scoring/input-scorer.ts
git commit -m "feat(scoring): cross-dimension specificity bonus (numbers, quotes, proper nouns, +0..+5)"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Test Hebrew image prompt**

Open `http://localhost:3000` in the browser and select **יצירת תמונה** mode.

Type the following prompt and verify the score is **≥ 60** (was near 0 before):
```
אישה צעירה לובשת שמלה אדומה יושבת ליד חלון קפה, צילום קולנועי, תאורת שעת זהב רכה, גוונים חמים של ענבר וזהב, תקריב
```

Expected dimensions hitting: subject (אישה, לובשת, שמלה), style (צילום קולנועי), lighting (שעת זהב, רכה), color (אדומה, חמים, ענבר, זהב), composition (תקריב)

- [ ] **Step 2: Test Hebrew standard prompt**

Select **סטנדרטי** mode and type:
```
כתוב מאמר בלוג על שיווק דיגיטלי לעסקים קטנים. אל תשתמש בז'רגון טכני. טון ידידותי ומקצועי. בעברית. 500–700 מילים, 3 פסקאות
```

Expected: score **≥ 70** with constraints (טון, אל תשתמש, בעברית), format (מילים, פסקאות), measurability (500–700), specificity bonus (500–700 = number + range = +3).

- [ ] **Step 3: Verify no regression on English prompts**

Type a typical English image prompt:
```
A young woman sitting by a cafe window, cinematic photography, golden hour lighting, warm amber tones, close-up
```

Score should be **≥ 75** (same as before, patterns still match).

- [ ] **Step 4: Verify anti-gaming still works**

Type:
```
כתוב תוכן מקצועי מצוין איכותי חדשני מעולה
```

Score should be **≤ 25** (buzzword inflation penalty applies, no specifics).

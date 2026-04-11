import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Lightbulb,
  Zap,
  Target,
  Layers,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Brain,
  Drama,
  Settings,
  Camera,
  Bot,
  Search,
  Clock,
  CalendarDays,
  Image as ImageIcon,
  Video,
  Wrench,
} from "lucide-react";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/schema";
import { CopyButton } from "./CopyButton";

export const metadata: Metadata = {
  title: "מדריך כתיבת פרומפטים | פירוט - Peroot",
  description:
    "המדריך המלא לכתיבת פרומפטים מקצועיים בעברית. למדו טכניקות מתקדמות, דוגמאות מעשיות וטיפים מקצועיים לשימוש ב-ChatGPT, Claude ו-Gemini.",
  alternates: { canonical: "/guide" },
  openGraph: {
    title: "מדריך כתיבת פרומפטים מקצועיים | פירוט",
    description:
      "המדריך המלא בעברית לכתיבת פרומפטים שמייצרים תוצאות מדויקות מ-AI",
    locale: "he_IL",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "מדריך כתיבת פרומפטים מקצועיים | פירוט",
    description: "המדריך המלא בעברית לכתיבת פרומפטים שמייצרים תוצאות מדויקות מ-AI",
  },
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const TABLE_OF_CONTENTS = [
  { id: "what-is-prompt", label: "מה זה פרומפט?" },
  { id: "golden-rules", label: "5 עקרונות הזהב" },
  { id: "advanced", label: "טכניקות מתקדמות" },
  { id: "image-video", label: "פרומפטים לתמונות ווידאו" },
  { id: "ai-agents", label: "בניית סוכני AI" },
  { id: "deep-research", label: "מחקר מעמיק עם AI" },
  { id: "by-platform", label: "פרומפטים לפי פלטפורמה" },
  { id: "tips-2026", label: "טיפים ל-2026" },
  { id: "mistakes", label: "טעויות נפוצות" },
];

const GOLDEN_RULES = [
  {
    icon: Target,
    title: "היה ספציפי",
    subtitle: "Be Specific",
    description:
      "ככל שהפרומפט מפורט יותר, כך התשובה תהיה מדויקת יותר. הימנע ממשפטים כלליים שמשאירים מרחב פרשנות רחב מדי.",
    bad: "כתוב לי מאמר על AI",
    good: "כתוב מאמר של 800 מילה בעברית על ההשפעה של מודלי שפה גדולים על שוק העבודה בישראל, מיועד לקוראי Hi-Tech בגיל 25-40, בטון מקצועי אך נגיש.",
  },
  {
    icon: Layers,
    title: "תן הקשר",
    subtitle: "Provide Context",
    description:
      "המודל לא מכיר את הרקע שלך. ספק מידע על מי אתה, מי קהל היעד ומה המטרה. הקשר טוב שווה יותר מכל הנחיה אחרת.",
    bad: "עזור לי לכתוב מייל ללקוח",
    good: "אני מנהל פרויקט בחברת SaaS. לקוח ביטל פגישה ברגע האחרון פעמיים. כתוב מייל מקצועי שמבטא אכזבה עדינה, מציע קביעת פגישה חלופית ושואל אם יש חסם שאנחנו יכולים לפתור.",
  },
  {
    icon: BookOpen,
    title: "הגדר פורמט פלט",
    subtitle: "Define Output Format",
    description:
      "ציין בדיוק איך אתה רוצה לקבל את התשובה: רשימה מסודרת, טבלה, JSON, מאמר ברציפות, קוד עם הסברים וכו'.",
    bad: "תסביר לי אלגוריתם Quicksort",
    good: "הסבר אלגוריתם Quicksort. הפורמט: 1) הסבר בגובה עיניים 3 משפטים. 2) pseudocode. 3) מימוש Python עם הערות בעברית. 4) מתי כדאי להשתמש בו לעומת Mergesort.",
  },
  {
    icon: Lightbulb,
    title: "השתמש בדוגמאות",
    subtitle: "Use Examples (Few-Shot)",
    description:
      "הראה למודל דוגמה אחת או שתיים של הקלט-פלט הרצוי. זו אחת הטכניקות היעילות ביותר לשיפור איכות הפלט.",
    bad: "תרגם משפטים לאנגלית בסגנון עסקי",
    good: "תרגם משפטים לאנגלית בסגנון עסקי. דוגמה: קלט: 'הפגישה נדחתה' פלט: 'The meeting has been rescheduled' | קלט: 'אנחנו מתמודדים עם עיכוב' פלט: 'We are experiencing a delay'",
  },
  {
    icon: RefreshCw,
    title: "בדוק ושפר",
    subtitle: "Test and Iterate",
    description:
      "הפרומפט הראשון כמעט אף פעם לא מושלם. שמור גרסאות, שנה משתנה אחד בכל פעם ומד את ההשפעה על איכות הפלט.",
    bad: "לוותר אחרי תשובה לא טובה",
    good: "לאחר תשובה חלקית: 'התשובה קרובה אבל חסר X. שנה את הסעיף השני כך שיכלול Y, ושמור על אותו פורמט.'",
  },
];

const ADVANCED_TECHNIQUES = [
  {
    icon: Brain,
    title: "Chain of Thought",
    subtitle: "שרשרת חשיבה",
    description:
      "בקש מהמודל לחשוב בקול לפני שהוא נותן תשובה סופית. הטכניקה משפרת דרמטית את הדיוק בבעיות לוגיות, מתמטיות ומורכבות.",
    example: `"לפני שאתה עונה, חשוב בשלבים:
1. הבן את הבעיה
2. זהה את המשתנים
3. בנה פתרון שלב אחרי שלב
4. בדוק את התשובה

שאלה: חנות מכרה 40% ממלאי הנעליים שלה. לאחר מכן קיבלה משלוח של 60 זוגות. כעת יש לה 180 זוגות. כמה זוגות היו לה מלכתחילה?"`,
  },
  {
    icon: Drama,
    title: "Role Playing",
    subtitle: "משחק תפקידים",
    description:
      "הגדר למודל תפקיד ספציפי, ניסיון ומומחיות. כשהמודל 'מאמין' שהוא מומחה בתחום, האיכות והעומק של התשובות עולים משמעותית.",
    example: `"אתה מנכ'ל עם 20 שנות ניסיון בניהול סטארטאפים שהגיעו ל-Series B.
אתה ידוע ביכולתך לזהות בעיות מבניות בעסקים מוקדם, ולתת משוב ישיר ולא מתחשב.

אני עומד לגייס את העובד הראשון שלי לתפקיד CTO. שאל אותי 5 שאלות שיגלו אם אני מוכן לכך."`,
  },
  {
    icon: BookOpen,
    title: "Few-Shot Learning",
    subtitle: "למידה מדוגמאות",
    description:
      "ספק 2-5 דוגמאות של קלט ופלט לפני השאלה האמיתית. המודל לומד את הדפוס מהדוגמאות ומיישם אותו על הקלט החדש.",
    example: `"סיווג ביקורות לקוחות כחיובי / שלילי / ניטרלי:

ביקורת: 'המוצר מעולה, מגיע מהר' -> חיובי
ביקורת: 'לא עונים לטלפון' -> שלילי
ביקורת: 'קיבלתי את ההזמנה' -> ניטרלי

כעת סווג: 'האריזה הייתה פגומה אבל המוצר עצמו תקין'"`,
  },
  {
    icon: Settings,
    title: "System Prompts",
    subtitle: "הנחיות מערכת",
    description:
      "ב-Claude ו-ChatGPT API ניתן להגדיר System Prompt שמתאר את התפקיד, המגבלות והסגנון לכל השיחה. זה עוצמתי ביוצרת עקביות לאורך זמן.",
    example: `System:
אתה עוזר כתיבה לצוות שיווק B2B.
- כתוב תמיד בעברית, טון מקצועי אך לא פורמלי
- הימנע מז'רגון טכני ללא הסבר
- בכל תוצר כלול CTA ברור
- משפטים קצרים, פסקאות של 3-4 שורות
- אל תשתמש בביטויים כמו 'בנוסף', 'כמו כן', 'לסיכום'`,
  },
];

const IMAGE_VIDEO_TIPS = [
  {
    title: "מבנה פרומפט לתמונה",
    description:
      "פרומפט טוב לתמונה כולל: נושא + סגנון + תאורה + קומפוזיציה + פרטים טכניים. סדר המרכיבים משפיע על המשקל שלהם.",
    bad: "ציור של כלב בפארק",
    good: "Golden retriever puppy playing in a sunlit autumn park, soft bokeh background, warm golden hour lighting, shot from low angle, 85mm portrait lens, hyperrealistic photography style --ar 3:2 --v 7",
  },
  {
    title: "Negative Prompts",
    description:
      "ציין מה לא לכלול בתמונה. בכלים כמו Midjourney ו-Stable Diffusion, negative prompts מסירים אלמנטים לא רצויים ומשפרים את הדיוק.",
    bad: "תמונה של אישה יפה",
    good: "Professional headshot of a confident businesswoman, studio lighting, neutral background, sharp focus --no blurry, distorted hands, extra fingers, watermark, text, logo --ar 1:1 --style raw",
  },
  {
    title: "פרומפטים לוידאו (Sora / Runway)",
    description:
      "עבור יצירת וידאו, תארו תנועה, מעברי מצלמה ואווירה. חשבו כמו במאים — מה קורה בסצנה ואיך המצלמה זזה.",
    bad: "וידאו של עיר בלילה",
    good: "Cinematic drone shot slowly rising over Tel Aviv skyline at blue hour, city lights twinkling below, smooth camera movement from rooftop level to aerial view, atmospheric haze, 4K, 24fps, 5 seconds duration",
  },
];

const AI_AGENT_EXAMPLE = `System Prompt לסוכן שירות לקוחות:

אתה נציג שירות לקוחות של "TechStore" — חנות אלקטרוניקה.

## תפקיד
- ענה על שאלות לקוחות בנושא מוצרים, משלוחים והחזרות
- היה אדיב, מקצועי וממוקד פתרון

## מגבלות
- אל תמציא מידע על מוצרים. אם אינך יודע — אמור שתבדוק ותחזור
- אל תציע הנחות או פיצויים ללא אישור מנהל
- אל תשתף מידע פנימי על מדיניות החברה

## סגנון
- עברית, טון ידידותי אך מקצועי
- משפטים קצרים וברורים
- פנה ללקוח בגוף שני ("אתה/את")

## תהליך
1. הבן את הבעיה — שאל שאלות הבהרה אם צריך
2. הצע פתרון מתוך מדיניות ידועה
3. סכם את הפתרון ובקש אישור מהלקוח`;

const DEEP_RESEARCH_EXAMPLE = `"אני רוצה לבצע מחקר שוק על תחום ה-EdTech בישראל.

## היקף המחקר
- שוק ה-EdTech הישראלי, 2023-2026
- מיקוד: פתרונות AI לבתי ספר יסודיים ותיכונים

## מה לכלול
1. גודל השוק וקצב צמיחה (עם מקורות)
2. 5 שחקנים מרכזיים + יתרונות וחסרונות של כל אחד
3. מגמות טכנולוגיות (AI, personalization, gamification)
4. רגולציה ומדיניות משרד החינוך
5. הזדמנויות וסיכונים ליזם שנכנס לשוק

## פורמט הפלט
- דו"ח מובנה עם כותרות ברורות
- טבלת השוואה בין המתחרים
- ציין מקורות לכל טענה עובדתית
- סיכום מנהלים בתחילת הדו"ח (5 נקודות)"`;

const PLATFORMS = [
  {
    name: "ChatGPT",
    color: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
    dot: "bg-green-400",
    tips: [
      "השתמש ב-Custom Instructions להגדרת הקשר קבוע לכל שיחה",
      "GPT-4o מעולה למולטי-מודל (תמונות + טקסט). o3-mini למשימות לוגיות מורכבות",
      "מודל o1 / o3 מצטיין בחשיבה מעמיקה, מתמטיקה וקוד — ענק למשימות שדורשות reasoning",
      "ב-Projects ניתן להגדיר הנחיות מערכת, להעלות קבצים ולשמור הקשר קבוע",
    ],
  },
  {
    name: "Claude",
    color: "from-orange-500/20 to-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    tips: [
      "Claude 4 מצטיין בכתיבה ארוכה, ניתוח מסמכים וקוד — חלון הקשר של מיליון טוקנים",
      "ב-Projects תעלו מסמכי הקשר שזמינים לכל שיחה + הנחיות מותאמות אישית",
      "Tool Use מאפשר ל-Claude להשתמש בכלים חיצוניים (חיפוש, קוד, APIs) אוטומטית",
      "Artifacts יוצרים תוכן עצמאי (קוד, מסמכים, SVG) שניתן להוריד ולערוך",
    ],
  },
  {
    name: "Gemini",
    color: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    tips: [
      "Gemini 2.0 מביא יכולות מולטי-מודל מתקדמות — תמונות, וידאו, אודיו וקוד",
      "Deep Research מבצע מחקר מעמיק אוטונומי עם דו\"ח מקיף ומקורות מאומתים",
      "שולב ב-Google Workspace — נצלו אינטגרציה עם Docs, Gmail, Sheets ו-Drive",
      "Gemini Flash מהיר ועלות נמוכה לאפליקציות production בקנה מידה",
    ],
  },
  {
    name: "Midjourney / DALL-E",
    color: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
    tips: [
      "תארו סגנון, תאורה, זווית ומצלמה — לא רק את הנושא",
      "השתמשו ב-aspect ratio (--ar 16:9) ו-quality flags (--q 2)",
      "Negative prompts (--no) מסירים אלמנטים לא רצויים מהתמונה",
      "בנו מ-reference images: העלו תמונה כהשראה עם --sref או --cref",
    ],
  },
  {
    name: "Sora / Runway",
    color: "from-rose-500/20 to-red-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
    tips: [
      "תארו תנועת מצלמה ברורה: drone shot, tracking, dolly zoom, static wide",
      "ציינו משך הסצנה ופרטי סביבה — תאורה, מזג אוויר, שעה ביום",
      "Sora (OpenAI) מתמחה בסצנות ריאליסטיות, Runway Gen-3 טוב לסגנונות קריאייטיביים",
      "עבדו בשלבים: קודם תמונת key frame, אחר כך אנימציה ותנועה",
    ],
  },
];

const TIPS_2026 = [
  {
    icon: ImageIcon,
    title: "מולטי-מודל",
    description:
      "מודלים מובילים מקבלים תמונות, קול, וידאו, PDF וקבצי קוד ישירות. במקום לתאר מה יש בתמונה — פשוט העלו אותה ושאלו שאלות.",
  },
  {
    icon: Brain,
    title: "זיכרון והקשר",
    description:
      "חלונות הקשר של מיליון+ טוקנים מאפשרים לעבד ספרים שלמים ומסדי קוד. השתמשו ב-Projects (Claude) ו-Custom GPTs לשמירת הקשר קבוע.",
  },
  {
    icon: Wrench,
    title: "שימוש בכלים (Tool Use)",
    description:
      "מודלים מפעילים כלים אוטומטית: חיפוש באינטרנט, הרצת קוד, גישה ל-APIs. כתבו פרומפטים שמנחים מתי ואיך להשתמש בכלים, לא רק מה לענות.",
  },
  {
    icon: Bot,
    title: "MCP — פרוטוקול חיבור כלים",
    description:
      "Model Context Protocol (MCP) מאפשר לחבר מודלים לכלים חיצוניים: מסדי נתונים, CRM, GitHub, Slack ועוד. בנו סוכנים שפועלים בעולם האמיתי.",
  },
];

const MISTAKES = [
  {
    num: "01",
    title: "פרומפטים קצרים מדי",
    description:
      "\"כתוב לי מייל\" אינו פרומפט, זו בקשה. מודל AI צריך לדעת: למי? מה המטרה? מה הטון? מה הפורמט? ללא הקשר, המודל ממלא את החסרים בהשערות.",
  },
  {
    num: "02",
    title: "לבקש הכל בפעם אחת",
    description:
      "בקשות כמו \"כתוב ספר שיווקי שלם, כולל תוכן עניינים, 10 פרקים, תמונות וסיכום\" מובילות לתוצאות שטחיות. חלק את המשימה לשלבים, עשה כל שלב בנפרד.",
  },
  {
    num: "03",
    title: "להתייאש מהתשובה הראשונה",
    description:
      "השיחה עם מודל AI היא דיאלוג. אם התשובה לא מושלמת, ציין בדיוק מה חסר ובקש שיפור. \"הסעיף השני חלש, כתוב אותו מחדש עם דוגמה ספציפית\" הרבה יעיל יותר מלהתחיל מחדש.",
  },
  {
    num: "04",
    title: "לא לציין את קהל היעד",
    description:
      "אותו תוכן עבור מנכ\"ל ועבור מהנדס ג'וניור שונה לחלוטין. תמיד ציין: מי יקרא את זה? מה רמת המומחיות שלו? מה מניע אותו?",
  },
  {
    num: "05",
    title: "לשכוח לציין שפה ופורמטציה",
    description:
      "מודל AI ישלב לעיתים אנגלית בתוך עברית אם לא ציינת שפה. ציין: \"כל הטקסט בעברית בלבד\" ואם רלוונטי: \"ללא אמוג'י\", \"ללא כותרות מרקדאון\", \"טקסט רציף ללא נקודות\".",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl md:text-3xl font-serif text-foreground mb-2 scroll-mt-24"
    >
      {children}
      <span className="block mt-2 h-0.5 w-14 bg-linear-to-r from-amber-500 to-yellow-400 rounded-full" />
    </h2>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl border border-border bg-card ${className}`}>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative group/code">
      <CopyButton text={children} />
      <pre className="bg-[#0d0d0d] border border-border rounded-xl p-4 pr-4 pl-10 text-sm font-mono text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap text-right [-webkit-overflow-scrolling:touch]" dir="rtl">
        {children}
      </pre>
    </div>
  );
}

function BadGoodComparison({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      <div className="border border-red-500/25 bg-red-950/20 rounded-xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">פרומפט חלש</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{bad}</p>
      </div>
      <div className="border border-emerald-500/25 bg-emerald-950/20 rounded-xl p-4 transition-transform duration-200 hover:-translate-y-0.5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">פרומפט חזק</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{good}</p>
      </div>
    </div>
  );
}

function SidebarToc() {
  return (
    <nav aria-label="תוכן עניינים — סרגל צד" className="space-y-1">
      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">תוכן עניינים</p>
      {TABLE_OF_CONTENTS.map((item, i) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="flex items-center gap-2 py-1.5 text-[13px] text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <span className="w-4 h-4 rounded-full border border-border bg-secondary flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
            {i + 1}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          breadcrumbSchema([
            { name: "דף הבית", url: "/" },
            { name: "מדריך", url: "/guide" },
          ])
        ),
      }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "מדריך מלא להנדסת פרומפטים בעברית",
          description: "למדו איך לכתוב פרומפטים מקצועיים שמפיקים תוצאות מדויקות מ-ChatGPT, Claude, Gemini ו-Midjourney",
          author: {
            "@type": "Person",
            name: "Gal Sasson",
            sameAs: ["https://www.linkedin.com/in/sassongal/", "https://github.com/sassongal"],
          },
          publisher: {
            "@type": "Organization",
            name: "Peroot",
            url: "https://www.peroot.space",
          },
          datePublished: "2026-01-15",
          dateModified: "2026-03-17",
          inLanguage: "he",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://www.peroot.space/guide",
          },
        }),
      }}
    />

    {/* Smooth scroll */}
    <style dangerouslySetInnerHTML={{ __html: `html { scroll-behavior: smooth; }` }} />

    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16">

        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-fit mb-10"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לפירוט</span>
        </Link>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="text-center mb-16 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <PageHeading
              title="מדריך כתיבת"
              highlight="פרומפטים מקצועיים"
              subtitle="מאפס לפרומפטים שמייצרים תוצאות. כל מה שצריך לדעת על כתיבת פרומפטים ל-ChatGPT, Claude ו-Gemini, כולל תמונות, וידאו וסוכני AI — בעברית, בצורה ברורה ומעשית."
              badge="המדריך המלא בעברית"
              badgeIcon={<BookOpen className="w-3.5 h-3.5" />}
              size="large"
              align="center"
            />
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground text-xs">
              <Clock className="w-3 h-3" />
              זמן קריאה: 15 דקות
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground text-xs">
              <CalendarDays className="w-3 h-3" />
              עודכן: מרץ 2026
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
            >
              <Zap className="w-4 h-4" />
              נסה את פירוט - חינם
            </Link>
            <a
              href="#what-is-prompt"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-border text-secondary-foreground text-sm hover:border-white/30 hover:text-foreground transition-all"
            >
              קרא את המדריך
              <ChevronRight className="w-4 h-4 rotate-90" />
            </a>
          </div>
        </section>

        {/* ── Layout: Sidebar + Content ──────────────────────────────────── */}
        <div className="lg:flex lg:gap-10">

          {/* Sidebar TOC — desktop sticky */}
          <aside className="hidden lg:block lg:w-56 shrink-0">
            <div className="sticky top-20">
              <GlassCard className="p-4">
                <SidebarToc />
              </GlassCard>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 max-w-4xl">

            {/* ── Mobile TOC ───────────────────────────────────────────────── */}
            <details className="lg:hidden mb-14 group/toc">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest">תוכן עניינים</p>
                    <span className="text-xs text-muted-foreground">({TABLE_OF_CONTENTS.length} פרקים)</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open/toc:rotate-180" />
                </GlassCard>
              </summary>
              <GlassCard className="p-4 mt-2">
                <nav aria-label="תוכן עניינים">
                  <ol className="space-y-2">
                    {TABLE_OF_CONTENTS.map((item, i) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="flex items-center gap-3 text-secondary-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm cursor-pointer"
                        >
                          <span className="w-5 h-5 rounded-full border border-border bg-secondary flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
                            {i + 1}
                          </span>
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </GlassCard>
            </details>

            {/* ── Section 1: What is a Prompt ───────────────────────────────── */}
            <section className="mb-16 space-y-6">
              <SectionHeading id="what-is-prompt">מה זה פרומפט?</SectionHeading>
              <GlassCard className="p-6 md:p-8 space-y-4">
                <p className="text-foreground leading-relaxed text-base">
                  פרומפט הוא ההנחיה שאתה נותן למודל AI. זה יכול להיות שאלה, בקשה, הנחיה, דוגמה, או
                  שילוב של כולם. כמו שהנחיות ברורות לעובד מנוסה מובילות לתוצאות טובות יותר, פרומפט
                  מנוסח היטב מוביל לתוצאות משמעותית טובות יותר ממודל AI.
                </p>
                <p className="text-foreground leading-relaxed text-base">
                  מודלי שפה גדולים (LLMs) כמו GPT-4, Claude ו-Gemini הם כלים רבי-עוצמה, אבל הם רק
                  כמה טובים כמו ההנחיות שמקבלים. אותו מודל, עם פרומפט שונה, יכול לייצר תוצאה
                  גרועה או תוצאה מצוינת.
                </p>
                <div className="border-r-2 border-amber-500/60 pr-4 mt-2">
                  <p className="text-foreground text-sm leading-relaxed italic">
                    &ldquo;Prompt Engineering הוא המיומנות החשובה ביותר שמנהלים, יוצרים ויזמים יכולים
                    לפתח בעשור הקרוב. זה לא קוד ולא AI, זה פשוט יכולת לתקשר ביעילות עם הכלי
                    החזק ביותר שנוצר.&rdquo;
                  </p>
                </div>
              </GlassCard>
            </section>

            {/* ── Section 2: 5 Golden Rules ─────────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="golden-rules">5 עקרונות הזהב</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                חמשת הכללים האלה מכסים 90% ממה שצריך כדי לכתוב פרומפטים שעובדים. שלוט בהם ותראה
                שיפור מיידי בכל אינטראקציה עם AI.
              </p>
              {GOLDEN_RULES.map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <GlassCard key={i} className="p-6 md:p-8 bg-linear-to-br from-amber-500/3 to-transparent">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif text-foreground">
                          {i + 1}. {rule.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{rule.description}</p>
                    <BadGoodComparison bad={rule.bad} good={rule.good} />
                  </GlassCard>
                );
              })}
            </section>

            {/* ── Section 3: Advanced Techniques ────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="advanced">טכניקות מתקדמות</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                אחרי שתשלוט בעקרונות הבסיסיים, הטכניקות האלה יאפשרו לך לחלץ ביצועים ברמה גבוהה
                עוד יותר ממודלי AI.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ADVANCED_TECHNIQUES.map((tech, i) => (
                  <GlassCard key={i} className="p-6 space-y-4 bg-linear-to-br from-blue-500/3 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <tech.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-serif text-foreground text-base">{tech.title}</h3>
                        <p className="text-xs text-muted-foreground">{tech.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{tech.description}</p>
                    <div>
                      <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-2">דוגמה</p>
                      <CodeBlock>{tech.example}</CodeBlock>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* ── Section 4: Image & Video Prompts ──────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="image-video">פרומפטים לתמונות ווידאו</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                יצירת תמונות ווידאו עם AI דורשת חשיבה ויזואלית. תארו לא רק מה רוצים לראות, אלא גם
                איך — סגנון, תאורה, קומפוזיציה ופרטים טכניים.
              </p>
              {IMAGE_VIDEO_TIPS.map((tip, i) => (
                <GlassCard key={i} className="p-6 md:p-8 bg-linear-to-br from-purple-500/4 to-transparent">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      {i < 2 ? (
                        <Camera className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Video className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-serif text-foreground">{tip.title}</h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{tip.description}</p>
                  <BadGoodComparison bad={tip.bad} good={tip.good} />
                </GlassCard>
              ))}
            </section>

            {/* ── Section 5: AI Agents ──────────────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="ai-agents">בניית סוכני AI</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                סוכני AI הם מודלים שפועלים באופן אוטונומי לפי הנחיות שכתבתם. בין אם זה Custom GPT,
                Claude Project או סוכן מותאם אישית — כתיבת System Prompt טובה היא הבסיס לסוכן שעובד.
              </p>
              <GlassCard className="p-6 md:p-8 space-y-6 bg-linear-to-br from-emerald-500/3 to-transparent">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-foreground">מבנה System Prompt לסוכן</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">הגדרת תפקיד, מגבלות, סגנון ותהליך</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-emerald-500/15 bg-emerald-950/10 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-emerald-400">מה חייב להיכלל</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
                      <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-1 shrink-0" />הגדרת תפקיד ותחום מומחיות</li>
                      <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-1 shrink-0" />מגבלות ברורות — מה הסוכן לא עושה</li>
                      <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-1 shrink-0" />סגנון תקשורת (שפה, טון, אורך)</li>
                      <li className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-1 shrink-0" />תהליך עבודה שלב-אחרי-שלב</li>
                    </ul>
                  </div>
                  <div className="border border-red-500/15 bg-red-950/10 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-red-400">טעויות נפוצות</h4>
                    <ul className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">
                      <li className="flex gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-1 shrink-0" />הנחיות מעורפלות (&ldquo;היה טוב&rdquo;)</li>
                      <li className="flex gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-1 shrink-0" />חוסר מגבלות — הסוכן ממציא מידע</li>
                      <li className="flex gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-1 shrink-0" />אישיות סותרת (מקצועי + קזואלי)</li>
                      <li className="flex gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-1 shrink-0" />חוסר guardrails למקרי קצה</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">דוגמה מלאה</p>
                  <CodeBlock>{AI_AGENT_EXAMPLE}</CodeBlock>
                </div>
              </GlassCard>
            </section>

            {/* ── Section 6: Deep Research ──────────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="deep-research">מחקר מעמיק עם AI</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                מצב Deep Research (זמין ב-Gemini, ChatGPT Pro ו-Perplexity) מבצע מחקר אוטונומי — גולש
                באינטרנט, מצלב מקורות ויוצר דו&quot;ח מקיף. המפתח הוא פרומפט מובנה שמגדיר היקף ופורמט.
              </p>
              <GlassCard className="p-6 md:p-8 space-y-6 bg-linear-to-br from-cyan-500/3 to-transparent">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-foreground">כיצד לבנות שאילתת מחקר</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">היקף + מיקוד + מבנה פלט + דרישת מקורות</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-cyan-500/15 bg-cyan-950/10 rounded-xl p-4">
                    <p className="text-xs font-semibold text-cyan-400 mb-1.5">1. הגדר היקף</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">ציין תחום, טווח שנים, מיקוד גיאוגרפי ומגזר שוק.</p>
                  </div>
                  <div className="border border-cyan-500/15 bg-cyan-950/10 rounded-xl p-4">
                    <p className="text-xs font-semibold text-cyan-400 mb-1.5">2. בקש מבנה</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">הגדר פורמט: טבלאות, רשימות, סיכום מנהלים, השוואות.</p>
                  </div>
                  <div className="border border-cyan-500/15 bg-cyan-950/10 rounded-xl p-4">
                    <p className="text-xs font-semibold text-cyan-400 mb-1.5">3. דרוש מקורות</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">בקש ציון מקור לכל טענה עובדתית. ציין אם אתה צריך לינקים.</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">דוגמה: פרומפט מחקר שוק</p>
                  <CodeBlock>{DEEP_RESEARCH_EXAMPLE}</CodeBlock>
                </div>
              </GlassCard>
            </section>

            {/* ── Section 7: By Platform ─────────────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="by-platform">פרומפטים לפי פלטפורמה</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                לכל מודל AI יש חוזקות, מגבלות ומאפיינים ייחודיים. הכר את ההבדלים וכתב בהתאם.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLATFORMS.map((platform) => (
                  <GlassCard key={platform.name} className={`p-6 bg-linear-to-br ${platform.color}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`w-2.5 h-2.5 rounded-full ${platform.dot}`} />
                      <h3 className="font-serif text-foreground text-lg">{platform.name}</h3>
                    </div>
                    <ul className="space-y-3">
                      {platform.tips.map((tip, j) => (
                        <li key={j} className="flex gap-2 text-sm text-secondary-foreground leading-relaxed">
                          <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${platform.dot.replace("bg-", "text-")}`} />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* ── Section 8: Tips for 2026 ──────────────────────────────────── */}
            <section className="mb-16 space-y-8">
              <SectionHeading id="tips-2026">טיפים ל-2026</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                העולם של AI ב-2026 שונה מהותית מ-2024. הנה מה שהשתנה ואיך להתאים את הפרומפטים שלכם.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TIPS_2026.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <GlassCard key={i} className="p-5 bg-linear-to-br from-amber-500/3 to-transparent">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-serif text-foreground text-sm mb-1">{tip.title}</h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">{tip.description}</p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </section>

            {/* ── Section 9: Common Mistakes ─────────────────────────────────── */}
            <section className="mb-16 space-y-6">
              <SectionHeading id="mistakes">טעויות נפוצות</SectionHeading>
              <p className="text-muted-foreground text-base leading-relaxed">
                הימנעות מחמש הטעויות האלה תשפר את רוב הפרומפטים שלך באופן מיידי.
              </p>
              <div className="space-y-4">
                {MISTAKES.map((mistake) => (
                  <GlassCard key={mistake.num} className="p-6">
                    <div className="flex gap-4">
                      <span className="font-mono text-xs text-amber-500/60 font-semibold shrink-0 mt-0.5">
                        {mistake.num}
                      </span>
                      <div>
                        <h3 className="font-serif text-foreground text-base mb-1">{mistake.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{mistake.description}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </section>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <section className="mt-20 mb-8">
              <GlassCard className="p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-yellow-500/5 pointer-events-none" />
                <div className="relative z-10 space-y-5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    מוכנים להתחיל?
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-foreground">
                    תרגלו את מה שלמדתם
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    פירוט הוא הכלי שמיישם בדיוק את עקרונות המדריך הזה. כתבו פרומפט, קבלו מבנה
                    מקצועי עם שאלות הכוונה, ושדרגו את התוצאות שלכם מ-AI.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      נסה את פירוט - חינם
                    </Link>
                    <Link
                      href="/examples"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border text-secondary-foreground text-sm hover:border-white/30 hover:text-foreground transition-all"
                    >
                      ספריית פרומפטים
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </GlassCard>
            </section>

            {/* Cross-links */}
            <section className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CrossLinkCard href="/prompts" title="התחילו עם תבניות מוכנות" description={`${PROMPT_LIBRARY_COUNT} פרומפטים מוכנים לשימוש מיידי`} />
              <CrossLinkCard href="/features" title="כל היכולות של המערכת" description="5 מנועי AI, תמונות, סרטונים וסוכנים" />
              <CrossLinkCard href="/pricing" title="שדרגו לתוכנית מתקדמת" description="150 קרדיטים בחודש ומודלים פרימיום" />
            </section>

          </div>
        </div>

      </div>
    </main>
    </>
  );
}

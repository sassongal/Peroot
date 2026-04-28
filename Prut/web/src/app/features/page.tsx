import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
  Sparkles,
  BookOpen,
  FolderOpen,
  Link2,
  Zap,
  ArrowLeft,
  CheckCircle2,
  Star,
  Tag,
  Network,
  Layers,
} from "lucide-react";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { FeaturesVideoEmbed } from "@/components/features/FeaturesVideoEmbed";
import { FeaturesHeroParallax } from "@/components/features/FeaturesHeroParallax";
import { MockupFloatTilt } from "@/components/features/MockupFloatTilt";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CursorSpotlight } from "@/components/ui/CursorSpotlight";
import { CtaPulse } from "@/components/ui/CtaPulse";

const _SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
const _featuresOg = `${_SITE}/api/og?title=${encodeURIComponent("כל היכולות של Peroot")}&subtitle=${encodeURIComponent("5 מנועי AI, ספרייה אישית, שרשרת פרומפטים ועוד")}&category=${encodeURIComponent("פיצ'רים")}`;

export const metadata: Metadata = {
  title: "מה עושים פה? | פירוט - Peroot",
  description:
    "הכירו את כל היכולות של פירוט: שדרוג פרומפטים, מחקר מעמיק, יצירת תמונות וסרטונים, בניית סוכני AI, ספרייה אישית, שרשרת פרומפטים ועוד. הכל בעברית.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "מה עושים פה? | כל היכולות של פירוט",
    description: "5 מנועי AI, ספרייה אישית, שרשרת פרומפטים, גרף הקשרים ועוד",
    url: `${_SITE}/features`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
    images: [{ url: _featuresOg, width: 1200, height: 630, alt: "כל היכולות של Peroot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "מה עושים פה? | כל היכולות של פירוט",
    description: "5 מנועי AI, ספרייה אישית, שרשרת פרומפטים ועוד",
    images: [_featuresOg],
  },
};

// ─── Inline Mockups ───────────────────────────────────────────────────────────

function LibraryMockup() {
  const folders = ["שיווק (12)", "קוד (8)", "תוכן (15)", "HR (6)"];
  const prompts = ["כתיבת קמפיין דיגיטלי", "ניתוח שוק מתחרים", "מייל מכירות B2B"];
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">ספרייה אישית</span>
      </div>
      <div className="flex" style={{ height: 180 }}>
        <div className="w-28 bg-secondary/60 border-l border-border p-2 shrink-0 space-y-0.5">
          {folders.map((f, i) => (
            <div
              key={f}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${i === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
            >
              <FolderOpen className="w-3 h-3 shrink-0" />
              <span className="truncate">{f}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-muted-foreground">
            <Star className="w-3 h-3 shrink-0" />
            <span>מועדפים</span>
          </div>
        </div>
        <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
          {prompts.map((p, i) => (
            <div
              key={p}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${i === 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-secondary/50"}`}
            >
              <Sparkles
                className={`w-3 h-3 shrink-0 ${i === 0 ? "text-amber-400" : "text-muted-foreground"}`}
              />
              <span
                className={`truncate ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {p}
              </span>
            </div>
          ))}
          <div className="text-muted-foreground/60 text-[10px] mt-2 px-1">+ 9 פרומפטים נוספים</div>
        </div>
      </div>
    </div>
  );
}

function ChainsMockup() {
  const steps = [
    { label: "איסוף מידע", color: "bg-sky-500/20 border-sky-500/40 text-sky-400" },
    { label: "ניתוח", color: "bg-purple-500/20 border-purple-500/40 text-purple-400" },
    { label: "כתיבה", color: "bg-amber-500/20 border-amber-500/40 text-amber-400" },
    { label: "עריכה", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" },
  ];
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">שרשרת פרומפטים</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-1 justify-center flex-wrap">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <div
                className={`px-3 py-2 rounded-lg border ${s.color} font-medium text-center min-w-[64px]`}
              >
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ArrowLeft className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-secondary p-3 space-y-1">
          <div className="text-muted-foreground text-[10px]">פלט עדכני</div>
          <div className="text-foreground">הפרומפט מזין אוטומטית את השלב הבא...</div>
          <div className="w-2/3 h-1.5 bg-amber-500/30 rounded-full mt-1">
            <div className="w-2/3 h-full bg-amber-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphMockup() {
  const nodes = [
    { x: 110, y: 90, label: "שיווק", color: "#f59e0b" },
    { x: 230, y: 60, label: "תוכן", color: "#60a5fa" },
    { x: 310, y: 130, label: "AI", color: "#a78bfa" },
    { x: 260, y: 200, label: "מוצר", color: "#34d399" },
    { x: 140, y: 210, label: "HR", color: "#f87171" },
    { x: 50, y: 160, label: "לוגו", color: "#fb923c" },
  ];
  const center = { x: 185, y: 140 };
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">גרף הקשרים</span>
      </div>
      <div className="relative" style={{ height: 220 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 220">
          {nodes.map((n) => (
            <line
              key={n.label}
              x1={center.x}
              y1={center.y}
              x2={n.x}
              y2={n.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
              strokeDasharray="3,3"
            />
          ))}
          {nodes.map((n) => (
            <g key={n.label}>
              <circle
                cx={n.x}
                cy={n.y}
                r="20"
                fill={n.color + "22"}
                stroke={n.color + "66"}
                strokeWidth="1.5"
              />
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fill={n.color}
                fontWeight="600"
              >
                {n.label}
              </text>
            </g>
          ))}
          <circle
            cx={center.x}
            cy={center.y}
            r="28"
            fill="#f59e0b22"
            stroke="#f59e0b66"
            strokeWidth="2"
          />
          <text
            x={center.x}
            y={center.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="#f59e0b"
            fontWeight="700"
          >
            פירוט
          </text>
        </svg>
      </div>
    </div>
  );
}

function VariablesMockup() {
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">משתנים דינמיים</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-border bg-secondary/50 p-3 leading-relaxed text-foreground">
          <span>כתוב </span>
          <span className="bg-sky-500/20 border border-sky-500/40 text-sky-400 px-1.5 py-0.5 rounded font-mono">
            &#123;סוג_תוכן&#125;
          </span>
          <span> על </span>
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded font-mono">
            &#123;נושא&#125;
          </span>
          <span> ל</span>
          <span className="bg-purple-500/20 border border-purple-500/40 text-purple-400 px-1.5 py-0.5 rounded font-mono">
            &#123;קהל_יעד&#125;
          </span>
        </div>
        <div className="space-y-1.5">
          {[
            { key: "סוג_תוכן", val: "פוסט לינקדאין", color: "text-sky-400" },
            { key: "נושא", val: "בינה מלאכותית ב-HR", color: "text-amber-400" },
            { key: "קהל_יעד", val: "מנהלי HR", color: "text-purple-400" },
          ].map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border"
            >
              <span className={`font-mono ${v.color} text-[10px]`}>{v.key}</span>
              <ArrowLeft className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-foreground">{v.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutoCategorizeMockup() {
  const tags = ["שיווק", "B2B", "קמפיין", "מייל"];
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">קיטלוג אוטומטי</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <div className="text-muted-foreground text-[10px] mb-1">פרומפט חדש נשמר</div>
          <div className="text-foreground font-medium">כתוב מייל מכירות לחברות SaaS...</div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <div className="text-muted-foreground text-[10px]">AI מזהה ומסווג אוטומטית...</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] mb-1.5">תגיות שזוהו:</div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium"
              >
                <Tag className="w-2.5 h-2.5" />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-500 text-[10px] flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          שמור בתיקיית שיווק
        </div>
      </div>
    </div>
  );
}

function SmartImproveMockup() {
  const suggestions = [
    { text: "הוסף קהל יעד ספציפי", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
    {
      text: "ציין את הטון הרצוי",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      text: "הוסף דוגמה ספציפית",
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];
  return (
    <div className="rounded-xl border border-border bg-background text-[11px] shadow-2xl overflow-hidden">
      <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="text-muted-foreground mr-auto text-[10px]">שיפור חכם</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="text-xs font-bold text-foreground">ציון איכות</div>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-[72%] bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" />
            </div>
            <span className="text-amber-400 font-bold text-[10px]">72</span>
          </div>
        </div>
        <div className="text-muted-foreground text-[10px] font-medium">הצעות לשיפור:</div>
        <div className="space-y-1.5">
          {suggestions.map((s) => (
            <div key={s.text} className={`flex items-start gap-2 p-2 rounded-lg border ${s.bg}`}>
              <Sparkles className={`w-3 h-3 ${s.color} mt-0.5 shrink-0`} />
              <span className={s.color}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Walkthrough Data ─────────────────────────────────────────────────────────

const WALKTHROUGH = [
  {
    icon: FolderOpen,
    num: "01",
    title: "ספרייה אישית",
    subtitle: "כל הפרומפטים שלכם, מאורגנים",
    description:
      "כל פרומפט שמשדרגים נשמר אוטומטית בספרייה האישית. ארגנו לפי תיקיות, הוסיפו מועדפים, הצמידו את הנפוצים ביותר — וחפשו בשניות. לא צריך עוד להמציא את הגלגל מחדש.",
    color: "text-sky-400",
    accent: "border-sky-500/20 bg-sky-500/5",
    bullets: ["שמירה אוטומטית", "תיקיות מותאמות אישית", "חיפוש מלא", "מועדפים ומוצמדים"],
    Mockup: LibraryMockup,
  },
  {
    icon: Link2,
    num: "02",
    title: "שרשרת פרומפטים",
    subtitle: "זרימת עבודה אוטומטית בלחיצה אחת",
    description:
      "חברו כמה פרומפטים יחד לתהליך רב-שלבי. הפלט של שלב אחד מזין אוטומטית את הבא — כך שתהליך שלקח שעה הופך לדקה אחת. מושלם לצינורות תוכן, ניתוח שוק, בניית אסטרטגיות.",
    color: "text-purple-400",
    accent: "border-purple-500/20 bg-purple-500/5",
    bullets: ["חיבור פרומפטים לרצף", "העברת פלט אוטומטית", "שמירת שרשראות", "הרצה בלחיצה"],
    Mockup: ChainsMockup,
  },
  {
    icon: Network,
    num: "03",
    title: "גרף הקשרים",
    subtitle: "ידע מחובר — לא רשימה שטוחה",
    description:
      "ספריית הפרומפטים שלכם מוצגת גם כגרף ויזואלי בסגנון Obsidian. ראו בבירור איך הפרומפטים קשורים זה לזה לפי קטגוריה, תגית, תבנית וקישורים. גלו קשרים שלא ידעתם שקיימים.",
    color: "text-emerald-400",
    accent: "border-emerald-500/20 bg-emerald-500/5",
    bullets: ["ויזואליזציה של הספרייה", "4 סוגי קשרים", "ניווט אינטראקטיבי", "גרף force-directed"],
    Mockup: GraphMockup,
  },
  {
    icon: Zap,
    num: "04",
    title: "משתנים דינמיים",
    subtitle: "פרומפט אחד, שימושים אינסופיים",
    description:
      "הגדירו משתנים בסוגריים מסולסלות {כמו_זה} בתוך הפרומפטים שלכם. בכל שימוש — מלאו את הערכים המתאימים בלי לערוך את הפרומפט מחדש. חסכו זמן, שמרו עקביות.",
    color: "text-amber-400",
    accent: "border-amber-500/20 bg-amber-500/5",
    bullets: ["{משתנים} בפרומפט", "מילוי מהיר בשימוש", "ללא עריכה חוזרת", "תבניות גמישות"],
    Mockup: VariablesMockup,
  },
  {
    icon: Tag,
    num: "05",
    title: "קיטלוג אוטומטי",
    subtitle: "AI מארגן עבורכם",
    description:
      "כשאתם שומרים פרומפט, AI מנתח את התוכן ומוסיף תגיות ותיקייה אוטומטית — בלי שתצטרכו לחשוב על ארגון. הספרייה נשארת מסודרת תמיד, גם כשגדלה למאות פרומפטים.",
    color: "text-rose-400",
    accent: "border-rose-500/20 bg-rose-500/5",
    bullets: ["קיטלוג בשמירה", "תגיות אוטומטיות", "הצעת תיקייה", "ניתן לשינוי ידני"],
    Mockup: AutoCategorizeMockup,
  },
  {
    icon: Sparkles,
    num: "06",
    title: "שיפור חכם",
    subtitle: "לא מספיק? ה-AI יציע עוד",
    description:
      "אחרי כל שדרוג, ניתן לבקש הצעות שיפור נוספות מבוססות AI — ציון איכות, נקודות חולשה, ואפשרויות לשכלול. תהליך איטרטיבי עד שהפרומפט מושלם ב-100%.",
    color: "text-indigo-400",
    accent: "border-indigo-500/20 bg-indigo-500/5",
    bullets: ["ציון איכות מיידי", "הצעות ספציפיות", "שיפור איטרטיבי", "10 ממדי הערכה"],
    Mockup: SmartImproveMockup,
  },
] as const;

// ─── Work Modes ───────────────────────────────────────────────────────────────

const WORK_MODES = [
  {
    icon: MessageSquare,
    title: "פרומפטים לטקסט",
    subtitle: "Standard",
    color: "text-sky-400",
    gradient: "from-sky-500/15 to-sky-500/5",
    border: "border-sky-500/20",
    platforms: ["ChatGPT", "Claude", "Gemini", "Copilot"],
    bullets: ["זיהוי כוונה אוטומטי", "מבנה מקצועי", "תמיכה מלאה בעברית", "משתנים דינמיים"],
  },
  {
    icon: Globe,
    title: "מחקר מעמיק",
    subtitle: "Deep Research",
    color: "text-emerald-400",
    gradient: "from-emerald-500/15 to-emerald-500/5",
    border: "border-emerald-500/20",
    platforms: ["Perplexity", "ChatGPT Deep Research", "Gemini Deep Research"],
    bullets: ["חיפוש ברשת עם מקורות", "שרשרת חשיבה", "ציטוטים ואסמכתאות", "מבנה מחקרי"],
  },
  {
    icon: Palette,
    title: "יצירת תמונות",
    subtitle: "Image Generation",
    color: "text-purple-400",
    gradient: "from-purple-500/15 to-purple-500/5",
    border: "border-purple-500/20",
    platforms: ["Midjourney", "GPT Image 2", "FLUX.2", "Stable Diffusion"],
    bullets: ["ספציפי לכל פלטפורמה", "סגנון ותאורה", "יחס תמונה", "Negative prompts"],
  },
  {
    icon: Video,
    title: "יצירת סרטונים",
    subtitle: "Video Generation",
    color: "text-rose-400",
    gradient: "from-rose-500/15 to-rose-500/5",
    border: "border-rose-500/20",
    platforms: ["Runway Gen-4", "Kling 2.0", "Sora", "Google Veo 3"],
    bullets: ["תנועות מצלמה", "פרמטרים ספציפיים", "אווירה וסגנון", "משך ורזולוציה"],
  },
  {
    icon: Bot,
    title: "בניית סוכני AI",
    subtitle: "Agent Builder",
    color: "text-amber-400",
    gradient: "from-amber-500/15 to-amber-500/5",
    border: "border-amber-500/20",
    platforms: ["Custom GPTs", "Claude Projects", "Gemini Gems"],
    bullets: ["הוראות מערכת", "הגדרת אישיות", "כללים ומגבלות", "תזרימי עבודה"],
  },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "תכונות", url: "/features" },
        ])}
      />

      {/* Global effects — fixed, render outside main */}
      <ScrollProgress />
      <CursorSpotlight />

      <main
        className="min-h-screen bg-background text-foreground selection:bg-amber-500/30"
        dir="rtl"
      >
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-serif font-bold text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              Peroot
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              חזרה לדף הבית
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-24">
          {/* ── Hero ── */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <FeaturesHeroParallax />
            <div className="relative z-10">
              <ScrollReveal fromY={24}>
                <PageHeading
                  title="מה עושים פה?"
                  subtitle="פירוט הוא כלי AI ישראלי שהופך כל רעיון גולמי לפרומפט מקצועי, שמור, מאורגן, וניתן לשימוש חוזר — בכל פלטפורמת AI שתבחרו."
                  badge="המדריך המלא"
                  badgeIcon={<Layers className="w-4 h-4" />}
                  size="large"
                  align="center"
                />
              </ScrollReveal>

              {/* Stats strip */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {[
                  { num: "5", label: "מנועי AI" },
                  { num: "15+", label: "פלטפורמות" },
                  { num: `${PROMPT_LIBRARY_COUNT}+`, label: "תבניות ספרייה" },
                  { num: "∞", label: "אפשרויות שיפור" },
                ].map((s, i) => (
                  <ScrollReveal key={s.label} delay={i * 0.08} fromY={20}>
                    <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-center">
                      <div className="text-2xl font-serif font-bold text-foreground">{s.num}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ── Storytelling Walkthrough ── */}
          <section className="space-y-6 pb-10">
            <ScrollReveal fromY={20}>
              <div className="text-center space-y-2 pb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary text-xs text-muted-foreground font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  הסיפור המלא של פירוט
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  כל מה שפירוט יכול לעשות
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  מהשמירה הראשונה ועד לפרומפט המושלם — זרימת עבודה שלמה
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-4">
              {WALKTHROUGH.map((feature, i) => {
                const Icon = feature.icon;
                const { Mockup } = feature;
                const isEven = i % 2 === 0;
                // RTL: even items → text is DOM-first = right side, mockup = left side
                // Odd items → text has order-2 = left side, mockup = right side
                const textFromX = isEven ? 60 : -60;
                const mockupFromX = isEven ? -60 : 60;

                return (
                  <ScrollReveal key={feature.num} fromY={24}>
                    <div
                      className={`rounded-2xl border ${feature.accent} p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center`}
                    >
                      {/* Text column */}
                      <ScrollReveal
                        fromX={textFromX}
                        fromY={0}
                        delay={0.12}
                        className={!isEven ? "md:order-2" : ""}
                      >
                        <div className="space-y-5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-mono font-bold ${feature.color} opacity-60`}
                            >
                              {feature.num}
                            </span>
                            <div
                              className={`w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center ${feature.color}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-foreground leading-tight">
                                {feature.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">{feature.subtitle}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                          <ul className="grid grid-cols-2 gap-2">
                            {feature.bullets.map((b) => (
                              <li
                                key={b}
                                className="flex items-center gap-2 text-xs text-foreground"
                              >
                                <CheckCircle2 className={`w-3.5 h-3.5 ${feature.color} shrink-0`} />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </ScrollReveal>

                      {/* Mockup column */}
                      <ScrollReveal
                        fromX={mockupFromX}
                        fromY={0}
                        delay={0.22}
                        className={!isEven ? "md:order-1" : ""}
                      >
                        <MockupFloatTilt>
                          <Mockup />
                        </MockupFloatTilt>
                      </ScrollReveal>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>

          {/* ── Divider ── */}
          <ScrollReveal fromY={16}>
            <div className="flex items-center gap-4 py-6">
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                <Video className="w-3.5 h-3.5" />
                פירוט בפעולה
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>
          </ScrollReveal>

          {/* ── Video Preview ── */}
          <section className="pb-16 space-y-4">
            <ScrollReveal fromY={20}>
              <div className="text-center space-y-1">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
                  ראו הכל בפעולה
                </h2>
                <p className="text-muted-foreground text-sm">סרטון קצר שמסביר הכל</p>
              </div>
            </ScrollReveal>
            <ScrollReveal fromY={32} delay={0.1} className="max-w-3xl mx-auto">
              <FeaturesVideoEmbed />
            </ScrollReveal>
          </section>

          {/* ── 5 Work Modes ── */}
          <section className="space-y-8 pb-20">
            <ScrollReveal fromY={20}>
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  5 מצבי עבודה
                </h2>
                <p className="text-muted-foreground text-sm">
                  כל מצב מייצר פרומפט מותאם בדיוק לסוג הפלטפורמה שאתם עובדים איתה
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WORK_MODES.map((m, i) => {
                const Icon = m.icon;
                return (
                  <ScrollReveal key={m.subtitle} delay={i * 0.07} fromY={24}>
                    <div
                      className={`relative group rounded-2xl border ${m.border} bg-linear-to-b ${m.gradient} p-6 transition-all hover:scale-[1.015] hover:shadow-lg hover:shadow-black/20`}
                    >
                      <div className="absolute top-4 left-4 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center ${m.color} shrink-0`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
                            <p className="text-xs text-muted-foreground">{m.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.platforms.map((p) => (
                            <span
                              key={p}
                              className="text-[11px] px-2.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        <ul className="space-y-1.5">
                          {m.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle2 className={`w-4 h-4 ${m.color} shrink-0`} />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>

          {/* ── How It Works ── */}
          <section className="pb-20 space-y-10">
            <ScrollReveal fromY={20}>
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                  איך זה עובד?
                </h2>
                <p className="text-muted-foreground text-sm">3 צעדים, פחות מ-30 שניות</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "כתבו משפט פשוט",
                  desc: "אפילו משפט אחד בעברית. לא צריך להיות מומחים.",
                  color: "text-sky-400",
                  bg: "bg-sky-500/10 border-sky-500/20",
                },
                {
                  step: "2",
                  title: "בחרו מצב עבודה",
                  desc: "טקסט, מחקר, תמונה, סרטון או סוכן — בחרו מה אתם צריכים.",
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20",
                },
                {
                  step: "3",
                  title: "קבלו פרומפט מקצועי",
                  desc: "AI מתקדם משדרג את המשפט שלכם לפרומפט חד ומדויק.",
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                },
              ].map((s, i) => (
                <ScrollReveal key={s.step} delay={i * 0.15} fromY={24}>
                  <div className={`rounded-2xl border ${s.bg} p-6 text-center`}>
                    <div
                      className={`w-10 h-10 rounded-full bg-secondary border border-border ${s.color} flex items-center justify-center text-lg font-bold mx-auto mb-4`}
                    >
                      {s.step}
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ── Cross-links ── */}
          <section className="pb-12 space-y-4">
            <ScrollReveal fromY={16}>
              <h2 className="text-lg font-serif font-bold text-foreground text-center mb-6">
                המשיכו לגלות
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  href: "/prompts",
                  title: `ספריית ${PROMPT_LIBRARY_COUNT} תבניות פרומפטים`,
                  description: "פרומפטים מוכנים לכל תחום ופלטפורמה",
                },
                {
                  href: "/examples",
                  title: "דוגמאות לפרומפטים משודרגים",
                  description: "ראו לפני ואחרי — איך Peroot משפר פרומפטים",
                },
                {
                  href: "/blog",
                  title: "טיפים נוספים בבלוג",
                  description: "מדריכים מקצועיים לכתיבת פרומפטים ו-AI",
                },
              ].map((c, i) => (
                <ScrollReveal key={c.href} delay={i * 0.08} fromY={20}>
                  <CrossLinkCard href={c.href} title={c.title} description={c.description} />
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="py-16 text-center space-y-6">
            <ScrollReveal fromY={24}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                מוכנים?
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mt-4">
                תנסו בחינם — עכשיו
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                ללא כרטיס אשראי. ללא התחייבות. 2 שדרוגים חינם כל יום.
              </p>
            </ScrollReveal>

            <ScrollReveal fromY={20} delay={0.1}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <CtaPulse>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-linear-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm transition-all hover:scale-[1.04] active:scale-[0.98] shadow-lg shadow-amber-500/25"
                  >
                    <Sparkles className="w-4 h-4" />
                    בואו ננסה!
                  </Link>
                </CtaPulse>
                <Link
                  href="/guide"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  מדריך כתיבת פרומפטים
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal fromY={12} delay={0.2}>
              <p className="text-slate-500 text-xs">
                <Link
                  href="/pricing"
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  מחירים ותוכניות &rarr;
                </Link>
              </p>
            </ScrollReveal>
          </section>
        </div>
      </main>
    </>
  );
}

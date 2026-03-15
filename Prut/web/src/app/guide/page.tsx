import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, XCircle, Lightbulb, Zap, Target, Layers, RefreshCw, ChevronRight } from "lucide-react";

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
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const TABLE_OF_CONTENTS = [
  { id: "what-is-prompt", label: "מה זה פרומפט?" },
  { id: "golden-rules", label: "5 עקרונות הזהב" },
  { id: "advanced", label: "טכניקות מתקדמות" },
  { id: "by-platform", label: "פרומפטים לפי פלטפורמה" },
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
    icon: "🧠",
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
    icon: "🎭",
    title: "Role Playing",
    subtitle: "משחק תפקידים",
    description:
      "הגדר למודל תפקיד ספציפי, ניסיון ומומחיות. כשהמודל 'מאמין' שהוא מומחה בתחום, האיכות והעומק של התשובות עולים משמעותית.",
    example: `"אתה מנכ'ל עם 20 שנות ניסיון בניהול סטארטאפים שהגיעו ל-Series B.
אתה ידוע ביכולתך לזהות בעיות מבניות בעסקים מוקדם, ולתת משוב ישיר ולא מתחשב.

אני עומד לגייס את העובד הראשון שלי לתפקיד CTO. שאל אותי 5 שאלות שיגלו אם אני מוכן לכך."`,
  },
  {
    icon: "📚",
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
    icon: "⚙️",
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

const PLATFORMS = [
  {
    name: "ChatGPT",
    color: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20",
    dot: "bg-green-400",
    tips: [
      "השתמש ב-Custom Instructions להגדרת הקשר קבוע לכל שיחה",
      "GPT-4o מעולה למולטי-מודל (תמונות + טקסט). GPT-4o-mini לטיוטות מהירות",
      "השתמש בגרסת 'o1' לבעיות לוגיות ומתמטיות מורכבות",
      "ב-Projects ניתן לשמור הנחיות מערכת קבועות ומסמכים",
    ],
  },
  {
    name: "Claude",
    color: "from-orange-500/20 to-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    tips: [
      "Claude מצטיין בטקסטים ארוכים וניתוח מעמיק של מסמכים",
      "הפורמט המרקדאון עובד מצוין ומוצג יפה בממשק",
      "Claude שומר הקשר מצוין בשיחות ארוכות, נצל את זה",
      "ב-Projects ניתן להעלות מסמכי הקשר שזמינים לכל שיחה",
    ],
  },
  {
    name: "Gemini",
    color: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    tips: [
      "Gemini Ultra מעולה לקוד ובעיות מדעיות מורכבות",
      "שולב ב-Google Workspace, נצל אינטגרציה עם Docs ו-Gmail",
      "Gemini Flash מהיר ועלות נמוכה לאפליקציות production",
      "תמיכה מצוינת בעברית, כולל ניתוח טקסטים ותרגום",
    ],
  },
  {
    name: "Midjourney / DALL-E",
    color: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20",
    dot: "bg-purple-400",
    tips: [
      "תאר סגנון, תאורה, זווית ומצלמה - לא רק את הנושא",
      "השתמש ב- aspect ratio (--ar 16:9) ו-quality flags",
      "Negative prompts: ציין מה לא לכלול בתמונה",
      "בנה מ-reference images: העלה תמונה כהשראה לסגנון",
    ],
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
      className="text-2xl md:text-3xl font-serif text-white mb-2 scroll-mt-20"
    >
      {children}
      <span className="block mt-2 h-0.5 w-14 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" />
    </h2>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl border border-white/10 bg-black/40 ${className}`}>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-[#0d0d0d] border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap text-right" dir="rtl">
      {children}
    </pre>
  );
}

function BadGoodComparison({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      <div className="border border-red-500/25 bg-red-950/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">פרומפט חלש</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{bad}</p>
      </div>
      <div className="border border-emerald-500/25 bg-emerald-950/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">פרומפט חזק</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{good}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-16">

        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-10"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לפירוט</span>
        </Link>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
            <BookOpen className="w-3.5 h-3.5" />
            המדריך המלא בעברית
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight">
            מדריך כתיבת
            <br />
            <span className="bg-gradient-to-l from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              פרומפטים מקצועיים
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            מאפס לפרומפטים שמייצרים תוצאות. כל מה שצריך לדעת על כתיבת פרומפטים
            ל-ChatGPT, Claude ו-Gemini, בעברית, בצורה ברורה ומעשית.
          </p>
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
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/15 text-slate-300 text-sm hover:border-white/30 hover:text-white transition-all"
            >
              קרא את המדריך
              <ChevronRight className="w-4 h-4 rotate-90" />
            </a>
          </div>
        </section>

        {/* ── Table of Contents ─────────────────────────────────────────── */}
        <GlassCard className="p-6 mb-14">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-4">תוכן עניינים</p>
          <nav aria-label="תוכן עניינים">
            <ol className="space-y-2">
              {TABLE_OF_CONTENTS.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="flex items-center gap-3 group text-slate-300 hover:text-amber-400 transition-colors text-sm"
                  >
                    <span className="w-5 h-5 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-slate-500 group-hover:border-amber-500/40 group-hover:text-amber-400 transition-colors shrink-0">
                      {i + 1}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </GlassCard>

        {/* ── Section 1: What is a Prompt ───────────────────────────────── */}
        <section className="mb-16 space-y-6">
          <SectionHeading id="what-is-prompt">מה זה פרומפט?</SectionHeading>
          <GlassCard className="p-6 md:p-8 space-y-4">
            <p className="text-slate-300 leading-relaxed text-base">
              פרומפט הוא ההנחיה שאתה נותן למודל AI. זה יכול להיות שאלה, בקשה, הנחיה, דוגמה, או
              שילוב של כולם. כמו שהנחיות ברורות לעובד מנוסה מובילות לתוצאות טובות יותר, פרומפט
              מנוסח היטב מוביל לתוצאות משמעותית טובות יותר ממודל AI.
            </p>
            <p className="text-slate-300 leading-relaxed text-base">
              מודלי שפה גדולים (LLMs) כמו GPT-4, Claude ו-Gemini הם כלים רבי-עוצמה, אבל הם רק
              כמה טובים כמו ההנחיות שמקבלים. אותו מודל, עם פרומפט שונה, יכול לייצר תוצאה
              גרועה או תוצאה מצוינת.
            </p>
            <div className="border-r-2 border-amber-500/60 pr-4 mt-2">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "Prompt Engineering הוא המיומנות החשובה ביותר שמנהלים, יוצרים ויזמים יכולים
                לפתח בעשור הקרוב. זה לא קוד ולא AI, זה פשוט יכולת לתקשר ביעילות עם הכלי
                החזק ביותר שנוצר."
              </p>
            </div>
          </GlassCard>
        </section>

        {/* ── Section 2: 5 Golden Rules ─────────────────────────────────── */}
        <section className="mb-16 space-y-8">
          <SectionHeading id="golden-rules">5 עקרונות הזהב</SectionHeading>
          <p className="text-slate-400 text-base leading-relaxed">
            חמשת הכללים האלה מכסים 90% ממה שצריך כדי לכתוב פרומפטים שעובדים. שלוט בהם ותראה
            שיפור מיידי בכל אינטראקציה עם AI.
          </p>
          {GOLDEN_RULES.map((rule, i) => {
            const Icon = rule.icon;
            return (
              <GlassCard key={i} className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-white">
                      {i + 1}. {rule.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{rule.subtitle}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{rule.description}</p>
                <BadGoodComparison bad={rule.bad} good={rule.good} />
              </GlassCard>
            );
          })}
        </section>

        {/* ── Section 3: Advanced Techniques ────────────────────────────── */}
        <section className="mb-16 space-y-8">
          <SectionHeading id="advanced">טכניקות מתקדמות</SectionHeading>
          <p className="text-slate-400 text-base leading-relaxed">
            אחרי שתשלוט בעקרונות הבסיסיים, הטכניקות האלה יאפשרו לך לחלץ ביצועים ברמה גבוהה
            עוד יותר ממודלי AI.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ADVANCED_TECHNIQUES.map((tech, i) => (
              <GlassCard key={i} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label={tech.subtitle}>{tech.icon}</span>
                  <div>
                    <h3 className="font-serif text-white text-base">{tech.title}</h3>
                    <p className="text-xs text-slate-500">{tech.subtitle}</p>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{tech.description}</p>
                <div>
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">דוגמה</p>
                  <CodeBlock>{tech.example}</CodeBlock>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Section 4: By Platform ─────────────────────────────────────── */}
        <section className="mb-16 space-y-8">
          <SectionHeading id="by-platform">פרומפטים לפי פלטפורמה</SectionHeading>
          <p className="text-slate-400 text-base leading-relaxed">
            לכל מודל AI יש חוזקות, מגבלות ומאפיינים ייחודיים. הכר את ההבדלים וכתב בהתאם.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLATFORMS.map((platform) => (
              <GlassCard key={platform.name} className={`p-6 bg-gradient-to-br ${platform.color}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${platform.dot}`} />
                  <h3 className="font-serif text-white text-lg">{platform.name}</h3>
                </div>
                <ul className="space-y-3">
                  {platform.tips.map((tip, j) => (
                    <li key={j} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                      <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${platform.dot.replace("bg-", "text-")}`} />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── Section 5: Common Mistakes ─────────────────────────────────── */}
        <section className="mb-16 space-y-6">
          <SectionHeading id="mistakes">טעויות נפוצות</SectionHeading>
          <p className="text-slate-400 text-base leading-relaxed">
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
                    <h3 className="font-serif text-white text-base mb-1">{mistake.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{mistake.description}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="mt-20 mb-8">
          <GlassCard className="p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 pointer-events-none" />
            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
                <Zap className="w-3.5 h-3.5" />
                מוכנים להתחיל?
              </div>
              <h2 className="text-3xl md:text-4xl font-serif text-white">
                תרגלו את מה שלמדתם
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
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
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 text-slate-300 text-sm hover:border-white/30 hover:text-white transition-all"
                >
                  ספריית פרומפטים
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </GlassCard>
        </section>

      </div>
    </div>
  );
}

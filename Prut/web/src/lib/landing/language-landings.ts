/**
 * The three language landing pages (/en, /ar, /ru): languages spec B7.
 *
 * Audience: Israel's English, Arabic and Russian speakers. The page is in
 * the visitor's language; the app itself stays Hebrew-first for now, which
 * the page says plainly. The CTA lands on the home page with the output
 * language preset (`/?lang=xx`), so the first enhancement is already in the
 * visitor's language.
 *
 * Copy rules: no em or en dashes (project law), no quota number written
 * into copy (the free-plan line is interpolated from the quota policy at
 * render time, see `freePlanLine`).
 */
import type { OutputLanguage } from "@/lib/output-language";

export type LandingLocale = "en" | "ar" | "ru";

export interface LandingContent {
  locale: LandingLocale;
  outputLanguage: OutputLanguage;
  dir: "ltr" | "rtl";
  ogLocale: string;
  /** <title> and meta description. */
  title: string;
  description: string;
  /** Hero. */
  eyebrow: string;
  heading: string;
  headingHighlight: string;
  subheading: string;
  cta: string;
  ctaSecondary: string;
  /** "Free, no card" line, given the daily allowance from the policy. */
  freePlanLine: (dailyFree: number) => string;
  hebrewUiNote: string;
  /** Three steps. */
  stepsTitle: string;
  steps: Array<{ title: string; body: string }>;
  /** What you get. */
  featuresTitle: string;
  features: Array<{ title: string; body: string }>;
  /** A before/after in the language. */
  exampleTitle: string;
  exampleBefore: string;
  exampleAfterLines: string[];
  /** FAQ, also emitted as FAQPage JSON-LD. */
  faqTitle: string;
  faq: Array<{ question: string; answer: string }>;
  /** Footer line pointing at the Hebrew site. */
  hebrewSiteLink: string;
  /** Names of the other three languages, for the language switcher. */
  switcher: { he: string; en: string; ar: string; ru: string };
}

const EN: LandingContent = {
  locale: "en",
  outputLanguage: "english",
  dir: "ltr",
  ogLocale: "en_US",
  title: "Peroot: AI prompt generator from Israel, in English",
  description:
    "Turn a rough idea into a professional, structured prompt for ChatGPT, Claude or Gemini. Built in Israel, free to start, output in English.",
  eyebrow: "Made in Israel",
  heading: "Write better prompts,",
  headingHighlight: "in English",
  subheading:
    "Type what you need in any language. Peroot rewrites it as a complete, structured prompt: role, task, context, audience, format and constraints, written in English and scored before you copy it.",
  cta: "Enhance a prompt in English",
  ctaSecondary: "See how it works",
  freePlanLine: (n) =>
    n === 1
      ? "Free: one enhancement a day, no card, no signup needed to try."
      : `Free: ${n} enhancements a day, no card, no signup needed to try.`,
  hebrewUiNote:
    "The app's buttons and menus are in Hebrew for now. Your prompts are in English, and every control has a clear icon.",
  stepsTitle: "How it works",
  steps: [
    {
      title: "Describe the task",
      body: "A sentence is enough. Write it in English, Hebrew, Arabic or Russian.",
    },
    {
      title: "Pick the output language",
      body: "English is one click, next to the mode selector. Peroot also suggests it when it sees you typing in English.",
    },
    {
      title: "Copy the result",
      body: "A full prompt with a score out of 100 and the three things that would raise it. Paste it into any AI.",
    },
  ],
  featuresTitle: "What you get",
  features: [
    {
      title: "Native English, not a translation",
      body: "The engine works from English templates and English examples, so the prompt reads like a professional wrote it.",
    },
    {
      title: "A score you can act on",
      body: "Every prompt is graded on role, task, context, format, constraints and examples, in English as well as Hebrew.",
    },
    {
      title: "Five engines",
      body: "Text, deep research, image, video and AI agents, each with its own prompt architecture.",
    },
    {
      title: "Your own library",
      body: "Save, tag and reuse prompts. Export to PDF with proper fonts for every language.",
    },
  ],
  exampleTitle: "Before and after",
  exampleBefore: "write a linkedin post about our new product for small businesses",
  exampleAfterLines: [
    "## Role and Identity",
    "You are a B2B content strategist with 10 years in SaaS, specializing in LinkedIn posts that generate leads.",
    "## The Task",
    "Write a 150-200 word LinkedIn post announcing a new product for small businesses.",
    "## Target Audience",
    "Owners of businesses with 5-50 employees, no technical background.",
    "## Guidelines and Constraints",
    "Authoritative, friendly tone. No buzzwords. One numeric example. End with a question.",
  ],
  faqTitle: "Questions",
  faq: [
    {
      question: "Is the output really in English?",
      answer:
        "Yes. Peroot uses English templates for English output and checks the result's script before showing it. If a model slips into another language, the enhancement is retried at no cost.",
    },
    {
      question: "Can I write my idea in Hebrew and get English?",
      answer:
        "Yes, and it is one of the most common ways people use Peroot: describe the task in Hebrew, choose English as the output language.",
    },
    {
      question: "Which AI tools does the prompt work with?",
      answer:
        "Any of them. ChatGPT, Claude, Gemini, Perplexity and the image and video models. The result is plain text you paste in, and there is a one-click send to the major ones.",
    },
    {
      question: "Is the interface in English?",
      answer:
        "Not yet. The app is Hebrew-first, with clear icons on every control. An English interface is planned; the prompts themselves are already fully English.",
    },
  ],
  hebrewSiteLink: "Peroot in Hebrew",
  switcher: { he: "עברית", en: "English", ar: "العربية", ru: "Русский" },
};

const AR: LandingContent = {
  locale: "ar",
  outputLanguage: "arabic",
  dir: "rtl",
  ogLocale: "ar_AR",
  title: "بيروت: مولّد برومبتات بالذكاء الاصطناعي من إسرائيل، بالعربية",
  description:
    "حوّل فكرة أولية إلى برومبت احترافي ومنظّم لـ ChatGPT أو Claude أو Gemini. مبني في إسرائيل، مجاني للبدء، والمخرجات بالعربية الفصحى.",
  eyebrow: "صُنع في إسرائيل",
  heading: "اكتب برومبتات أفضل،",
  headingHighlight: "بالعربية",
  subheading:
    "اكتب ما تحتاجه بأي لغة. بيروت يعيد صياغته كبرومبت كامل ومنظّم: الدور، المهمة، السياق، الجمهور، التنسيق والقيود، مكتوب بالعربية الفصحى ومقيّم قبل أن تنسخه.",
  cta: "حسّن برومبت بالعربية",
  ctaSecondary: "كيف يعمل",
  freePlanLine: (n) =>
    n === 1
      ? "مجاناً: تحسين واحد يومياً، بلا بطاقة، وبلا تسجيل للتجربة."
      : n === 2
        ? "مجاناً: تحسينان يومياً، بلا بطاقة، وبلا تسجيل للتجربة."
        : `مجاناً: ${n} تحسينات يومياً، بلا بطاقة، وبلا تسجيل للتجربة.`,
  hebrewUiNote:
    "أزرار التطبيق وقوائمه بالعبرية حالياً. برومبتاتك بالعربية، ولكل عنصر تحكم أيقونة واضحة.",
  stepsTitle: "كيف يعمل",
  steps: [
    {
      title: "صف المهمة",
      body: "جملة واحدة تكفي. اكتبها بالعربية أو العبرية أو الإنجليزية أو الروسية.",
    },
    {
      title: "اختر لغة المخرجات",
      body: "العربية بنقرة واحدة، بجانب اختيار الوضع. كما يقترحها بيروت تلقائياً عندما يراك تكتب بالعربية.",
    },
    {
      title: "انسخ النتيجة",
      body: "برومبت كامل مع درجة من 100 والأمور الثلاثة التي سترفعها. الصقه في أي أداة ذكاء اصطناعي.",
    },
  ],
  featuresTitle: "ماذا تحصل",
  features: [
    {
      title: "عربية فصحى أصلية، لا ترجمة",
      body: "المحرك يعمل من قوالب وأمثلة عربية، فيقرأ البرومبت كأن محترفاً كتبه، بأرقام غربية وترقيم عربي.",
    },
    {
      title: "درجة يمكنك العمل بها",
      body: "كل برومبت يُقيَّم على الدور والمهمة والسياق والتنسيق والقيود والأمثلة، بالعربية كما بالعبرية.",
    },
    {
      title: "خمسة محركات",
      body: "نص، بحث معمّق، صور، فيديو ووكلاء ذكاء اصطناعي، لكل منها بنية برومبت خاصة.",
    },
    {
      title: "مكتبتك الخاصة",
      body: "احفظ البرومبتات ووسمها وأعد استخدامها. تصدير PDF بخط عربي سليم.",
    },
  ],
  exampleTitle: "قبل وبعد",
  exampleBefore: "اكتب منشور لينكد إن عن منتجنا الجديد للشركات الصغيرة",
  exampleAfterLines: [
    "## الدور والهوية",
    "أنت استراتيجي محتوى B2B مع 10 سنوات من الخبرة في SaaS، متخصص في منشورات لينكد إن التي تولّد عملاء محتملين.",
    "## المهمة",
    "اكتب منشور لينكد إن من 150-200 كلمة يعلن عن منتج جديد للشركات الصغيرة.",
    "## الجمهور المستهدف",
    "أصحاب شركات من 5 إلى 50 موظفاً، بلا خلفية تقنية.",
    "## التعليمات والقيود",
    "نبرة حازمة وودودة. بلا كلمات رنانة. مثال رقمي واحد. اختم بسؤال.",
  ],
  faqTitle: "أسئلة شائعة",
  faq: [
    {
      question: "هل المخرجات بالعربية فعلاً؟",
      answer:
        "نعم. يستخدم بيروت قوالب عربية للمخرجات العربية ويتحقق من كتابة النتيجة قبل عرضها. إذا انزلق النموذج إلى لغة أخرى، يُعاد التحسين دون تكلفة.",
    },
    {
      question: "هل يمكنني كتابة فكرتي بالعبرية والحصول على النتيجة بالعربية؟",
      answer: "نعم. صف المهمة بأي لغة، واختر العربية كلغة للمخرجات.",
    },
    {
      question: "مع أي أدوات ذكاء اصطناعي يعمل البرومبت؟",
      answer:
        "مع جميعها: ChatGPT وClaude وGemini وPerplexity ونماذج الصور والفيديو. النتيجة نص عادي تلصقه، مع إرسال بنقرة واحدة إلى الأدوات الرئيسية.",
    },
    {
      question: "هل الواجهة بالعربية؟",
      answer:
        "ليس بعد. التطبيق بالعبرية أولاً، مع أيقونات واضحة على كل عنصر. الواجهة العربية مخطط لها؛ أما البرومبتات نفسها فهي بالعربية بالكامل منذ الآن.",
    },
  ],
  hebrewSiteLink: "بيروت بالعبرية",
  switcher: { he: "עברית", en: "English", ar: "العربية", ru: "Русский" },
};

const RU: LandingContent = {
  locale: "ru",
  outputLanguage: "russian",
  dir: "ltr",
  ogLocale: "ru_RU",
  title: "Peroot: генератор промптов с ИИ из Израиля, на русском",
  description:
    "Превратите черновую идею в профессиональный структурированный промпт для ChatGPT, Claude или Gemini. Сделано в Израиле, бесплатно для начала, результат на русском.",
  eyebrow: "Сделано в Израиле",
  heading: "Пишите промпты лучше,",
  headingHighlight: "на русском",
  subheading:
    "Опишите задачу на любом языке. Peroot перепишет её как полный структурированный промпт: роль, задача, контекст, аудитория, формат и ограничения, на русском языке и с оценкой до того, как вы его скопируете.",
  cta: "Улучшить промпт на русском",
  ctaSecondary: "Как это работает",
  freePlanLine: (n) =>
    n === 1
      ? "Бесплатно: одно улучшение в день, без карты, попробовать можно без регистрации."
      : n >= 2 && n <= 4
        ? `Бесплатно: ${n} улучшения в день, без карты, попробовать можно без регистрации.`
        : `Бесплатно: ${n} улучшений в день, без карты, попробовать можно без регистрации.`,
  hebrewUiNote:
    "Кнопки и меню приложения пока на иврите. Ваши промпты на русском, и у каждого элемента понятная иконка.",
  stepsTitle: "Как это работает",
  steps: [
    {
      title: "Опишите задачу",
      body: "Достаточно одного предложения. На русском, иврите, английском или арабском.",
    },
    {
      title: "Выберите язык результата",
      body: "Русский в один клик, рядом с выбором режима. Peroot сам предложит его, когда увидит, что вы пишете по-русски.",
    },
    {
      title: "Скопируйте результат",
      body: "Полный промпт с оценкой из 100 и тремя вещами, которые её поднимут. Вставьте в любой ИИ.",
    },
  ],
  featuresTitle: "Что вы получаете",
  features: [
    {
      title: "Живой русский, а не перевод",
      body: "Движок работает по русским шаблонам и русским примерам, поэтому промпт читается так, будто его написал профессионал.",
    },
    {
      title: "Оценка, с которой можно работать",
      body: "Каждый промпт оценивается по роли, задаче, контексту, формату, ограничениям и примерам, на русском так же, как на иврите.",
    },
    {
      title: "Пять движков",
      body: "Текст, глубокое исследование, изображения, видео и ИИ-агенты, у каждого своя архитектура промпта.",
    },
    {
      title: "Своя библиотека",
      body: "Сохраняйте, помечайте тегами и переиспользуйте промпты. Экспорт в PDF с правильным кириллическим шрифтом.",
    },
  ],
  exampleTitle: "До и после",
  exampleBefore: "напиши пост для linkedin о нашем новом продукте для малого бизнеса",
  exampleAfterLines: [
    "## Роль и идентичность",
    "Вы стратег B2B-контента с 10-летним опытом в SaaS, специализирующийся на постах в LinkedIn, которые приносят лиды.",
    "## Задача",
    "Напишите пост для LinkedIn на 150-200 слов о запуске нового продукта для малого бизнеса.",
    "## Целевая аудитория",
    "Владельцы компаний с 5-50 сотрудниками, без технического бэкграунда.",
    "## Инструкции и ограничения",
    "Уверенный, дружелюбный тон. Без модных словечек. Один числовой пример. Закончите вопросом.",
  ],
  faqTitle: "Вопросы",
  faq: [
    {
      question: "Результат действительно на русском?",
      answer:
        "Да. Для русского результата Peroot использует русские шаблоны и проверяет письменность результата перед показом. Если модель сбилась на другой язык, улучшение повторяется бесплатно.",
    },
    {
      question: "Можно написать идею на иврите и получить русский?",
      answer: "Да. Опишите задачу на любом языке и выберите русский как язык результата.",
    },
    {
      question: "С какими ИИ работает промпт?",
      answer:
        "С любыми: ChatGPT, Claude, Gemini, Perplexity, модели изображений и видео. Результат обычный текст, который вы вставляете, плюс отправка в один клик в основные инструменты.",
    },
    {
      question: "Интерфейс на русском?",
      answer:
        "Пока нет. Приложение сначала на иврите, с понятными иконками на каждом элементе. Русский интерфейс в планах; сами промпты уже полностью на русском.",
    },
  ],
  hebrewSiteLink: "Peroot на иврите",
  switcher: { he: "עברית", en: "English", ar: "العربية", ru: "Русский" },
};

export const LANDINGS: Record<LandingLocale, LandingContent> = { en: EN, ar: AR, ru: RU };

export const LANDING_LOCALES: LandingLocale[] = ["en", "ar", "ru"];

/** hreflang cluster shared by the home page and the three landings. */
export const LANGUAGE_ALTERNATES = {
  "he-IL": "/",
  en: "/en",
  ar: "/ar",
  ru: "/ru",
  "x-default": "/",
} as const;

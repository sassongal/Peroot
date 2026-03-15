export const CATEGORY_OPTIONS = [
  { id: "None", label: "ללא" },
  { id: "General", label: "כללי" },
  { id: "Marketing", label: "שיווק" },
  { id: "Sales", label: "מכירות" },
  { id: "CustomerSupport", label: "תמיכה" },
  { id: "Product", label: "מוצר" },
  { id: "Operations", label: "תפעול" },
  { id: "HR", label: "משאבי אנוש" },
  { id: "Dev", label: "פיתוח" },
  { id: "Education", label: "חינוך" },
  { id: "Legal", label: "משפטי" },
  { id: "Creative", label: "קריאייטיב" },
  { id: "Social", label: "סושיאל" },
  { id: "SEO", label: "קידום אתרים" },
  { id: "Finance", label: "פיננסים" },
  { id: "Healthcare", label: "בריאות" },
  { id: "Ecommerce", label: "אי־קומרס" },
  { id: "RealEstate", label: "נדל\"ן" },
  { id: "Strategy", label: "אסטרטגיה" },
  { id: "Design", label: "עיצוב" },
  { id: "Data", label: "דאטה" },
  { id: "Automation", label: "אוטומציה" },
  { id: "Community", label: "קהילה" },
  { id: "Nonprofit", label: "מלכ\"ר" },
  { id: "Cooking", label: "בישול" },
  { id: "Travel", label: "טיולים" },
  { id: "Sports", label: "ספורט וכושר" },
  { id: "PersonalDev", label: "פיתוח אישי" },
  { id: "Greetings", label: "ברכות ואיחולים" },
  { id: "Music", label: "מוזיקה" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  None: "ללא",
  Marketing: "שיווק",
  Sales: "מכירות",
  CustomerSupport: "תמיכה",
  Product: "מוצר",
  Operations: "תפעול",
  HR: "משאבי אנוש",
  Dev: "פיתוח",
  Education: "חינוך",
  Legal: "משפטי",
  Creative: "קריאייטיב",
  Social: "סושיאל",
  General: "כללי",
  SEO: "קידום אתרים",
  Images: "תמונות AI",
  Finance: "פיננסים",
  Healthcare: "בריאות",
  Ecommerce: "אי־קומרס",
  RealEstate: "נדל\"ן",
  Strategy: "אסטרטגיה",
  Design: "עיצוב",
  Data: "דאטה",
  Automation: "אוטומציה",
  Community: "קהילה",
  Nonprofit: "מלכ\"ר",
  Cooking: "בישול",
  Travel: "טיולים",
  Sports: "ספורט וכושר",
  PersonalDev: "פיתוח אישי",
  Greetings: "ברכות ואיחולים",
  Music: "מוזיקה",
};

/** Case-insensitive category label lookup */
export const getCategoryLabel = (key: string): string => {
  return CATEGORY_LABELS[key] ?? CATEGORY_LABELS[key.charAt(0).toUpperCase() + key.slice(1)] ?? key;
};

export const PERSONAL_DEFAULT_CATEGORY = "כללי";

export const QUICK_ACTIONS = [
  { label: "קצר יותר", instruction: "קצר יותר. שמור על המבנה והדגשים המרכזיים." },
  { label: "יותר אסרטיבי", instruction: "יותר אסרטיבי, ישיר וממוקד תוצאה." },
  { label: "יותר פרקטי", instruction: "יותר פרקטי, עם צעדים מדידים ודוגמאות קצרות." },
];

export interface PromptCollection {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon component name
  categories: string[]; // matching category IDs
  keywords?: string[]; // additional keyword filters
  color: string; // tailwind color class
}

export const PROMPT_COLLECTIONS: PromptCollection[] = [
  {
    id: "marketing-pro",
    title: "חבילת שיווק Pro",
    description: "10 פרומפטים הכי חזקים לשיווק דיגיטלי",
    icon: "TrendingUp",
    categories: ["Marketing", "Social", "SEO"],
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    id: "startup-pack",
    title: "ערכת סטארטאפ",
    description: "פרומפטים חיוניים ליזמים ובעלי עסקים",
    icon: "Rocket",
    categories: ["Strategy", "Sales", "Product"],
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    id: "content-creator",
    title: "יוצרי תוכן",
    description: "כתיבה, סושיאל, קריאייטיב וקידום",
    icon: "PenTool",
    categories: ["Creative", "Social", "SEO"],
    color: "from-pink-500/20 to-pink-500/5",
  },
  {
    id: "business-ops",
    title: "ניהול ותפעול",
    description: "HR, פיננסים, משפטי ותפעול",
    icon: "Settings",
    categories: ["Operations", "HR", "Finance", "Legal"],
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    id: "dev-data",
    title: "פיתוח ודאטה",
    description: "קוד, אוטומציה, ניתוח נתונים",
    icon: "Code",
    categories: ["Dev", "Data", "Automation"],
    color: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    id: "lifestyle",
    title: "חיים ופנאי",
    description: "פרומפטים לבישול, טיולים, ספורט ועוד",
    icon: "SparklesIcon",
    categories: ["Cooking", "Travel", "Sports", "PersonalDev", "Greetings", "Music"],
    color: "from-rose-500/10 to-transparent",
  },
];

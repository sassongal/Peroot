// Maps Hebrew URL slugs to category IDs and vice versa
export const CATEGORY_SLUG_MAP: Record<string, { id: string; labelHe: string; descriptionHe: string; emoji: string }> = {
  "שיווק": { id: "Marketing", labelHe: "פרומפטים לשיווק", descriptionHe: "פרומפטים מקצועיים לשיווק דיגיטלי, קמפיינים, מיתוג ופרסום", emoji: "📢" },
  "מכירות": { id: "Sales", labelHe: "פרומפטים למכירות", descriptionHe: "פרומפטים לשיפור תהליכי מכירה, הצעות מחיר ומשא ומתן", emoji: "💰" },
  "תמיכה": { id: "CustomerSupport", labelHe: "פרומפטים לתמיכת לקוחות", descriptionHe: "פרומפטים למענה לקוחות, פתרון בעיות ושיפור שירות", emoji: "🎧" },
  "מוצר": { id: "Product", labelHe: "פרומפטים לניהול מוצר", descriptionHe: "פרומפטים לניהול מוצר, תכנון פיצ'רים וחווית משתמש", emoji: "📦" },
  "תפעול": { id: "Operations", labelHe: "פרומפטים לתפעול", descriptionHe: "פרומפטים לייעול תהליכים, ניהול פרויקטים ולוגיסטיקה", emoji: "⚙️" },
  "משאבי-אנוש": { id: "HR", labelHe: "פרומפטים למשאבי אנוש", descriptionHe: "פרומפטים לגיוס, הדרכה, תרבות ארגונית וניהול עובדים", emoji: "👥" },
  "פיתוח": { id: "Dev", labelHe: "פרומפטים לפיתוח תוכנה", descriptionHe: "פרומפטים לכתיבת קוד, דיבוג, ארכיטקטורה ו-DevOps", emoji: "💻" },
  "חינוך": { id: "Education", labelHe: "פרומפטים לחינוך", descriptionHe: "פרומפטים למורים, סטודנטים, מבחנים ותוכניות לימוד", emoji: "📚" },
  "משפטי": { id: "Legal", labelHe: "פרומפטים למשפטים", descriptionHe: "פרומפטים לניסוח חוזים, ייעוץ משפטי ורגולציה", emoji: "⚖️" },
  "קריאייטיב": { id: "Creative", labelHe: "פרומפטים ליצירתיות", descriptionHe: "פרומפטים לכתיבה יצירתית, סיפורים, שירה ותסריטים", emoji: "🎨" },
  "סושיאל": { id: "Social", labelHe: "פרומפטים לרשתות חברתיות", descriptionHe: "פרומפטים לפוסטים, סטוריז, רילס ותוכן וויראלי", emoji: "📱" },
  "קידום-אתרים": { id: "SEO", labelHe: "פרומפטים ל-SEO", descriptionHe: "פרומפטים לקידום אורגני, מילות מפתח ותוכן ממוקד SEO", emoji: "🔍" },
  "פיננסים": { id: "Finance", labelHe: "פרומפטים לפיננסים", descriptionHe: "פרומפטים לניתוח פיננסי, תקציבים והשקעות", emoji: "📊" },
  "בריאות": { id: "Healthcare", labelHe: "פרומפטים לבריאות", descriptionHe: "פרומפטים לבריאות, רפואה ואורח חיים בריא", emoji: "🏥" },
  "אי-קומרס": { id: "Ecommerce", labelHe: "פרומפטים לאי-קומרס", descriptionHe: "פרומפטים לחנויות אונליין, תיאורי מוצרים והמרות", emoji: "🛒" },
  "נדלן": { id: "RealEstate", labelHe: "פרומפטים לנדל\"ן", descriptionHe: "פרומפטים למכירת נכסים, שיווק דירות והשכרה", emoji: "🏠" },
  "אסטרטגיה": { id: "Strategy", labelHe: "פרומפטים לאסטרטגיה", descriptionHe: "פרומפטים לתכנון אסטרטגי, ניתוח שוק ומודלים עסקיים", emoji: "🎯" },
  "עיצוב": { id: "Design", labelHe: "פרומפטים לעיצוב", descriptionHe: "פרומפטים לעיצוב גרפי, UI/UX ומיתוג ויזואלי", emoji: "🖌️" },
  "דאטה": { id: "Data", labelHe: "פרומפטים לדאטה", descriptionHe: "פרומפטים לניתוח נתונים, SQL, ויזואליזציה ו-BI", emoji: "📈" },
  "אוטומציה": { id: "Automation", labelHe: "פרומפטים לאוטומציה", descriptionHe: "פרומפטים לאוטומציה של תהליכים, סקריפטים ואינטגרציות", emoji: "🤖" },
  "קהילה": { id: "Community", labelHe: "פרומפטים לקהילה", descriptionHe: "פרומפטים לניהול קהילות, אירועים ומעורבות", emoji: "🤝" },
  "מלכר": { id: "Nonprofit", labelHe: "פרומפטים למלכ\"רים", descriptionHe: "פרומפטים לגיוס תרומות, שיווק חברתי ומגזר שלישי", emoji: "❤️" },
  "תמונות": { id: "Images", labelHe: "פרומפטים ליצירת תמונות", descriptionHe: "פרומפטים ל-Midjourney, DALL-E ו-Stable Diffusion", emoji: "🖼️" },
  "כללי": { id: "General", labelHe: "פרומפטים כלליים", descriptionHe: "פרומפטים כלליים למגוון שימושים יומיומיים", emoji: "✨" },
  "בישול": { id: "Cooking", labelHe: "פרומפטים לבישול", descriptionHe: "פרומפטים למתכונים, תכנון ארוחות וטיפים קולינריים", emoji: "👨‍🍳" },
  "טיולים": { id: "Travel", labelHe: "פרומפטים לטיולים", descriptionHe: "פרומפטים לתכנון טיולים, מסלולים וחוויות נסיעה", emoji: "✈️" },
  "ספורט-וכושר": { id: "Sports", labelHe: "פרומפטים לספורט וכושר", descriptionHe: "פרומפטים לתוכניות אימון, תזונה ואורח חיים פעיל", emoji: "🏋️" },
  "פיתוח-אישי": { id: "PersonalDev", labelHe: "פרומפטים לפיתוח אישי", descriptionHe: "פרומפטים למוטיבציה, פרודוקטיביות וצמיחה אישית", emoji: "🌱" },
  "ברכות": { id: "Greetings", labelHe: "פרומפטים לברכות ואיחולים", descriptionHe: "פרומפטים לברכות חג, יום הולדת, חתונה ואירועים", emoji: "🎉" },
  "מוזיקה": { id: "Music", labelHe: "פרומפטים למוזיקה", descriptionHe: "פרומפטים ליצירת שירים, מילים ולחנים", emoji: "🎵" },
};

// Reverse lookup: category ID to slug
export const CATEGORY_ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_MAP).map(([slug, { id }]) => [id, slug])
);

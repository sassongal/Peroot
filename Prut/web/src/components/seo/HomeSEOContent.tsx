import { FAQ_ITEMS } from "@/lib/faq-data";
import { softwareAppSchema } from "@/lib/schema";

/**
 * Server-rendered SEO content for the homepage.
 * Provides crawlable H1, definition paragraph, and FAQ HTML
 * that AI crawlers can index without JavaScript execution.
 *
 * Visually hidden with sr-only so it doesn't affect the
 * interactive client-rendered UI, but fully accessible to
 * screen readers and search crawlers.
 */
export function HomeSEOContent() {
  const topFAQs = FAQ_ITEMS.slice(0, 12);

  return (
    <>
      {/* Server-rendered SoftwareApplication schema (moved from client) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema()) }}
      />

      {/* Crawlable SEO content - visually hidden but fully accessible */}
      <div className="sr-only" aria-hidden="false">
        <h1>Peroot - מחולל פרומפטים מקצועי בעברית</h1>

        <p>
          מחולל פרומפטים בעברית הוא כלי שמשדרג רעיונות וטקסטים גולמיים לפרומפטים
          מקצועיים ומובנים למודלי שפה כמו ChatGPT, Claude ו-Gemini.
          Peroot הוא מחולל כזה: נבנה לעברית מהיסוד (לא תרגום), עם 4 מצבי עבודה,
          ספריית 480+ תבניות ודירוג איכות בזמן אמת.
          מתחילים בחינם - מזינים פרומפט, לוחצים &quot;שדרג&quot; ומקבלים תוצאה תוך שניות.
        </p>

        <section>
          <h2>מה זה מחולל פרומפטים בעברית?</h2>
          <p>
            Peroot הוא כלי AI שמשדרג כל פרומפט לרמה מקצועית.
            המערכת מנתחת את הבקשה, מזהה חולשות במבנה ובניסוח,
            ומייצרת פרומפט משופר עם הקשר מדויק ומבנה ברור.
          </p>
          <p>Peroot תומך ב-4 מצבי עבודה:</p>
          <ul>
            <li>טקסט סטנדרטי</li>
            <li>מחקר מעמיק עם מקורות</li>
            <li>יצירת תמונות (DALL-E, Midjourney)</li>
            <li>בניית סוכני AI מותאמים</li>
          </ul>
          <p>
            המערכת נבנתה לעברית מהיסוד - לא תרגום, אלא יצירה מקורית.
            יש ספריית 480+ תבניות, דירוג איכות בזמן אמת ומשתנים חכמים למילוי בקליק.
          </p>

          <h3>למי מתאים מחולל הפרומפטים של Peroot?</h3>
          <p>
            מחולל הפרומפטים מתאים למשווקים, מפתחים, יוצרי תוכן, מורים, מנהלי מוצר
            ולכל מי שעובד עם ChatGPT, Claude או Gemini ורוצה פרומפטים ברורים ומובנים בעברית.
          </p>

          <h3>למה Peroot שונה מכלים אחרים?</h3>
          <ul>
            <li>עברית מקורית - לא תרגום ממחולל באנגלית</li>
            <li>4 מצבי עבודה: טקסט, מחקר מעמיק, תמונות וסוכני AI</li>
            <li>מעל 480 תבניות מוכנות ב-30+ קטגוריות</li>
            <li>דירוג איכות בזמן אמת ושאלות הבהרה לדיוק</li>
            <li>חינם להתחלה, עם אפשרות ל<a href="/pricing">שדרוג</a></li>
          </ul>
        </section>

        <section>
          <h2>איך Peroot עובד?</h2>
          <h3>שלב 1: הזנת פרומפט או רעיון</h3>
          <p>כתבו פרומפט או רעיון בעברית בתיבת הקלט.</p>
          <h3>שלב 2: בחירת מצב עבודה</h3>
          <p>בחרו קטגוריה ומצב עבודה (טקסט, מחקר, תמונות או סוכנים).</p>
          <h3>שלב 3: שדרוג אוטומטי</h3>
          <p>לחצו על &quot;שדרג&quot; והמערכת תייצר פרומפט מקצועי ומובנה.</p>
          <h3>שלב 4: דיוק עם שאלות הבהרה</h3>
          <p>ענו על שאלות הבהרה (אם יש) כדי לדייק את התוצאה.</p>
          <h3>שלב 5: שמירה ושימוש</h3>
          <p>העתיקו, שמרו לספריה האישית, או המשיכו לשפר.</p>
        </section>

        <section>
          <h2>תכונות עיקריות של מחולל הפרומפטים</h2>
          <h3>שדרוג אוטומטי ושאלות הבהרה</h3>
          <ul>
            <li>שדרוג פרומפטים בעברית לרמה מקצועית עם AI</li>
            <li>מדד חוזק פרומפט בזמן אמת</li>
            <li>שאלות הבהרה חכמות לדיוק התוצאה</li>
          </ul>
          <h3>ספריית תבניות וספריה אישית</h3>
          <ul>
            <li><a href="/prompts">ספריית פרומפטים ציבורית</a> עם 480+ תבניות מוכנות</li>
            <li>ספריה אישית עם מועדפים וקטגוריות</li>
            <li>משתנים חכמים עם סוגריים מסולסלים למילוי בקליק</li>
          </ul>
          <p>תמיכה מלאה בעברית ו-RTL. <a href="/features">לכל התכונות</a>.</p>
        </section>

        <section>
          <h2>שאלות נפוצות על מחולל פרומפטים בעברית</h2>
          {topFAQs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}

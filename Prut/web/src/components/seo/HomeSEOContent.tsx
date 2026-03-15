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

        <section>
          <h2>מה זה Peroot?</h2>
          <p>
            Peroot הוא כלי AI מתקדם שמשדרג כל פרומפט שאתם כותבים לרמה מקצועית.
            המערכת מנתחת את הבקשה שלכם, מזהה חולשות במבנה ובניסוח,
            ומייצרת פרומפט משופר עם הקשר מדויק, מבנה ברור ושאלות הכוונה חכמות.
            Peroot תומך ב-4 מצבי עבודה: יצירת טקסט סטנדרטי, מחקר מעמיק עם מקורות,
            יצירת פרומפטים לתמונות עם DALL-E ו-Midjourney, ובניית סוכני AI מותאמים.
            בניגוד לכלים אחרים, Peroot נבנה מהיסוד עבור השפה העברית -
            לא תרגום אלא יצירה מקורית שמבינה את הניואנסים של השפה.
            המערכת כוללת ספריית פרומפטים עם מעל 480 תבניות מוכנות,
            דירוג איכות בזמן אמת, ומשתנים חכמים למילוי בקליק.
            Peroot מתאים למשווקים, מפתחים, יוצרי תוכן, מורים ולכל מי שעובד עם מודלי AI.
          </p>
        </section>

        <section>
          <h2>איך Peroot עובד?</h2>
          <ol>
            <li>כתבו פרומפט או רעיון בעברית בתיבת הקלט</li>
            <li>בחרו קטגוריה ומצב עבודה (טקסט, מחקר, תמונות או סוכנים)</li>
            <li>לחצו על &quot;שדרג&quot; והמערכת תייצר פרומפט מקצועי ומובנה</li>
            <li>ענו על שאלות הבהרה (אם יש) כדי לדייק את התוצאה</li>
            <li>העתיקו, שמרו לספריה האישית, או המשיכו לשפר</li>
          </ol>
        </section>

        <section>
          <h2>תכונות עיקריות</h2>
          <ul>
            <li>שדרוג אוטומטי של פרומפטים עם AI מתקדם</li>
            <li>4 מצבי עבודה: סטנדרטי, מחקר מעמיק, יצירת תמונות, בניית סוכנים</li>
            <li>מדד חוזק פרומפט בזמן אמת</li>
            <li>ספריית פרומפטים ציבורית עם 480+ תבניות מוכנות</li>
            <li>ספריה אישית עם מועדפים וקטגוריות</li>
            <li>משתנים חכמים עם סוגריים מסולסלים למילוי בקליק</li>
            <li>שאלות הבהרה חכמות לדיוק התוצאה</li>
            <li>תמיכה מלאה בעברית ו-RTL</li>
          </ul>
        </section>

        <section>
          <h2>שאלות נפוצות על Peroot</h2>
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

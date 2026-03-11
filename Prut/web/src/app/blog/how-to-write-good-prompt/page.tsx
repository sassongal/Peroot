import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "איך לכתוב פרומפט טוב — המדריך המלא",
  description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.",
  alternates: { canonical: "/blog/how-to-write-good-prompt" },
  openGraph: {
    title: "איך לכתוב פרומפט טוב — המדריך המלא | Peroot",
    description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.",
    url: "/blog/how-to-write-good-prompt",
    siteName: "Peroot",
    locale: "he_IL",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "איך לכתוב פרומפט טוב — המדריך המלא | Peroot",
    description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי.",
  },
};

export default function HowToWriteGoodPrompt() {
  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8" dir="rtl">
      <article className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לבלוג</span>
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">מדריכים</span>
            <span className="text-[10px] text-slate-500">10 מרץ 2026</span>
            <span className="text-[10px] text-slate-600">12 דקות קריאה</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 leading-tight">
            איך לכתוב פרומפט טוב — המדריך המלא
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            רוב האנשים כותבים פרומפטים כמו הודעת טקסט — קצר, עמום, בלי הקשר. התוצאה? תשובות גנריות שלא באמת עוזרות. הנה 5 עקרונות שישנו את זה לגמרי, עם דוגמאות מעשיות לפני ואחרי.
          </p>
        </header>

        <div className="prose prose-invert prose-amber max-w-none space-y-8">

          {/* Stats Grid */}
          <div className="article-stats-grid">
            <div className="article-stat-box">
              <div className="article-stat-number">73%</div>
              <div className="article-stat-label">מהמשתמשים מקבלים תוצאות גנריות בגלל פרומפטים חלשים</div>
            </div>
            <div className="article-stat-box">
              <div className="article-stat-number">x4</div>
              <div className="article-stat-label">שיפור באיכות התוצאה עם פרומפט מובנה לעומת משפט חופשי</div>
            </div>
            <div className="article-stat-box">
              <div className="article-stat-number">30 שנ׳</div>
              <div className="article-stat-label">הזמן הממוצע שלוקח ללמוד לכתוב פרומפט מקצועי</div>
            </div>
          </div>

          {/* Editorial Voice */}
          <p className="article-editorial-voice">
            כתיבת פרומפטים היא לא כישרון — זה <strong>מיומנות</strong>. כמו כל מיומנות, אפשר ללמוד אותה, לתרגל אותה, ולהשתפר בה. ההבדל בין מי שמקבל תוצאות מדהימות מ-AI לבין מי שמתאכזב שוב ושוב הוא לרוב לא הכלי — אלא <strong>הדרך שבה הוא מדבר עם הכלי</strong>. במדריך הזה נלמד בדיוק איך לעבור מפרומפטים בסיסיים לפרומפטים שמייצרים תוצאות ברמה מקצועית.
          </p>

          <div className="article-divider" />

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. תנו תפקיד — אל תדברו לרובוט</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              הדבר הראשון שמשנה את איכות התשובה הוא לתת למודל <strong className="text-amber-200">זהות מקצועית</strong>. כשאתם אומרים למודל מי הוא, אתם למעשה מכוונים אותו למאגר הידע הרלוונטי ולרמת הדיוק שאתם מצפים לה. זה כמו ההבדל בין לשאול אדם אקראי ברחוב שאלה רפואית לבין לשאול רופא. שניהם יענו — אבל התשובות יהיו שונות לחלוטין.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              כשאתם מציינים תפקיד, ציינו גם רמת ניסיון ותחום התמחות ספציפי. &quot;אתה מומחה שיווק&quot; זה טוב, אבל &quot;אתה מנהל שיווק דיגיטלי עם 10 שנות ניסיון בחברות SaaS בשוק הישראלי&quot; — זה הרבה יותר טוב. ככל שהתפקיד מפורט יותר, התשובה תהיה ממוקדת ומקצועית יותר.
            </p>

            <div className="article-before-after">
              <div className="article-before-box">
                <h4>לפני — פרומפט חלש</h4>
                <p>כתוב לי מייל שיווקי</p>
              </div>
              <div className="article-after-box">
                <h4>אחרי — פרומפט חזק</h4>
                <p>אתה מומחה שיווק דיגיטלי עם 10 שנות ניסיון בחברות SaaS. כתוב מייל שיווקי להשקת אפליקציה חדשה לניהול משימות, מיועד למנהלי פרויקטים בחברות טכנולוגיה. הטון: מקצועי אבל חם, עם דגש על חיסכון בזמן.</p>
              </div>
            </div>

            <div className="article-callout-tip">
              <div className="article-callout-title">טיפ מקצועי</div>
              <p>
                אפשר לתת למודל כמה תפקידים מורכבים — למשל: &quot;אתה קופירייטר שגם מבין UX&quot;. זה יוצר תשובות שמשלבות כמה נקודות מבט ומייצרות תוכן עשיר יותר.
              </p>
            </div>
          </section>

          <div className="article-divider" />

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. היו ספציפיים — &quot;מה בדיוק&quot; ולא &quot;משהו&quot;</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              ככל שאתם יותר מדויקים, התוצאה יותר טובה. ציינו: <strong className="text-amber-200">למי</strong> זה מיועד, <strong className="text-amber-200">מה</strong> המטרה, <strong className="text-amber-200">באיזה פורמט</strong> אתם רוצים את הפלט, ו<strong className="text-amber-200">מה לא לכלול</strong>. חשבו על זה ככה: אם הייתם נותנים את אותו הבריף לעובד חדש — האם הוא היה יודע בדיוק מה לעשות? אם התשובה היא לא, הפרומפט שלכם לא מספיק ספציפי.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              המודל לא קורא מחשבות. אם לא אמרתם שאתם רוצים רשימה עם נקודות — תקבלו פסקה. אם לא אמרתם &quot;בעברית&quot; — יכול להיות שתקבלו באנגלית. אם לא ציינתם את קהל היעד — התשובה תהיה כללית מדי. כל פרט שאתם מוסיפים מכוון את המודל להבין טוב יותר מה אתם צריכים.
            </p>

            <div className="article-before-after">
              <div className="article-before-box">
                <h4>לפני — עמום</h4>
                <p>תכתוב לי משהו על שיווק</p>
              </div>
              <div className="article-after-box">
                <h4>אחרי — ספציפי</h4>
                <p>כתוב פוסט לינקדאין בעברית, 150-200 מילים, על 3 טעויות נפוצות בשיווק דיגיטלי לסטארטאפים בשלב ה-Seed. הטון: מקצועי אך נגיש, עם אימוג׳י אחד בתחילת כל נקודה. סיים בשאלה פתוחה לקהל.</p>
              </div>
            </div>

            <div className="article-callout-warning">
              <div className="article-callout-title">טעות נפוצה</div>
              <p>
                אל תניחו שהמודל &quot;יבין&quot; מה התכוונתם. גם אם נראה לכם שזה ברור — כתבו את זה במפורש. עדיף להיות יתר על המידה ספציפיים מאשר לקבל תוצאה לא רלוונטית ולהתחיל מחדש.
              </p>
            </div>
          </section>

          <div className="article-divider" />

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. תנו פורמט — אמרו איך צריך להיראות</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              אחד הטריקים הכי פשוטים ואפקטיביים: ציינו בדיוק איך אתם רוצים שהפלט ייראה. כמה מילים? טבלה או רשימה? כותרות? קוד? פסקאות קצרות או ארוכות? הגדרת הפורמט מראש חוסכת לכם סבבי תיקונים מיותרים ומבטיחה שהפלט מוכן לשימוש מיידי.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              אתם יכולים גם לתת &quot;תבנית&quot; (template) — כלומר, להראות למודל את המבנה המדויק שאתם מצפים לו. למשל: &quot;כל פריט ברשימה צריך לכלול: כותרת (עד 5 מילים), תיאור (משפט אחד), דוגמה מעשית&quot;. ככה המודל מבין בדיוק מה נדרש.
            </p>

            <div className="article-before-after">
              <div className="article-before-box">
                <h4>לפני — בלי פורמט</h4>
                <p>תציע כותרות לבלוג</p>
              </div>
              <div className="article-after-box">
                <h4>אחרי — עם פורמט מדויק</h4>
                <p>כתוב 5 כותרות לבלוג בעברית, כל אחת עד 60 תווים. הפורמט: מספור + כותרת + שורת הסבר אחת למה הכותרת עובדת. הנושא: פרודוקטיביות לפרילנסרים.</p>
              </div>
            </div>

            <div className="article-callout-example">
              <div className="article-callout-title">דוגמה לתבנית מתקדמת</div>
              <p>
                &quot;כתוב תוכנית תוכן שבועית. לכל יום ציין: [פלטפורמה] | [סוג תוכן] | [נושא] | [CTA]. הפלט בטבלה, 5 ימי עבודה.&quot; — ככה תקבלו תוכנית מסודרת ומוכנה לשימוש.
              </p>
            </div>
          </section>

          <div className="article-divider" />

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. השתמשו במגבלות — &quot;אל תעשה&quot; חשוב כמו &quot;עשה&quot;</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              מגבלות שליליות (Negative Constraints) הן כלי חזק שרוב המשתמשים מתעלמים ממנו. אמרו למודל מה <strong className="text-amber-200">לא</strong> לכלול: &quot;אל תשתמש בקלישאות&quot;, &quot;הימנע ממשפטי פתיחה גנריים כמו &#39;בעולם של היום&#39;&quot;, &quot;לא יותר מ-200 מילים&quot;. מגבלות יוצרות מרחב מוגדר שבו המודל עובד, וזה משפר את הדיוק דרמטית.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              חשבו על מגבלות כמו על גדרות בכביש. בלעדיהן, המודל יכול לסטות לכל כיוון. עם מגבלות ברורות, הוא נשאר במסלול ומגיע ליעד שאתם רוצים. זה עובד במיוחד טוב לתוכן שיווקי, שבו טון ואורך הם קריטיים.
            </p>

            <div className="article-before-after">
              <div className="article-before-box">
                <h4>לפני — בלי מגבלות</h4>
                <p>כתוב תיאור מוצר לאפליקציה שלנו</p>
              </div>
              <div className="article-after-box">
                <h4>אחרי — עם מגבלות ברורות</h4>
                <p>כתוב תיאור מוצר לאפליקציית ניהול משימות. עד 100 מילים. אל תשתמש במילים: &quot;מהפכני&quot;, &quot;חכם&quot;, &quot;פשוט&quot;. הימנע מקלישאות. דבר בגוף שני. התמקד בחיסכון בזמן ולא בפיצ׳רים.</p>
              </div>
            </div>

            {/* Pros/Cons */}
            <div className="article-pros-cons-container">
              <div className="article-pros-box">
                <h4>מגבלות שעובדות</h4>
                <ul>
                  <li>הגבלת אורך (מילים/תווים/משפטים)</li>
                  <li>רשימת מילים/ביטויים לא לשימוש</li>
                  <li>הגדרת טון (לא פורמלי מדי, לא casual מדי)</li>
                  <li>ציון קהל יעד (לא טכני, לא ילדים)</li>
                </ul>
              </div>
              <div className="article-cons-box">
                <h4>מגבלות פחות אפקטיביות</h4>
                <ul>
                  <li>&quot;תהיה יצירתי&quot; — עמום מדי</li>
                  <li>&quot;אל תהיה משעמם&quot; — לא מדיד</li>
                  <li>&quot;כתוב טוב&quot; — חסר הגדרה</li>
                  <li>יותר מדי מגבלות סותרות — מבלבל</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="article-divider" />

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">5. תנו דוגמה — הראו מה אתם רוצים</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Few-shot prompting — לתת למודל דוגמה אחת או שתיים של הפלט הרצוי — משפר דרמטית את התוצאות. זה עובד במיוחד טוב כשאתם רוצים טון ספציפי, מבנה מסוים, או סגנון כתיבה שקשה לתאר במילים. במקום להסביר מה אתם רוצים, פשוט הראו.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              זה כמו להראות לנגר תמונה של השולחן שאתם רוצים במקום לתאר אותו. המודל &quot;מבין&quot; מדוגמאות הרבה יותר מהר מהסברים מילוליים. דוגמה אחת טובה שווה עשר משפטי הנחיה.
            </p>

            <div className="article-before-after">
              <div className="article-before-box">
                <h4>לפני — בלי דוגמה</h4>
                <p>כתוב ביקורות מוצר בסגנון קליל</p>
              </div>
              <div className="article-after-box">
                <h4>אחרי — עם דוגמה</h4>
                <p>כתוב 3 ביקורות קצרות על אוזניות אלחוטיות. סגנון הביקורת:<br/>דוגמה: &quot;שלושה חודשים עם ה-AirPods Pro. הביטול רעשים? קסם. הסוללה? מחזיקה יום שלם. החיסרון היחיד — המחיר. 4.5/5&quot;<br/>כתוב 3 ביקורות באותו סגנון — קצר, ישיר, עם ציון בסוף.</p>
              </div>
            </div>

            <div className="article-callout-important">
              <div className="article-callout-title">חשוב לזכור</div>
              <p>
                הדוגמאות שאתם נותנים מגדירות את הרף. אם תיתנו דוגמה בינונית, התוצאה תהיה בינונית. תמיד תנו דוגמה שמייצגת את הרמה שאתם באמת רוצים לקבל.
              </p>
            </div>
          </section>

          <div className="article-divider" />

          {/* Comparison Table */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-4">סיכום: ההבדלים בין פרומפט חלש לחזק</h2>
            <table className="article-table-comparison">
              <thead>
                <tr>
                  <th>מאפיין</th>
                  <th>פרומפט חלש</th>
                  <th>פרומפט חזק</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>תפקיד</td>
                  <td>לא מוגדר</td>
                  <td>מפורט עם ניסיון ותחום</td>
                </tr>
                <tr>
                  <td>ספציפיות</td>
                  <td>&quot;כתוב משהו על X&quot;</td>
                  <td>קהל, מטרה, פורמט, אורך</td>
                </tr>
                <tr>
                  <td>פורמט</td>
                  <td>לא מצוין</td>
                  <td>תבנית ברורה</td>
                </tr>
                <tr>
                  <td>מגבלות</td>
                  <td>אין</td>
                  <td>מילים, אורך, טון</td>
                </tr>
                <tr>
                  <td>דוגמאות</td>
                  <td>אין</td>
                  <td>1-2 דוגמאות של פלט רצוי</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="article-divider" />

          {/* Steps Summary */}
          <section>
            <h2 className="text-2xl font-serif text-white mb-6">5 הצעדים לפרומפט מושלם</h2>
            <div className="article-steps-container">
              <div className="article-step">
                <div className="article-step-number">1</div>
                <div>
                  <div className="article-step-title">הגדירו תפקיד</div>
                  <div className="article-step-description">תנו למודל זהות מקצועית עם ניסיון ותחום התמחות ספציפי.</div>
                </div>
              </div>
              <div className="article-step">
                <div className="article-step-number">2</div>
                <div>
                  <div className="article-step-title">היו ספציפיים</div>
                  <div className="article-step-description">ציינו קהל יעד, מטרה, שפה, ותנו כמה שיותר הקשר.</div>
                </div>
              </div>
              <div className="article-step">
                <div className="article-step-number">3</div>
                <div>
                  <div className="article-step-title">הגדירו פורמט</div>
                  <div className="article-step-description">אורך, מבנה, כותרות, רשימות — הכל צריך להיות מוגדר מראש.</div>
                </div>
              </div>
              <div className="article-step">
                <div className="article-step-number">4</div>
                <div>
                  <div className="article-step-title">הוסיפו מגבלות</div>
                  <div className="article-step-description">מה לא לכלול, באיזה טון לא להשתמש, ומהו האורך המקסימלי.</div>
                </div>
              </div>
              <div className="article-step">
                <div className="article-step-number">5</div>
                <div>
                  <div className="article-step-title">תנו דוגמה</div>
                  <div className="article-step-description">דוגמה אחת טובה של הפלט הרצוי שווה אלף מילות הסבר.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Brand Quote */}
          <blockquote className="article-quote-brand">
            <p>
              &quot;הפרומפט הטוב ביותר הוא לא זה שכותבים הכי מהר — אלא זה שחוסך את הסבבים הבאים. השקיעו 30 שניות נוספות בניסוח, וחסכו 30 דקות של תיקונים.&quot;
            </p>
            <cite>— הפילוסופיה של Peroot</cite>
          </blockquote>

          {/* Highlight Box */}
          <div className="article-highlight-box">
            <p>
              <strong>נקודת מפתח:</strong> אתם לא צריכים להיות מומחי AI כדי לקבל תוצאות מצוינות. אתם צריכים להיות ברורים, ספציפיים, ולדעת מה אתם רוצים. 5 העקרונות שלמדנו כאן עובדים עם כל מודל AI — ChatGPT, Claude, Gemini, ועוד. הם לא תלויים בטכנולוגיה, אלא בתקשורת טובה.
            </p>
          </div>

          {/* CTA Box */}
          <div className="article-cta-box">
            <h3>רוצים לדלג על כל זה?</h3>
            <p>
              Peroot עושה את כל העבודה בשבילכם. כתבו את הרעיון שלכם בעברית פשוטה — והמערכת תבנה פרומפט מקצועי עם כל 5 העקרונות האלה אוטומטית. בלי ללמוד, בלי לתרגל, בלי לזכור כללים. פשוט תוצאות.
            </p>
            <Link href="/" className="article-cta-button">
              נסו את Peroot בחינם
            </Link>
          </div>

        </div>
      </article>
    </div>
  );
}

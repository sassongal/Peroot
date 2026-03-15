const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://peroot.space';

interface OnboardingStep {
  id: string;
  delayHours: number;
  subject: string;
  html: (name: string, unsubscribeUrl: string) => string;
}

function emailWrapper(content: string, unsubscribeUrl: string): string {
  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.7;">
      ${content}
      <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8;">
          נשלח מ-Peroot · <a href="${unsubscribeUrl}" style="color: #94a3b8;">הסרה מרשימת התפוצה</a>
        </p>
      </div>
    </div>
  `;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'onboarding_day1',
    delayHours: 24,
    subject: 'טיפ מהיר: איך להפיק יותר מ-Peroot',
    html: (name, unsubscribeUrl) => emailWrapper(`
      <h2 style="color: #f59e0b; font-size: 22px;">היי ${name} 👋</h2>
      <p>מקווים שנהנית מהשימוש הראשון ב-Peroot! הנה טיפ שיעזור לך לקבל תוצאות טובות יותר:</p>

      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">💡 טיפ: ככל שהקלט שלך מפורט יותר, התוצאה טובה יותר</p>
        <p style="margin: 0; font-size: 14px;">במקום "כתוב מייל", נסו "כתוב מייל שיווקי לבעלי עסקים קטנים שמציע הנחה של 20% על שירות SEO"</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}" style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">נסו עכשיו</a>
      </div>
    `, unsubscribeUrl),
  },
  {
    id: 'onboarding_day3',
    delayHours: 72,
    subject: 'הכרת ספריה אישית + שרשראות פרומפטים',
    html: (name, unsubscribeUrl) => emailWrapper(`
      <h2 style="color: #f59e0b; font-size: 22px;">מה עוד אפשר לעשות ב-Peroot?</h2>
      <p>היי ${name}, יש לנו עוד כלים שיכולים לעזור לך:</p>

      <div style="margin: 20px 0;">
        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
          <strong>📚 ספריה אישית</strong>
          <p style="margin: 8px 0 0; font-size: 14px;">שמרו את הפרומפטים הכי טובים שלכם, ארגנו בקטגוריות, ושתפו עם הצוות.</p>
        </div>
        <div style="background: #eff6ff; border-radius: 12px; padding: 16px;">
          <strong>🔗 שרשראות פרומפטים</strong>
          <p style="margin: 8px 0 0; font-size: 14px;">חברו מספר פרומפטים לזרימת עבודה אוטומטית — הפלט של אחד הופך לקלט של הבא.</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}" style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">גלו את כל הכלים</a>
      </div>
    `, unsubscribeUrl),
  },
  {
    id: 'onboarding_day7',
    delayHours: 168,
    subject: 'הזמינו חברים וקבלו קרדיטים בחינם',
    html: (name, unsubscribeUrl) => emailWrapper(`
      <h2 style="color: #f59e0b; font-size: 22px;">רוצים עוד קרדיטים? 🎁</h2>
      <p>היי ${name}, ידעתם שאפשר לקבל קרדיטים בחינם?</p>

      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 8px 0;">הזמינו חבר → שניכם מקבלים 5 קרדיטים</p>
        <p style="font-size: 14px; margin: 0;">היכנסו להגדרות → הפניות כדי לקבל את קוד ההפניה שלכם</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}/settings" style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">לקוד ההפניה שלי</a>
      </div>
    `, unsubscribeUrl),
  },
  {
    id: 'onboarding_day14',
    delayHours: 336,
    subject: 'איך אנחנו יכולים להשתפר? 📝',
    html: (name, unsubscribeUrl) => emailWrapper(`
      <h2 style="color: #f59e0b; font-size: 22px;">רגע של פידבק? 🙏</h2>
      <p>היי ${name}, עברו שבועיים מאז שהצטרפתם ל-Peroot ונשמח לשמוע מכם:</p>

      <ul style="padding-right: 20px;">
        <li style="margin-bottom: 8px;">מה הכי עוזר לכם?</li>
        <li style="margin-bottom: 8px;">מה חסר?</li>
        <li style="margin-bottom: 8px;">האם תמליצו עלינו לחבר?</li>
      </ul>

      <p>פשוט תשיבו על המייל הזה — אנחנו קוראים כל תשובה.</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="mailto:contact@peroot.space?subject=פידבק על Peroot" style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">שלחו פידבק</a>
      </div>
    `, unsubscribeUrl),
  },
];

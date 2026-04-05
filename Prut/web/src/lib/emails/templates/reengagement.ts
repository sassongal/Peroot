import { escapeHtml, emailLayout } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.peroot.space';

export interface ReengagementTemplate {
  id: string;
  inactiveDays: number;
  subject: string;
  html: (name: string, unsubscribeUrl: string) => string;
}

export const REENGAGEMENT_TEMPLATES: ReengagementTemplate[] = [
  {
    id: 'inactive_7d',
    inactiveDays: 7,
    subject: 'חסר לנו! יש פרומפטים שמחכים לך',
    html: (name, unsubscribeUrl) => emailLayout(`
      <h2 style="color: #3b82f6; font-size: 22px;">היי ${escapeHtml(name)}</h2>
      <p>שמנו לב שלא ביקרת אצלנו בשבוע האחרון. המערכת שלנו המשיכה להשתפר בינתיים!</p>

      <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">מה חדש ב-Peroot:</p>
        <ul style="margin: 0; padding: 0 20px; font-size: 14px;">
          <li>שדרוגי מנוע AI לתוצאות מדויקות יותר</li>
          <li>תמיכה בצירוף קבצים, קישורים ותמונות</li>
          <li>מצבי עבודה חדשים</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}" style="background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">חזרו ליצור</a>
      </div>
    `, unsubscribeUrl),
  },
  {
    id: 'inactive_14d',
    inactiveDays: 14,
    subject: 'הפרומפטים שלך מחכים לך + בונוס קרדיטים',
    html: (name, unsubscribeUrl) => emailLayout(`
      <h2 style="color: #f59e0b; font-size: 22px;">היי ${escapeHtml(name)}</h2>
      <p>עברו שבועיים מאז ביקרת ב-Peroot. הספריה האישית שלך עדיין שומרת את כל הפרומפטים שיצרת.</p>

      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">מתנה קטנה ממנו:</p>
        <p style="margin: 0; font-size: 14px;">חזרו היום וקבלו קרדיטים נוספים על הבית. הקרדיטים שלכם מתחדשים כל יום!</p>
      </div>

      <p>זכרו: Peroot עוזר לכם ליצור פרומפטים מקצועיים שעובדים טוב יותר עם כל כלי AI.</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}" style="background: #f59e0b; color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">חזרו עכשיו</a>
      </div>
    `, unsubscribeUrl),
  },
  {
    id: 'inactive_30d',
    inactiveDays: 30,
    subject: 'נשמח לדעת מה חסר לך',
    html: (name, unsubscribeUrl) => emailLayout(`
      <h2 style="color: #8b5cf6; font-size: 22px;">היי ${escapeHtml(name)}</h2>
      <p>עבר חודש מאז שהשתמשת ב-Peroot. נשמח לדעת איך נוכל להיות שימושיים יותר בשבילך.</p>

      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">נשמח לשמוע ממך:</p>
        <ul style="margin: 0; padding: 0 20px; font-size: 14px;">
          <li>מה היית רוצה שנשפר?</li>
          <li>איזה פיצ'ר חסר לך?</li>
          <li>האם יש משהו שמפריע?</li>
        </ul>
      </div>

      <p>פשוט הגיבו למייל הזה ונחזור אליכם בהקדם.</p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}" style="background: #8b5cf6; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">חזרו ל-Peroot</a>
      </div>
    `, unsubscribeUrl),
  },
];

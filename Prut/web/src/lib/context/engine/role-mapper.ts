import type { DocumentType } from './types';

interface ExpertRole {
  role: string;
  tone: string;
  focusAreas: string[];
}

export const DOCUMENT_TYPE_TO_ROLE: Record<string, ExpertRole> = {
  'חוזה משפטי':   { role: 'יועץ משפטי בכיר',       tone: 'פורמלי, זהיר, מדויק',        focusAreas: ['סעיפי סיכון', 'חובות וזכויות', 'תנאי סיום'] },
  'מאמר אקדמי':  { role: 'חוקר בתחום התוכן',        tone: 'ניתוחי, מתודי, מבוסס ראיות',  focusAreas: ['תזה מרכזית', 'ממצאים', 'מגבלות מתודולוגיות'] },
  'דף שיווקי':    { role: 'מומחה פרפורמנס מרקטינג', tone: 'משכנע, ממוקד תועלת',         focusAreas: ['Value proposition', 'Call to action', 'Objection handling'] },
  'טבלת נתונים':  { role: 'אנליסט נתונים',          tone: 'כמותי, מדויק, מובנה',         focusAreas: ['מגמות', 'חריגים', 'מדדי מפתח'] },
  'קוד מקור':     { role: 'מהנדס תוכנה בכיר',       tone: 'טכני, מדויק',                focusAreas: ['ארכיטקטורה', 'באגים פוטנציאליים', 'ביצועים'] },
  'אימייל/התכתבות': { role: 'מומחה תקשורת עסקית',  tone: 'ממוקד, מכבד',                focusAreas: ['הקשר', 'אינטרס הדובר', 'צעד הבא'] },
  'תמונה':        { role: 'מומחה ויזואל ו-UX',      tone: 'תיאורי, מדויק',              focusAreas: ['הרכב', 'צבעים', 'טקסט חזותי'] },
  'דף אינטרנט':   { role: 'content strategist',     tone: 'מובנה, שימושי',               focusAreas: ['מסר מרכזי', 'קהל יעד', 'דגשים'] },
  'generic':      { role: 'מומחה תוכן רב-תחומי',    tone: 'ניטרלי, מאוזן',              focusAreas: ['העיקר', 'פרטים רלוונטיים', 'חסרים אפשריים'] },
};

const PRIORITY: DocumentType[] = [
  'חוזה משפטי', 'קוד מקור', 'מאמר אקדמי', 'טבלת נתונים',
  'דף שיווקי', 'אימייל/התכתבות', 'דף אינטרנט', 'תמונה',
];

export function resolveRole(documentTypes: string[]): ExpertRole {
  for (const type of PRIORITY) {
    if (documentTypes.includes(type)) return DOCUMENT_TYPE_TO_ROLE[type];
  }
  return DOCUMENT_TYPE_TO_ROLE['generic'];
}

export function renderRoleBlock(documentTypes: string[]): string {
  if (documentTypes.length === 0) return '';
  const role = resolveRole(documentTypes);
  const typeLabel = PRIORITY.find((t) => documentTypes.includes(t)) ?? 'generic';
  return [
    '━━━ התאמת מומחה ע"ב קונטקסט ━━━',
    `המשתמש סיפק קונטקסט מסוג "${typeLabel}". בעת יצירת הפרומפט:`,
    `- אמץ נקודת מבט של: ${role.role}`,
    `- טון: ${role.tone}`,
    `- התמקד ב: ${role.focusAreas.join(' · ')}`,
    '━━━',
  ].join('\n');
}

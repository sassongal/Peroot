import { estimateTokens } from '@/lib/context/token-counter';
import { renderRoleBlock } from './role-mapper';
import type { ContextBlock, ContextBlockInjected } from './types';

const USAGE_RULES = [
  '━━━ הנחיות שימוש בקונטקסט ━━━',
  '1. הטמע ציטוטים, מספרים, תאריכים ושמות ספציפיים מהמקורות ישירות בפרומפט הסופי. אל תכתוב "ראה קובץ מצורף".',
  '2. התאם את הטון והתפקיד המומחה לסוג המסמך (חוזה → עורך דין; אקדמי → חוקר).',
  '3. אם יש סתירה בין מקורות, העדף את המקור המאוחר יותר.',
  '4. הקונטקסט הוא רקע, לא תחליף להוראות המשתמש — ההוראות בראש הבקשה מנצחות.',
  '━━━',
].join('\n');

const TYPE_ICON: Record<string, string> = { file: '📄', url: '🌐', image: '🖼️' };

export function buildInjectedBlock(b: ContextBlock, index: number): ContextBlockInjected {
  const icon = TYPE_ICON[b.type] ?? '📎';
  const header = `[מקור #${index} — ${icon} ${b.display.documentType}: ${b.display.title}]`;
  const lines: string[] = [header, `סוג: ${b.display.documentType}`];
  if (b.display.keyFacts.length > 0) {
    lines.push('נקודות מפתח:');
    for (const fact of b.display.keyFacts) lines.push(`  • ${fact}`);
  }
  if (b.display.entities.length > 0) {
    const ents = b.display.entities.map((e) => `${e.name} (${e.type})`).join(', ');
    lines.push(`ישויות מרכזיות: ${ents}`);
  }
  lines.push(`תקציר: ${b.display.summary}`);
  if (b.display.metadata.truncated) {
    lines.push('⚠️ הקובץ נחתך בגלל מגבלת תקציב בתוכנית החינמית');
  }
  const body = lines.join('\n');
  return { header, body, tokenCount: estimateTokens(body) };
}

export function renderInjection(blocks: ContextBlock[]): string {
  if (blocks.length === 0) return '';
  const roleBlock = renderRoleBlock(blocks.map((b) => b.display.documentType));
  const bodies = blocks.map((b, i) => buildInjectedBlock(b, i + 1).body).join('\n\n');
  return [
    roleBlock,
    '',
    '━━━ קונטקסט שסופק על ידי המשתמש ━━━',
    '',
    bodies,
    '',
    USAGE_RULES,
  ].join('\n');
}

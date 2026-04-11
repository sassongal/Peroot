import type { ContextBlock } from '@/lib/context/engine/types';

function formatTokenCountShort(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

/**
 * One-line label for attachment cards: source kind + identifier · tokens
 * (אתר / קובץ / תמונה) so users see what context is attached.
 */
export function formatContextAttachmentSubtitle(block: ContextBlock): string {
  const meta = block.display.metadata;
  const title = block.display.title?.trim() || '';
  const tokens = formatTokenCountShort(block.injected.tokenCount);

  if (block.type === 'url') {
    const raw = meta.sourceUrl;
    if (raw) {
      try {
        const host = new URL(raw).hostname.replace(/^www\./, '');
        return `אתר · ${host} · ${tokens} טוקנים`;
      } catch {
        /* fall through */
      }
    }
    const label = title || raw || 'קישור';
    return `אתר · ${label} · ${tokens} טוקנים`;
  }

  if (block.type === 'file') {
    const name = meta.filename || title || 'קובץ';
    return `קובץ · ${name} · ${tokens} טוקנים`;
  }

  if (block.type === 'image') {
    const name = meta.filename || title || 'תמונה';
    return `תמונה · ${name} · ${tokens} טוקנים`;
  }

  return `${block.display.documentType} · ${tokens} טוקנים`;
}

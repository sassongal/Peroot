import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface UrlExtractionResult {
  text: string;
  metadata: {
    format: 'url';
    title?: string;
    author?: string;
    publishedTime?: string;
    sourceUrl: string;
    usedFallback?: 'jina';
  };
}

export interface UrlExtractOptions {
  jinaFallback: boolean;
  timeoutMs?: number;
}

const MIN_USEFUL_CHARS = 200;
const MIN_JINA_CHARS = 100;
const DEFAULT_TIMEOUT = 12_000;

export async function extractUrl(
  url: string,
  opts: UrlExtractOptions,
): Promise<UrlExtractionResult> {
  const html = await fetchText(url, opts.timeoutMs ?? DEFAULT_TIMEOUT);
  const readable = readabilityParse(html, url);

  if (readable && readable.text.length >= MIN_USEFUL_CHARS) {
    return {
      text: readable.text,
      metadata: {
        format: 'url',
        title: readable.title,
        author: readable.author,
        publishedTime: readable.publishedTime,
        sourceUrl: url,
      },
    };
  }

  if (opts.jinaFallback) {
    const jina = await fetchJina(url, opts.timeoutMs ?? DEFAULT_TIMEOUT);
    if (jina.length >= MIN_JINA_CHARS) {
      return {
        text: jina,
        metadata: {
          format: 'url',
          title: extractMarkdownTitle(jina),
          sourceUrl: url,
          usedFallback: 'jina',
        },
      };
    }
  }

  throw new Error(
    'הדף מבוסס JavaScript ולא הצלחנו לקרוא אותו. שדרג ל-Pro להפעלת fallback מתקדם.',
  );
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; PerootBot/1.0; +https://www.peroot.space)',
        'accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJina(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Jina ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

interface ParsedArticle {
  text: string;
  title?: string;
  author?: string;
  publishedTime?: string;
}

function readabilityParse(html: string, baseUrl: string): ParsedArticle | null {
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article) return null;
    const text = (article.textContent ?? '').trim();
    if (!text) return null;
    return {
      text,
      title: article.title ?? undefined,
      author: article.byline ?? undefined,
      publishedTime: article.publishedTime ?? undefined,
    };
  } catch {
    return null;
  }
}

function extractMarkdownTitle(md: string): string | undefined {
  const match = md.match(/^\s*#\s+(.+)$/m);
  return match?.[1]?.trim();
}

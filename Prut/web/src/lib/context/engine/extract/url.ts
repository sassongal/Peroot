import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import dns from 'node:dns/promises';

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
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

// Private/reserved IP ranges — block SSRF
const BLOCKED_IP_RE =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|::1|fc00|fd|fe80)/;

function assertPublicUrl(raw: string): URL {
  const parsed = new URL(raw);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('רק קישורי HTTP/HTTPS נתמכים');
  }
  // Block IPs directly in hostname
  if (BLOCKED_IP_RE.test(parsed.hostname)) {
    throw new Error('כתובת פנימית חסומה');
  }
  return parsed;
}

async function assertPublicDns(hostname: string): Promise<void> {
  try {
    const addresses = await dns.resolve4(hostname);
    for (const ip of addresses) {
      if (BLOCKED_IP_RE.test(ip)) {
        throw new Error('כתובת פנימית חסומה');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'כתובת פנימית חסומה') throw err;
    // DNS resolution failure — let fetch handle it
  }
}

export async function extractUrl(
  url: string,
  opts: UrlExtractOptions,
): Promise<UrlExtractionResult> {
  const parsed = assertPublicUrl(url);
  await assertPublicDns(parsed.hostname);
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
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error('הדף גדול מדי לעיבוד');
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('הדף גדול מדי לעיבוד');
    }
    return new TextDecoder().decode(buf);
  } finally {
    clearTimeout(t);
  }
}

async function fetchJina(url: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, { signal: ctrl.signal });
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

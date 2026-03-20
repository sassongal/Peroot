/**
 * Server-side utility for extracting readable content from a URL.
 *
 * Uses fetch + cheerio for lightweight HTML parsing. Avoids JSDOM
 * to keep the bundle small and suitable for serverless environments.
 *
 * This module is intended for use in API routes and server actions only.
 */

import * as cheerio from 'cheerio';
import { trimToTokenLimit, MAX_TOKENS_PER_ATTACHMENT } from './token-counter';
import type { ExtractionResult } from './types';

/** Maximum response body size in megabytes */
export const MAX_URL_SIZE_MB = 5;

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 10_000;

/** User-Agent header for outgoing requests */
const USER_AGENT =
  'Mozilla/5.0 (compatible; PerootBot/1.0; +https://peroot.com)';

/** HTML elements to remove before extracting text */
const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'footer',
  'header',
  'aside',
  'form',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.ad',
  '.ads',
  '.advertisement',
  '.sidebar',
  '.cookie-banner',
  '.popup',
  '.modal',
  '.nav',
  '.footer',
  '.header',
  '.menu',
  '.social-share',
  '.comments',
].join(', ');

/** Content selectors to try, in priority order */
const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '#content',
  '.post',
  '.article',
];

/**
 * Extract readable text content from a URL.
 *
 * @param url - The URL to fetch and extract content from
 * @returns Extracted text and metadata (title, description, url)
 * @throws Error if the URL is invalid, the fetch fails, or the response is not HTML
 */
export async function extractTextFromUrl(url: string): Promise<ExtractionResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}". Please provide a valid HTTP or HTTPS URL.`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(
      `Unsupported protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are supported.`
    );
  }

  // Fetch with timeout
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds: "${url}"`);
    }
    throw new Error(
      `Failed to fetch URL "${url}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} when fetching "${url}"`
    );
  }

  // Verify content type is HTML
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error(
      `URL returned non-HTML content type "${contentType}". Only HTML pages are supported.`
    );
  }

  // Check content length
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const sizeMb = parseInt(contentLength, 10) / (1024 * 1024);
    if (sizeMb > MAX_URL_SIZE_MB) {
      throw new Error(
        `Response size ${sizeMb.toFixed(1)} MB exceeds maximum of ${MAX_URL_SIZE_MB} MB`
      );
    }
  }

  const html = await response.text();

  // Check actual size
  const actualSizeMb = new TextEncoder().encode(html).length / (1024 * 1024);
  if (actualSizeMb > MAX_URL_SIZE_MB) {
    throw new Error(
      `Response size ${actualSizeMb.toFixed(1)} MB exceeds maximum of ${MAX_URL_SIZE_MB} MB`
    );
  }

  return parseHtml(html, url);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseHtml(html: string, url: string): ExtractionResult {
  const $ = cheerio.load(html);

  // Extract metadata before stripping elements
  const title = extractTitle($);
  const description = extractDescription($);

  // Remove non-content elements
  $(REMOVE_SELECTORS).remove();

  // Try to find the main content area
  let contentText = '';

  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector);
    if (el.length > 0) {
      contentText = cleanText(el.first().text());
      if (contentText.length > 100) break; // Found substantial content
    }
  }

  // Fall back to body text if no content area found
  if (contentText.length < 100) {
    contentText = cleanText($('body').text());
  }

  if (!contentText || contentText.length < 10) {
    throw new Error(
      'Could not extract meaningful text content from the page. The page may be JavaScript-rendered or empty.'
    );
  }

  const { text: trimmedText } = trimToTokenLimit(contentText, MAX_TOKENS_PER_ATTACHMENT);

  return {
    text: trimmedText,
    metadata: {
      title: title || undefined,
      description: description || undefined,
      url,
      characters: contentText.length,
    },
  };
}

function extractTitle($: cheerio.CheerioAPI): string {
  // Try OpenGraph title first, then <title>
  return (
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="twitter:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    ''
  );
}

function extractDescription($: cheerio.CheerioAPI): string {
  return (
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[name="twitter:description"]').attr('content')?.trim() ||
    ''
  );
}

/**
 * Clean extracted text: collapse whitespace, remove excessive blank lines.
 */
function cleanText(raw: string): string {
  return raw
    .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')    // max 2 consecutive newlines
    .replace(/^\s+$/gm, '')        // remove whitespace-only lines
    .trim();
}

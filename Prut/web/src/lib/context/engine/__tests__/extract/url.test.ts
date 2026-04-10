import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUrl } from '../../extract/url';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('extractUrl', () => {
  it('extracts main content with Readability on an article page', async () => {
    const html = `
      <html><head><title>Test Article</title>
      <meta property="article:author" content="Jane Doe">
      </head><body>
      <nav>nav junk</nav>
      <article><h1>Main</h1>
      <p>${'Lorem ipsum dolor sit amet. '.repeat(30)}</p>
      <p>${'Second paragraph. '.repeat(30)}</p>
      </article></body></html>`;
    fetchMock.mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    const r = await extractUrl('https://example.com/article', { jinaFallback: false });
    expect(r.text).toContain('Lorem ipsum');
    expect(r.text).not.toContain('nav junk');
    expect(r.metadata.title).toBe('Test Article');
  });

  it('falls back to Jina when Readability returns empty and jinaFallback=true', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html><body><div id="root"></div></body></html>', {
        status: 200, headers: { 'content-type': 'text/html' },
      }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response('# Real Title\n\nReal content from Jina.\n'.repeat(5), {
        status: 200, headers: { 'content-type': 'text/plain' },
      }),
    );
    const r = await extractUrl('https://spa.example.com', { jinaFallback: true });
    expect(r.text).toContain('Real content from Jina');
    expect(r.metadata.usedFallback).toBe('jina');
  });

  it('throws a user-facing error when jinaFallback=false and Readability empty', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html><body><div id="root"></div></body></html>', {
        status: 200, headers: { 'content-type': 'text/html' },
      }),
    );
    await expect(extractUrl('https://spa.example.com', { jinaFallback: false }))
      .rejects.toThrow(/JavaScript|דף מבוסס/);
  });
});

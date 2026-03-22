import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromUrl } from '@/lib/context/extract-url';
import { estimateTokens } from '@/lib/context/token-counter';
import { checkRateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';
import dns from 'dns/promises';

export const maxDuration = 15;

/**
 * Check if an IP address is private/internal (SSRF protection).
 */
function isPrivateIP(ip: string): boolean {
  // IPv6 loopback
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;

  // Strip IPv4-mapped IPv6 prefix
  const cleaned = ip.replace(/^::ffff:/, '');

  const parts = cleaned.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0
    if (parts.every(p => p === 0)) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limiting
    const limitResult = await checkRateLimit(user.id, 'free');
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', reset_at: limitResult.reset },
        { status: 429, headers: { 'Retry-After': limitResult.reset.toString() } }
      );
    }

    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'כתובת URL חסרה' }, { status: 400 });
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'כתובת URL לא תקינה' }, { status: 400 });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'כתובת URL לא תקינה' }, { status: 400 });
    }

    // Block localhost hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return NextResponse.json({ error: 'כתובת URL לא מורשית' }, { status: 400 });
    }

    // SSRF protection: resolve DNS and check for private IPs
    try {
      const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
      const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
      const allAddresses = [...addresses, ...addresses6];

      if (allAddresses.length === 0) {
        return NextResponse.json({ error: 'לא ניתן לפתור את כתובת ה-URL' }, { status: 400 });
      }

      for (const addr of allAddresses) {
        if (isPrivateIP(addr)) {
          return NextResponse.json({ error: 'כתובת URL לא מורשית' }, { status: 400 });
        }
      }
    } catch {
      return NextResponse.json({ error: 'שגיאה באימות כתובת ה-URL' }, { status: 400 });
    }

    const result = await extractTextFromUrl(url);

    return NextResponse.json({
      text: result.text,
      tokens: estimateTokens(result.text),
      metadata: result.metadata,
    });
  } catch (err) {
    logger.error('[Context Extract URL]', err);
    const message = err instanceof Error ? err.message : 'שגיאה בקריאת ה-URL';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

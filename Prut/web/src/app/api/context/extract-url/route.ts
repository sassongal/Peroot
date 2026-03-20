import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromUrl } from '@/lib/context/extract-url';
import { estimateTokens } from '@/lib/context/token-counter';
import { logger } from '@/lib/logger';

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'כתובת URL חסרה' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'כתובת URL לא תקינה' }, { status: 400 });
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

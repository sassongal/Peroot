import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromFile, MAX_FILE_SIZE_MB, SUPPORTED_FILE_TYPES } from '@/lib/context/extract-file';
import { estimateTokens } from '@/lib/context/token-counter';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });
    }

    // Validate size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` },
        { status: 400 }
      );
    }

    // Validate type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supportedExts = Object.values(SUPPORTED_FILE_TYPES);
    if (!supportedExts.includes(ext) && !SUPPORTED_FILE_TYPES[file.type]) {
      return NextResponse.json(
        { error: `פורמט לא נתמך. פורמטים נתמכים: ${supportedExts.join(', ')}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractTextFromFile(buffer, file.name, file.type);

    return NextResponse.json({
      text: result.text,
      tokens: estimateTokens(result.text),
      metadata: {
        ...result.metadata,
        filename: file.name,
        size_mb: Math.round(sizeMB * 100) / 100,
      },
    });
  } catch (err) {
    logger.error('[Context Extract File]', err);
    return NextResponse.json(
      { error: 'שגיאה בעיבוד הקובץ' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { estimateTokens } from '@/lib/context/token-counter';
import { checkRateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

const MAX_IMAGE_SIZE_MB = 5;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limiting — this route calls Gemini API (costs money)
    const limitResult = await checkRateLimit(user.id, 'free');
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', reset_at: limitResult.reset },
        { status: 429, headers: { 'Retry-After': String(limitResult.reset) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחרה תמונה' }, { status: 400 });
    }

    // Validate size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      return NextResponse.json(
        { error: `התמונה גדולה מדי (מקסימום ${MAX_IMAGE_SIZE_MB}MB)` },
        { status: 400 }
      );
    }

    // Validate type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'פורמט תמונה לא נתמך. נתמכים: JPG, PNG, WEBP, GIF' },
        { status: 400 }
      );
    }

    // Convert to base64 for Vision API
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Call Gemini Flash for image description
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      logger.error('[Describe Image] Missing GEMINI_API_KEY or GOOGLE_API_KEY');
      return NextResponse.json({ error: 'שירות תיאור תמונות לא זמין' }, { status: 503 });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Analyze this image with maximum detail extraction. Your output will be used as context for an AI prompt engineer.

EXTRACT ALL of the following that apply:
- **Colors**: If colors are visible, extract EXACT hex codes (e.g., #B9453C). List every distinct color.
- **Text/Typography**: Transcribe ALL visible text exactly as written. Note fonts, sizes, styles.
- **Data/Numbers**: Extract all numbers, measurements, statistics, dates.
- **Layout/Structure**: Describe composition, grid, hierarchy, spacing.
- **Objects/Elements**: Identify all visual elements precisely.
- **Style/Mood**: Describe the aesthetic, design style, mood.
- **Brand elements**: Logos, icons, patterns, watermarks.
- **Technical details**: Resolution clues, format, aspect ratio.

Be SPECIFIC and PRECISE. Instead of "warm colors" say "muted red #B9453C and warm beige #E6DBCF".
Instead of "some text" say "Title reads 'Welcome Home' in serif font, ~24px".

Output in Hebrew. Be comprehensive — 5-10 sentences.` },
              { inline_data: { mime_type: file.type, data: base64 } },
            ],
          }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      logger.error('[Describe Image] Gemini API error:', await geminiResponse.text());
      return NextResponse.json({ error: 'שגיאה בתיאור התמונה' }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const description = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'לא ניתן לתאר את התמונה';

    return NextResponse.json({
      description,
      tokens: estimateTokens(description),
      metadata: {
        filename: file.name,
        size_mb: Math.round(sizeMB * 100) / 100,
        mime_type: file.type,
      },
    });
  } catch (err) {
    logger.error('[Describe Image]', err);
    return NextResponse.json(
      { error: 'שגיאה בעיבוד התמונה' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { estimateTokens } from '@/lib/context/token-counter';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

const MAX_IMAGE_SIZE_MB = 5;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'תאר את התמונה הזו בפירוט בעברית. כלול: מה רואים בתמונה, צבעים, טקסט (אם יש), הקשר משוער, ופרטים רלוונטיים. תיאור של 3-5 משפטים.' },
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

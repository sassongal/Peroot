import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.enum(['question', 'bug', 'feature', 'billing', 'other']),
  message: z.string().min(10).max(5000),
});

const SUBJECT_LABELS: Record<string, string> = {
  question: 'שאלה כללית',
  bug: 'דיווח על באג',
  feature: 'הצעה לתכונה חדשה',
  billing: 'חיוב ותשלום',
  other: 'אחר',
};

export async function POST(request: Request) {
  try {
    // Rate limit: 5 contact messages per hour per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = await checkRateLimit(`contact:${ip}`, 'guest');
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { name, email, subject, message } = parsed.data;
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@joya-tech.net';

    if (!apiKey) {
      logger.error('[Contact] Missing RESEND_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `Peroot Contact <${fromEmail}>`,
      to: 'gal@joya-tech.net',
      replyTo: email,
      subject: `[Peroot Contact] ${SUBJECT_LABELS[subject] || subject} - ${name}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #F59E0B;">הודעה חדשה מ-Peroot</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">שם:</td><td style="padding: 8px;">${name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">אימייל:</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">נושא:</td><td style="padding: 8px;">${SUBJECT_LABELS[subject] || subject}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap;">${message}</div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Contact] Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

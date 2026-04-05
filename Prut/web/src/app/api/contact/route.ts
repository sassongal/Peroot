import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';
import { contactEmail, SUBJECT_LABELS, escapeHtml } from '@/lib/emails/templates';

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.enum(['question', 'bug', 'feature', 'billing', 'other']),
  message: z.string().min(10).max(5000),
});

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
    const contactRecipient = process.env.CONTACT_EMAIL || 'gal@joya-tech.net';

    if (!apiKey) {
      logger.error('[Contact] Missing RESEND_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: `Peroot Contact <${fromEmail}>`,
      to: contactRecipient,
      replyTo: email,
      subject: `[Peroot Contact] ${SUBJECT_LABELS[subject] || subject} - ${escapeHtml(name)}`,
      html: contactEmail({ name, email, subject, message }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Contact] Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

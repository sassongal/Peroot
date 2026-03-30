import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from "@/lib/logger";

/**
 * Simple Email Service for Peroot
 * Usage: await EmailService.sendWelcome(user.email, user.name);
 *
 * All sends are logged to the `email_logs` table for admin tracking.
 */
export class EmailService {
    private static resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    private static from = process.env.RESEND_FROM_EMAIL || 'no-reply@joya-tech.net';

    /**
     * Send arbitrary transactional email and log it.
     */
    static async send({
        to,
        subject,
        html,
        userId,
        emailType = 'transactional',
        metadata = {},
    }: {
        to: string | string[];
        subject: string;
        html: string;
        userId?: string;
        emailType?: string;
        metadata?: Record<string, unknown>;
    }) {
        if (!this.resend) {
            logger.warn('[EmailService] Resend not configured. Skipping email.');
            return null;
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.from,
                to,
                subject,
                html: `<div dir="rtl" style="font-family: sans-serif;">${html}</div>`,
            });

            if (error) throw error;

            // Log to email_logs table
            await this.logEmail({
                userId,
                emailTo: Array.isArray(to) ? to[0] : to,
                source: 'resend',
                emailType,
                subject,
                status: 'sent',
                resendId: data?.id ?? null,
                metadata,
            });

            return data;
        } catch (err) {
            // Log failed attempt
            await this.logEmail({
                userId,
                emailTo: Array.isArray(to) ? to[0] : to,
                source: 'resend',
                emailType,
                subject,
                status: 'failed',
                metadata: { ...metadata, error: String(err) },
            });

            logger.error('[EmailService] Failed to send email:', err);
            throw err;
        }
    }

    /**
     * Log an email event to the email_logs table.
     */
    static async logEmail({
        userId,
        emailTo,
        source,
        emailType,
        subject,
        status,
        resendId,
        metadata = {},
    }: {
        userId?: string;
        emailTo: string;
        source: string;
        emailType: string;
        subject?: string;
        status: string;
        resendId?: string | null;
        metadata?: Record<string, unknown>;
    }) {
        try {
            const supabase = createServiceClient();
            await supabase.from('email_logs').insert({
                user_id: userId || null,
                email_to: emailTo,
                source,
                email_type: emailType,
                subject: subject || null,
                status,
                resend_id: resendId || null,
                metadata,
            });
        } catch (err) {
            // Don't throw — logging failure shouldn't break email flow
            logger.error('[EmailService] Failed to log email:', err);
        }
    }

    /**
     * Presets: Welcome Email
     */
    static async sendWelcome(to: string, name?: string, userId?: string) {
        return this.send({
            to,
            subject: 'ברוכים הבאים ל-Peroot! הדרך שלך לפרומפטים מושלמים מתחילה כאן',
            userId,
            emailType: 'welcome',
            html: `
                <div style="max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
                    <h1 style="color: #3b82f6; font-size: 24px; margin-bottom: 20px;">היי ${name || 'שם'}</h1>
                    <p style="font-size: 16px;">איזה כיף שהצטרפת ל-<strong>Peroot</strong>! אנחנו כאן כדי לעזור לך להפיק את המקסימום מכלי הבינה המלאכותית שלך.</p>

                    <p style="font-size: 16px;">מה מחכה לך במערכת?</p>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 15px;">
                            <strong>שדרוג פרומפטים:</strong> האלגוריתם שלנו יהפוך כל רעיון גולמי לפרומפט מהונדס ומקצועי.
                        </li>
                        <li style="margin-bottom: 15px;">
                            <strong>ספריה אישית:</strong> שמור, נהל וארגן את כל הפרומפטים המנצחים שלך במקום אחד מסודר.
                        </li>
                        <li style="margin-bottom: 15px;">
                            <strong>מצבי עבודה מתקדמים:</strong> ממחקר מעמיק ועד בניית סוכני AI - הכל זמין לך בלחיצת כפתור.
                        </li>
                    </ul>

                    <p style="font-size: 16px; margin-top: 30px;">המסע שלך לשיפור ה-AI מתחיל עכשיו. בואו נתחיל ליצור!</p>

                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}"
                           style="background: #3b82f6; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                           כניסה ל-Peroot
                        </a>
                    </div>

                    <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; text-align: center;">
                        נשלח באהבה על ידי צוות Peroot
                    </p>
                </div>
            `
        });
    }
}

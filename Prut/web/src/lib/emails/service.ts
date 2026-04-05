import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from "@/lib/logger";
import { withRetry } from "@/lib/retry";
import { welcomeEmail } from './templates/welcome';

/**
 * Simple Email Service for Peroot
 * Usage: await EmailService.sendWelcome(user.email, user.name);
 *
 * All sends are logged to the `email_logs` table for admin tracking.
 */
export class EmailService {
    private static resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    private static from = process.env.RESEND_FROM_EMAIL || 'no-reply@joya-tech.net';
    private static defaultReplyTo = process.env.RESEND_REPLY_TO || 'gal@joya-tech.net';

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
        replyTo,
    }: {
        to: string | string[];
        subject: string;
        html: string;
        userId?: string;
        emailType?: string;
        metadata?: Record<string, unknown>;
        replyTo?: string;
    }) {
        if (!this.resend) {
            logger.warn('[EmailService] Resend not configured. Skipping email.');
            return null;
        }

        try {
            const data = await withRetry(async () => {
                const { data, error } = await this.resend!.emails.send({
                    from: this.from,
                    to,
                    subject,
                    replyTo: replyTo || this.defaultReplyTo,
                    html: `<div dir="rtl" style="font-family: sans-serif;">${html}</div>`,
                });
                if (error) throw error;
                return data;
            }, { maxAttempts: 3, backoff: [1000, 2000, 4000], label: 'EmailService.send' });

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
            html: welcomeEmail({
                name,
                appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.peroot.space',
            }),
        });
    }
}

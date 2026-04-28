
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AchievementTracker } from '@/lib/intelligence/achievement-tracker';
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const AwardSchema = z.object({
  achievementId: z.string().min(1),
});

/**
 * POST /api/user/achievements/award
 * 
 * Securely award an achievement from the client-side (e.g. Onboarding)
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 10 achievement awards per 24h
        const rl = await checkRateLimit(`achievement:${user.id}`, "free");
        if (!rl.success) {
            return NextResponse.json({ error: "יותר מדי ניסיונות", code: "too_many_attempts" }, { status: 429 });
        }

        const body = await req.json();
        const parsed = AwardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "בקשה לא תקינה", code: "invalid_request" }, { status: 400 });
        }
        const { achievementId } = parsed.data;

        // Only allow certain achievements to be awarded directly from UI
        const whitelist = ['pioneer'];
        if (!whitelist.includes(achievementId)) {
            return NextResponse.json({ error: 'Restricted achievement' }, { status: 403 });
        }

        const success = await AchievementTracker.award(user.id, achievementId);

        return NextResponse.json({ success });

    } catch (err) {
        logger.error('[Award API] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

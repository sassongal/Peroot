
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AchievementTracker } from '@/lib/intelligence/achievement-tracker';

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

        const { achievementId } = await req.json();

        if (!achievementId) {
            return NextResponse.json({ error: 'Missing achievementId' }, { status: 400 });
        }

        // Only allow certain achievements to be awarded directly from UI
        const whitelist = ['pioneer'];
        if (!whitelist.includes(achievementId)) {
            return NextResponse.json({ error: 'Restricted achievement' }, { status: 403 });
        }

        const success = await AchievementTracker.award(user.id, achievementId);

        return NextResponse.json({ success });

    } catch (err) {
        console.error('[Award API] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

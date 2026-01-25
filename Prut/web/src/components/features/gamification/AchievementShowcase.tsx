import { createClient } from "@/lib/supabase/server";
import { AchievementShowcaseClient } from "./AchievementShowcaseClient";

interface AchievementShowcaseProps {
    userId?: string;
}

/**
 * Server Component: Fetches achievement data on the server
 * and passes it to the client component for rendering.
 */
export async function AchievementShowcase({ userId }: AchievementShowcaseProps) {
    if (!userId) return null;

    const supabase = await createClient();

    // Fetch all achievements and user's unlocked achievements in parallel
    const [allResult, userResult] = await Promise.all([
        supabase.from('achievements').select('*').order('points', { ascending: true }),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', userId)
    ]);

    const achievements = allResult.data || [];
    const unlockedIds = (userResult.data || []).map(u => u.achievement_id);

    return (
        <AchievementShowcaseClient 
            achievements={achievements} 
            unlockedIds={unlockedIds} 
        />
    );
}


import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Service to handle awarding and tracking user achievements.
 *
 * Achievements:
 * - pioneer, architect_1, architect_2, style_explorer, placeholder_pro (existing)
 * - first_enhance, power_user_50, power_user_100 (usage milestones)
 * - streak_3, streak_7, streak_30 (engagement streaks)
 * - chain_master, share_first, explorer, context_pro (feature usage)
 */
export const AchievementTracker = {
    async award(userId: string, achievementId: string): Promise<boolean> {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('award_achievement', {
            target_user_id: userId,
            ach_id: achievementId
        });

        if (error) {
            logger.error(`[AchievementTracker] Error awarding ${achievementId}:`, error);
            return false;
        }

        return data as boolean;
    },

    /**
     * Run all achievement checks for a user after an enhance/refine action.
     */
    async checkAll(userId: string) {
        await Promise.all([
            this.checkEnhanceMilestones(userId),
            this.checkLibraryMilestones(userId),
            this.checkStreakMilestones(userId),
            this.checkFeatureMilestones(userId),
            this.checkUsageMilestones(userId),
        ]);
    },

    /**
     * Enhancement count milestones: first_enhance, power_user_50, power_user_100
     */
    async checkEnhanceMilestones(userId: string) {
        const supabase = await createClient();
        const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('action', ['Prmpt Enhance', 'Prmpt Refine']);

        if (!count) return;

        if (count >= 1) await this.award(userId, 'first_enhance');
        if (count >= 50) await this.award(userId, 'power_user_50');
        if (count >= 100) await this.award(userId, 'power_user_100');
    },

    /**
     * Library milestones: architect_1 (3+), architect_2 (10+)
     */
    async checkLibraryMilestones(userId: string) {
        const supabase = await createClient();
        const { count } = await supabase
            .from('personal_library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (!count) return;

        if (count >= 3) await this.award(userId, 'architect_1');
        if (count >= 10) await this.award(userId, 'architect_2');
    },

    /**
     * Streak milestones: streak_3, streak_7, streak_30
     * Calculates consecutive days with at least one activity.
     */
    async checkStreakMilestones(userId: string) {
        const supabase = await createClient();

        // Get distinct dates with activity in the last 35 days
        const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activities } = await supabase
            .from('activity_logs')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', thirtyFiveDaysAgo)
            .order('created_at', { ascending: false })
            .limit(500);

        if (!activities || activities.length === 0) return;

        // Get unique dates (Israel timezone)
        const dates = new Set(
            activities.map((a) => {
                const d = new Date(a.created_at);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
        );

        // Calculate current streak from today backwards
        let streak = 0;
        const today = new Date();
        for (let i = 0; i <= 35; i++) {
            const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (dates.has(key)) {
                streak++;
            } else if (i > 0) {
                break; // Allow today to be missing (day not over yet)
            }
        }

        if (streak >= 3) await this.award(userId, 'streak_3');
        if (streak >= 7) await this.award(userId, 'streak_7');
        if (streak >= 30) await this.award(userId, 'streak_30');
    },

    /**
     * Feature milestones: chain_master, share_first, explorer, context_pro
     */
    async checkFeatureMilestones(userId: string) {
        const supabase = await createClient();

        const { data: activities } = await supabase
            .from('activity_logs')
            .select('action, details')
            .eq('user_id', userId)
            .limit(500);

        if (!activities) return;

        // Chain usage
        const hasChain = activities.some((a) => a.action.toLowerCase().includes('chain'));
        if (hasChain) await this.award(userId, 'chain_master');

        // Share usage
        const hasShare = activities.some((a) => a.action.toLowerCase().includes('share'));
        if (hasShare) await this.award(userId, 'share_first');

        // Mode diversity (explorer): check distinct capability_modes
        const modes = new Set<string>();
        for (const a of activities) {
            const details = a.details as Record<string, unknown> | null;
            const mode = (details?.capability_mode || details?.mode) as string | undefined;
            if (mode) modes.add(mode);
        }
        if (modes.size >= 3) await this.award(userId, 'explorer');

        // Context usage
        const hasContext = activities.some((a) => {
            const details = a.details as Record<string, unknown> | null;
            return details?.has_context === true;
        });
        if (hasContext) await this.award(userId, 'context_pro');
    },

    /**
     * Placeholder/variable usage milestones
     */
    async checkUsageMilestones(userId: string) {
        const supabase = await createClient();
        const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .filter('details->prompt_length', 'gt', 0);

        if (count && count >= 5) {
            await this.award(userId, 'placeholder_pro');
        }
    }
};

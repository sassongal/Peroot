
import { createClient } from "@/lib/supabase/server";

/**
 * Service to handle awarding and tracking user achievements
 */
export const AchievementTracker = {
    /**
     * Awards a specific achievement to a user
     */
    async award(userId: string, achievementId: string) {
        const supabase = await createClient();
        
        // Call RPC which handles the insertion into user_achievements table
        const { data, error } = await supabase.rpc('award_achievement', {
            target_user_id: userId,
            ach_id: achievementId
        });

        if (error) {
            console.error(`[AchievementTracker] Error awarding ${achievementId}:`, error);
            return false;
        }

        return data as boolean;
    },

    /**
     * Checks if a user qualifies for library-based achievements
     */
    async checkLibraryMilestones(userId: string) {
        const supabase = await createClient();
        
        const { count } = await supabase
            .from('personal_library')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (!count) return;

        if (count >= 10) {
            await this.award(userId, 'architect_2');
        } else if (count >= 3) {
            await this.award(userId, 'architect_1');
        }
    },

    /**
     * Checks if a user qualifies for usage-based achievements (Placeholders)
     */
    async checkUsageMilestones(userId: string) {
        const supabase = await createClient();
        
        // Count distinct activities with placeholders logged
        const { count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .filter('details->prompt_length', 'gt', 0); // Simplified check for now
            // Future: Use a more specific "has_placeholder" flag in details

        if (count && count >= 5) {
            await this.award(userId, 'placeholder_pro');
        }
    }
};

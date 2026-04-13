import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/user/onboarding/complete
 *
 * Marks in-app onboarding as finished. Welcome email is sent once at signup
 * (auth callback + onboarding_welcome), not here — avoids duplicate automated mail.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Log onboarding completion (fire-and-forget)
    void supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'onboarding_complete',
      entity_type: 'profile',
      entity_id: user.id,
      details: {},
    });

    return NextResponse.json({
        success: true,
        message: "Onboarding completed successfully"
    });

  } catch (error) {
    logger.error("[Onboarding API] Error:", error);
    return NextResponse.json(
        { error: "Failed to complete onboarding" }, 
        { status: 500 }
    );
  }
}

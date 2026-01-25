import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { EmailService } from "@/lib/emails/service";

/**
 * POST /api/user/onboarding/complete
 * 
 * Marks onboarding as finished and triggers a welcome email.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Update Profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // 2. Trigger Welcome Email (Fire and forget, or wait if you want confirmation)
    // We get the user's name if available from metadata
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
    
    EmailService.sendWelcome(user.email!, name).catch(err => {
        console.error("[Onboarding API] Failed to send welcome email:", err);
    });

    return NextResponse.json({ 
        success: true,
        message: "Onboarding completed successfully"
    });

  } catch (error) {
    console.error("[Onboarding API] Error:", error);
    return NextResponse.json(
        { error: "Failed to complete onboarding" }, 
        { status: 500 }
    );
  }
}

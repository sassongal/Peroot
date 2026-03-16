import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !UUID_REGEX.test(token)) {
    return new NextResponse("טוקן לא תקין", { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify token exists before updating
  const { data: sequence } = await supabase
    .from("email_sequences")
    .select("id, status")
    .eq("id", token)
    .maybeSingle();

  if (!sequence) {
    return new NextResponse("טוקן לא תקין", { status: 400 });
  }
  if (sequence.status === "unsubscribed") {
    // Already unsubscribed — show success page anyway
  } else {
    const { error } = await supabase
      .from("email_sequences")
      .update({ status: "unsubscribed" })
      .eq("id", token);

    if (error) {
      logger.error("[Unsubscribe] Failed:", error);
      return new NextResponse("שגיאה בהסרה מרשימת התפוצה", { status: 500 });
    }
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head><meta charset="utf-8"><title>הסרה מרשימת תפוצה</title></head>
    <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0a; color: #e2e8f0;">
      <div style="text-align: center; max-width: 400px;">
        <h1 style="color: #f59e0b;">הוסרתם בהצלחה</h1>
        <p>לא תקבלו יותר מיילים מסדרת ההצטרפות של Peroot.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://peroot.space'}" style="color: #f59e0b;">חזרה ל-Peroot</a>
      </div>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

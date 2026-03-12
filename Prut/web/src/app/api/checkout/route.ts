import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const CheckoutSchema = z.object({
  variantId: z.string().min(1),
});

/**
 * POST /api/checkout
 * Creates a LemonSqueezy checkout URL for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 checkout attempts per 24h
    const rl = await checkRateLimit(`checkout:${user.id}`, "free");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { variantId } = parsed.data;

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!storeId) {
      return NextResponse.json({ error: 'Store not configured' }, { status: 500 });
    }

    configureLemonSqueezy();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://peroot.space';

    const checkout = await createCheckout(storeId, variantId, {
      checkoutOptions: {
        embed: false,
        media: false,
      },
      checkoutData: {
        email: user.email ?? undefined,
        custom: {
          user_id: user.id,
        },
      },
      productOptions: {
        redirectUrl: `${siteUrl}/settings?tab=billing&success=true`,
        receiptButtonText: 'חזרה ל-Peroot',
        receiptThankYouNote: 'תודה שהצטרפת ל-Peroot Pro! 🎉',
      },
    });

    const checkoutUrl = checkout.data?.data.attributes.url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    logger.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

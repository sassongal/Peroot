import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const CheckoutSchema = z.object({
  variantId: z.string().min(1).transform(v => v.trim()),
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

    const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
    const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
    if (!storeId || !apiKey) {
      return NextResponse.json({ error: 'Store not configured' }, { status: 500 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://peroot.space').trim();

    const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_options: { embed: false, media: false },
            checkout_data: {
              ...(user.email ? { email: user.email } : {}),
              custom: { user_id: user.id },
            },
            product_options: {
              redirect_url: `${siteUrl}/settings?tab=billing&success=true`,
              receipt_button_text: 'Back to Peroot',
              receipt_thank_you_note: 'Welcome to Peroot Pro!',
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });

    if (!lsResponse.ok) {
      const errorText = await lsResponse.text();
      console.error(`[Checkout] LemonSqueezy API error ${lsResponse.status}:`, errorText);
      return NextResponse.json({ error: 'Payment provider error' }, { status: 502 });
    }

    const lsData = await lsResponse.json();
    const checkoutUrl = lsData?.data?.attributes?.url;

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

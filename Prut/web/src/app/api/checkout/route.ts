import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

// TEMP: Debug endpoint - attempts a real checkout creation to see the error
export async function GET() {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const variantId = '1395097'; // Pro variant

  if (!storeId || !apiKey) {
    return NextResponse.json({ error: 'Missing env vars', hasStoreId: !!storeId, hasApiKey: !!apiKey });
  }

  const checkoutPayload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_options: { embed: false, media: false },
        checkout_data: {
          email: 'test@peroot.space',
          custom: { user_id: 'debug-test' },
        },
        product_options: {
          redirect_url: 'https://peroot.space/settings?tab=billing&success=true',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(checkoutPayload),
  });

  const responseText = await res.text();
  return NextResponse.json({
    checkoutStatus: res.status,
    storeId,
    variantId,
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
    requestPayload: checkoutPayload,
    response: responseText.substring(0, 5000),
  });
}

const CheckoutSchema = z.object({
  variantId: z.string().min(1),
});

/**
 * POST /api/checkout
 * Creates a LemonSqueezy checkout URL for the authenticated user.
 * Uses direct API call instead of SDK for serverless reliability.
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
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!storeId || !apiKey) {
      console.error('[Checkout] Missing env vars:', { hasStoreId: !!storeId, hasApiKey: !!apiKey });
      return NextResponse.json({ error: 'Store not configured' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://peroot.space';

    console.log(`[Checkout] Creating checkout for user ${user.id}, variant ${variantId}, store ${storeId}`);

    // Direct API call - more reliable than SDK in serverless
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
            checkout_options: {
              embed: false,
              media: false,
            },
            checkout_data: {
              email: user.email ?? undefined,
              custom: {
                user_id: user.id,
              },
            },
            product_options: {
              redirect_url: `${siteUrl}/settings?tab=billing&success=true`,
              receipt_button_text: 'חזרה ל-Peroot',
              receipt_thank_you_note: 'תודה שהצטרפת ל-Peroot Pro! 🎉',
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!lsResponse.ok) {
      const errorText = await lsResponse.text();
      console.error(`[Checkout] LemonSqueezy API error ${lsResponse.status}:`, errorText);
      // TEMP: Return full error for debugging - remove after fixing
      return NextResponse.json({
        error: 'Payment provider error',
        details: `API returned ${lsResponse.status}`,
        _debug: errorText,
        _storeId: storeId,
        _variantId: variantId,
        _apiKeyPrefix: apiKey.substring(0, 10) + '...',
      }, { status: 502 });
    }

    const lsData = await lsResponse.json();
    const checkoutUrl = lsData?.data?.attributes?.url;

    if (!checkoutUrl) {
      console.error('[Checkout] No checkout URL in response:', JSON.stringify(lsData));
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { configureLemonSqueezy } from '@/lib/lemonsqueezy';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

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

    const { variantId } = await request.json();

    if (!variantId) {
      return NextResponse.json({ error: 'Missing variantId' }, { status: 400 });
    }

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
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

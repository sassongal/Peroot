import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// TEMP: Minimal POST handler to isolate the checkout bug
export async function POST(request: Request) {
  const steps: string[] = [];

  try {
    // Step 1: Auth
    steps.push('auth-start');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', steps }, { status: 401 });
    }
    steps.push(`auth-ok:${user.email}`);

    // Step 2: Read body
    steps.push('body-start');
    const body = await request.json();
    const variantId = body.variantId || '1395097';
    steps.push(`body-ok:${variantId}`);

    // Step 3: Env vars
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!storeId || !apiKey) {
      return NextResponse.json({ error: 'Missing env', steps, hasStore: !!storeId, hasKey: !!apiKey }, { status: 500 });
    }
    steps.push('env-ok');

    // Step 4: Call LemonSqueezy API (exact same as working GET)
    steps.push('ls-call-start');
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
              email: user.email || 'fallback@peroot.space',
              custom: { user_id: user.id },
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
      }),
    });
    steps.push(`ls-status:${lsResponse.status}`);

    // Step 5: Parse response
    const responseText = await lsResponse.text();
    steps.push(`ls-body-len:${responseText.length}`);

    if (!lsResponse.ok) {
      return NextResponse.json({
        error: 'LemonSqueezy API error',
        steps,
        lsStatus: lsResponse.status,
        lsBody: responseText.substring(0, 3000),
      }, { status: 502 });
    }

    // Step 6: Extract URL
    const lsData = JSON.parse(responseText);
    const checkoutUrl = lsData?.data?.attributes?.url;
    steps.push(`url:${checkoutUrl ? 'found' : 'missing'}`);

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'No checkout URL', steps, lsData }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl, steps });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Exception', message: msg, steps }, { status: 500 });
  }
}

// TEMP: Debug GET endpoint
export async function GET() {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!storeId || !apiKey) {
    return NextResponse.json({ error: 'Missing env vars' });
  }

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
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
          checkout_data: { email: 'test@peroot.space', custom: { user_id: 'debug' } },
          product_options: { redirect_url: 'https://peroot.space/settings?tab=billing&success=true' },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: '1395097' } },
        },
      },
    }),
  });

  const text = await res.text();
  return NextResponse.json({ status: res.status, body: text.substring(0, 3000) });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateAdminSession,
  logAdminAction,
  parseAdminInput,
} from '@/lib/admin/admin-security';

const manualCostSchema = z.object({
  service_name: z.string().min(1, 'service_name is required'),
  amount_usd: z.number().nonnegative('amount_usd must be >= 0'),
  billing_period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'billing_period must be in YYYY-MM format'),
  notes: z.string().optional(),
});

/**
 * GET /api/admin/costs/manual
 *
 * Returns all manual cost entries, optionally filtered by billing_period.
 * Query param: billing_period (e.g. "2026-03")
 */
export async function GET(req: NextRequest) {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const billingPeriod = searchParams.get('billing_period');

    let query = supabase
      .from('manual_costs')
      .select('*')
      .order('billing_period', { ascending: false });

    if (billingPeriod) {
      query = query.eq('billing_period', billingPeriod);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      console.error('[Admin Manual Costs GET] DB error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch manual costs' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('[Admin Manual Costs GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/costs/manual
 *
 * Creates or updates a manual cost entry for a given service_name + billing_period.
 * Body: { service_name, amount_usd, billing_period, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    const { data: body, error: parseError } = await parseAdminInput(req, manualCostSchema);
    if (parseError) return parseError;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    // Upsert on (service_name, billing_period) — update if already exists
    const { data: existing } = await supabase
      .from('manual_costs')
      .select('id')
      .eq('service_name', body.service_name)
      .eq('billing_period', body.billing_period)
      .maybeSingle();

    let result;
    if (existing?.id) {
      const { data, error: updateError } = await supabase
        .from('manual_costs')
        .update({
          amount_usd: body.amount_usd,
          notes: body.notes ?? null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Admin Manual Costs POST] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update manual cost' }, { status: 500 });
      }
      result = { data, action: 'updated' };
    } else {
      const { data, error: insertError } = await supabase
        .from('manual_costs')
        .insert({
          service_name: body.service_name,
          amount_usd: body.amount_usd,
          billing_period: body.billing_period,
          notes: body.notes ?? null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Admin Manual Costs POST] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create manual cost' }, { status: 500 });
      }
      result = { data, action: 'created' };
    }

    await logAdminAction(user.id, 'manual_cost_upsert', {
      action: result.action,
      service_name: body.service_name,
      billing_period: body.billing_period,
      amount_usd: body.amount_usd,
    });

    return NextResponse.json(result, { status: result.action === 'created' ? 201 : 200 });
  } catch (err) {
    console.error('[Admin Manual Costs POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

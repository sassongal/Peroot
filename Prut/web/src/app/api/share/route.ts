import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, original_input, category, capability_mode } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shared_prompts')
      .insert({
        prompt: prompt.trim(),
        original_input: original_input?.trim() || null,
        category: category || 'General',
        capability_mode: capability_mode || 'STANDARD',
        user_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Share] Error:', error);
      return NextResponse.json({ error: 'Failed to share prompt' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('[Share] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Activity Log] Failed:', error);
  }
}

export async function getRecentActivity(limit = 50) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      profiles:user_id (email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Activity Log] Failed to fetch:', error);
    return [];
  }

  return data || [];
}

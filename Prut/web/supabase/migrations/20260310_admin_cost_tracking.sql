-- ============================================
-- Admin Dashboard: API Usage & Cost Tracking
-- ============================================

-- 1. API Usage Logs (auto-tracked per LLM request)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,          -- 'google', 'groq', 'deepseek'
    model TEXT NOT NULL,             -- 'gemini-2.0-flash', 'llama-3-70b', etc.
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    endpoint TEXT DEFAULT 'enhance', -- which API route triggered it
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider ON public.api_usage_logs(provider);

-- RLS: Admin-only access
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api_usage_logs"
    ON public.api_usage_logs FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert api_usage_logs"
    ON public.api_usage_logs FOR INSERT
    WITH CHECK (true);

-- 2. Manual Costs (admin-entered monthly bills)
CREATE TABLE IF NOT EXISTS public.manual_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,      -- 'vercel', 'supabase', 'upstash', 'resend', 'sentry', 'domain', 'other'
    amount_usd NUMERIC(10, 2) NOT NULL,
    billing_period TEXT NOT NULL,    -- '2026-03' format
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_costs_billing_period ON public.manual_costs(billing_period);

-- RLS: Admin-only
ALTER TABLE public.manual_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage manual_costs"
    ON public.manual_costs FOR ALL
    USING (public.is_admin(auth.uid()));

-- Centralized email log table
-- Tracks every email sent to users from all sources
-- SECURITY: Only service_role can read/write (contains PII)

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  source TEXT NOT NULL, -- 'resend', 'lemonsqueezy', 'system'
  email_type TEXT NOT NULL, -- 'onboarding_day1', 'campaign', 'welcome', 'payment_receipt', etc.
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'delivered', 'bounced'
  resend_id TEXT, -- Resend email ID for tracking
  metadata JSONB DEFAULT '{}', -- extra context (segment, step, webhook event, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_user_id_idx ON public.email_logs (user_id);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_source_idx ON public.email_logs (source);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Restrict to service_role only — admin API uses service client
CREATE POLICY "Service role full access on email_logs"
  ON public.email_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

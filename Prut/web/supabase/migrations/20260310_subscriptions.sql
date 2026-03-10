-- Subscriptions table for LemonSqueezy integration
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemonsqueezy_subscription_id TEXT,
  lemonsqueezy_customer_id TEXT,
  variant_id INTEGER,
  status TEXT NOT NULL DEFAULT 'free', -- free, active, cancelled, expired, paused, past_due, on_trial, unpaid
  plan_name TEXT NOT NULL DEFAULT 'Free',
  customer_email TEXT,
  customer_name TEXT,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_id ON subscriptions(lemonsqueezy_subscription_id);

-- RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (webhook handler) can do everything — no policy needed, uses service key

-- Optional: Webhook events table for debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  body JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS on webhook_events — only accessed server-side with service key

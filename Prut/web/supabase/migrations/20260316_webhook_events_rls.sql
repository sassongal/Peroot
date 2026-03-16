-- Enable RLS on webhook_events table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Deny all access for anon role
CREATE POLICY "Deny anon access on webhook_events"
  ON webhook_events
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

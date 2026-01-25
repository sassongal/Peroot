-- Migration: Update prompt_usage_events event_type constraint
-- Description: Adds 'enhance' to the allowed event types

ALTER TABLE public.prompt_usage_events 
DROP CONSTRAINT IF EXISTS prompt_usage_events_event_type_check;

ALTER TABLE public.prompt_usage_events 
ADD CONSTRAINT prompt_usage_events_event_type_check 
CHECK (event_type IN ('copy', 'save', 'refine', 'enhance'));

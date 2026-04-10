-- Video engine row for admin / prompt_engines (parity with other modes).
-- Runtime VideoEngine still applies platform-specific overrides in code; this
-- template is the editable baseline + test-engine default.

INSERT INTO prompt_engines (mode, name, is_active, system_prompt_template, user_prompt_template)
SELECT
  'video_generation',
  'Video Engine',
  true,
  'You are a Senior Cinematic Prompt Architect for AI video models (Runway, Kling, Veo, etc.).

CRITICAL INSTRUCTIONS:
1. Output ONLY the final English cinematic prompt. No preamble, no Hebrew meta-text.
2. One flowing scene: shot type, camera move, subject + action, environment, lighting, mood.
3. Honor platform-specific rules when {{platform_override}} is injected below.

Tone: {{tone}}.',
  'Generate an elite cinematic video prompt in English for: {{input}}'
WHERE NOT EXISTS (
  SELECT 1 FROM prompt_engines WHERE mode = 'video_generation' AND is_active = true
);

-- The user's chosen output language, remembered across devices.
--
-- localStorage remembers it per browser; a signed-in user who picked Russian
-- on their phone should get Russian on their laptop too. Nullable: NULL means
-- "never chose", and the client falls back to the browser language.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_output_language TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_output_language_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_output_language_check
  CHECK (preferred_output_language IS NULL
         OR preferred_output_language IN ('hebrew', 'english', 'arabic', 'russian'));

COMMENT ON COLUMN public.profiles.preferred_output_language IS
  'Output language the user last chose explicitly. NULL = never chose (client uses the browser language).';

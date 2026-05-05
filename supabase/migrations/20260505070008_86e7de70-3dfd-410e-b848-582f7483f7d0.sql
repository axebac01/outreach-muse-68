ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_industry text,
  ADD COLUMN IF NOT EXISTS company_tone text,
  ADD COLUMN IF NOT EXISTS company_key_offerings text[],
  ADD COLUMN IF NOT EXISTS company_pain_points text[],
  ADD COLUMN IF NOT EXISTS company_proof_points text[],
  ADD COLUMN IF NOT EXISTS company_raw_markdown text;
ALTER TABLE public.launch_interest
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'waitlist_2026_august';
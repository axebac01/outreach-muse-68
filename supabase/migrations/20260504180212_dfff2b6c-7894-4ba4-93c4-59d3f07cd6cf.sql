
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS sender_name text;

CREATE TABLE IF NOT EXISTS public.unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  sequence_id uuid,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

ALTER TABLE public.unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unsubscribes"
  ON public.unsubscribes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unsubscribes"
  ON public.unsubscribes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own unsubscribes"
  ON public.unsubscribes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_unsubscribes_user_email
  ON public.unsubscribes(user_id, lower(email));

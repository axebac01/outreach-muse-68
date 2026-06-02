CREATE TABLE public.launch_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, feature)
);

GRANT INSERT ON public.launch_interest TO anon;
GRANT INSERT ON public.launch_interest TO authenticated;
GRANT ALL ON public.launch_interest TO service_role;

ALTER TABLE public.launch_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register interest"
ON public.launch_interest
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);
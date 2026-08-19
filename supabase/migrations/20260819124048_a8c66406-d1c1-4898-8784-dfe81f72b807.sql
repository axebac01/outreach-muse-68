CREATE TABLE public.unsubscribe_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  email text,
  token_kind text,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.unsubscribe_events TO authenticated;
GRANT ALL ON public.unsubscribe_events TO service_role;
ALTER TABLE public.unsubscribe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own unsubscribe events"
  ON public.unsubscribe_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX idx_unsubscribe_events_user_created ON public.unsubscribe_events (user_id, created_at DESC);
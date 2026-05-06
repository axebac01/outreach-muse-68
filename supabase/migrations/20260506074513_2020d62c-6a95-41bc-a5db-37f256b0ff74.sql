ALTER TABLE public.visits 
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS scroll_depth integer,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS visits_visitor_session_idx ON public.visits(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS visits_session_idx ON public.visits(session_id);
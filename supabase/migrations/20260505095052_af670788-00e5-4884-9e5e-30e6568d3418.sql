
CREATE TABLE public.integration_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_integration_api_keys_user ON public.integration_api_keys(user_id);
CREATE INDEX idx_integration_api_keys_hash ON public.integration_api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.integration_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys" ON public.integration_api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own api keys" ON public.integration_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own api keys" ON public.integration_api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own api keys" ON public.integration_api_keys FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.lead_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  api_key_id uuid REFERENCES public.integration_api_keys(id) ON DELETE SET NULL,
  source text,
  payload_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  target_type text,
  target_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_import_log_user ON public.lead_import_log(user_id, created_at DESC);

ALTER TABLE public.lead_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own import log" ON public.lead_import_log FOR SELECT USING (auth.uid() = user_id);


-- 1. Revoke EXECUTE on internal SECURITY DEFINER functions from clients.
-- These are trigger functions or internal helpers, not meant to be called via PostgREST.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_email_account() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_sequence_for_campaign() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_sequence_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_secret(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_secret(bytea, text) FROM PUBLIC, anon, authenticated;

-- 2. Explicit deny on dsr_requests for anon/authenticated clients (service-role bypasses RLS).
CREATE POLICY "Deny client read on dsr_requests"
ON public.dsr_requests
FOR SELECT TO anon, authenticated
USING (false);

CREATE POLICY "Deny client write on dsr_requests"
ON public.dsr_requests
FOR INSERT TO anon, authenticated
WITH CHECK (false);

-- 3. Allow users to delete their own tracking data (GDPR right-to-erasure self-service).
CREATE POLICY "Users can delete their own visits"
ON public.visits
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visitors"
ON public.visitors
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bounces"
ON public.bounces
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4. Security audit log
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id_created_at ON public.audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_log_event_type ON public.audit_log (event_type);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit entries"
ON public.audit_log
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Inserts via service role only (no INSERT policy for clients).


CREATE POLICY "Users insert own audit entries"
ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_email_created
  ON public.dsr_requests (LOWER(email), created_at DESC);

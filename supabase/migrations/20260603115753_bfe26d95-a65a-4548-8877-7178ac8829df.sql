-- Convert deny-all PERMISSIVE policies on dsr_requests to RESTRICTIVE
DROP POLICY IF EXISTS "Deny client read on dsr_requests" ON public.dsr_requests;
DROP POLICY IF EXISTS "Deny client write on dsr_requests" ON public.dsr_requests;

CREATE POLICY "Deny client read on dsr_requests"
ON public.dsr_requests
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Deny client write on dsr_requests"
ON public.dsr_requests
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

-- Restrict Realtime channel subscriptions: only allow postgres_changes (which still enforces table RLS).
-- Deny broadcast and presence on all topics from anon/authenticated clients.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can use postgres_changes only" ON realtime.messages;
CREATE POLICY "Authenticated can use postgres_changes only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.messages.extension = 'postgres_changes')
);

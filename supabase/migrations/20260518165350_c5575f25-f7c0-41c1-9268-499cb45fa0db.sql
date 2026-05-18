CREATE TABLE public.dsr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'deletion', 'rectification', 'portability', 'objection', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_dsr_requests_email ON public.dsr_requests(LOWER(email));
CREATE INDEX idx_dsr_requests_status ON public.dsr_requests(status);

ALTER TABLE public.dsr_requests ENABLE ROW LEVEL SECURITY;

-- No client-side reads or writes: submissions go through an edge function
-- using the service role. This prevents enumeration of DSR requests and
-- abuse of the submission endpoint.
-- (Intentionally no policies — table is locked to service role only.)

CREATE TRIGGER set_dsr_updated_at
BEFORE UPDATE ON public.dsr_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- =========================================
-- SEQUENCES
-- =========================================
CREATE TABLE public.sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled sequence',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | completed
  timezone TEXT NOT NULL DEFAULT 'UTC',
  start_at TIMESTAMP WITH TIME ZONE,
  sending_days JSONB NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  sending_window_start TEXT NOT NULL DEFAULT '09:00',
  sending_window_end TEXT NOT NULL DEFAULT '17:00',
  pause_on_reply BOOLEAN NOT NULL DEFAULT true,
  daily_limit_per_account INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequences" ON public.sequences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sequences" ON public.sequences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sequences" ON public.sequences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sequences" ON public.sequences
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_sequences_updated_at
  BEFORE UPDATE ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- SEQUENCE LEADS
-- =========================================
CREATE TABLE public.sequence_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  phone TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | replied | completed | bounced
  current_step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sequence_leads_sequence ON public.sequence_leads(sequence_id);
CREATE INDEX idx_sequence_leads_email ON public.sequence_leads(email);

ALTER TABLE public.sequence_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequence leads" ON public.sequence_leads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sequence leads" ON public.sequence_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sequence leads" ON public.sequence_leads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sequence leads" ON public.sequence_leads
  FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- SEQUENCE STEPS
-- =========================================
CREATE TABLE public.sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  step_order INTEGER NOT NULL,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  wait_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);

CREATE INDEX idx_sequence_steps_sequence ON public.sequence_steps(sequence_id);

ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequence steps" ON public.sequence_steps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sequence steps" ON public.sequence_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sequence steps" ON public.sequence_steps
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sequence steps" ON public.sequence_steps
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_sequence_steps_updated_at
  BEFORE UPDATE ON public.sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- SEQUENCE SENDERS
-- =========================================
CREATE TABLE public.sequence_senders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, email_account_id)
);

CREATE INDEX idx_sequence_senders_sequence ON public.sequence_senders(sequence_id);

ALTER TABLE public.sequence_senders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequence senders" ON public.sequence_senders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sequence senders" ON public.sequence_senders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sequence senders" ON public.sequence_senders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sequence senders" ON public.sequence_senders
  FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- SCHEDULED SENDS
-- =========================================
CREATE TABLE public.scheduled_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.sequence_leads(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.sequence_steps(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | sent | failed | skipped
  sent_message_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_sends_due ON public.scheduled_sends(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_sends_sequence ON public.scheduled_sends(sequence_id);
CREATE INDEX idx_scheduled_sends_lead ON public.scheduled_sends(lead_id);

ALTER TABLE public.scheduled_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled sends" ON public.scheduled_sends
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own scheduled sends" ON public.scheduled_sends
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scheduled sends" ON public.scheduled_sends
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled sends" ON public.scheduled_sends
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_scheduled_sends_updated_at
  BEFORE UPDATE ON public.scheduled_sends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
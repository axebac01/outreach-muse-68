CREATE INDEX IF NOT EXISTS idx_scheduled_sends_processing ON public.scheduled_sends (updated_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_scheduled_sends_status_seq ON public.scheduled_sends (sequence_id, status);
CREATE INDEX IF NOT EXISTS idx_sequence_leads_seq_status ON public.sequence_leads (sequence_id, status);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON public.email_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_campaign ON public.sequences (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON public.sequence_steps (sequence_id, step_order);
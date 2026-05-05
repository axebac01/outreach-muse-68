-- Extend email_messages
ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequence_id uuid,
  ADD COLUMN IF NOT EXISTS snippet text,
  ADD COLUMN IF NOT EXISTS message_id_header text,
  ADD COLUMN IF NOT EXISTS thread_key text;

CREATE INDEX IF NOT EXISTS idx_email_messages_user_thread
  ON public.email_messages(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_user_received
  ON public.email_messages(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id_header
  ON public.email_messages(message_id_header);

-- email_threads cache
CREATE TABLE IF NOT EXISTS public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_account_id uuid NOT NULL,
  thread_key text NOT NULL,
  subject text,
  participants text[] NOT NULL DEFAULT '{}',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_snippet text,
  last_direction text,
  unread_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  lead_id uuid,
  sequence_id uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_account_id, thread_key)
);

CREATE INDEX IF NOT EXISTS idx_email_threads_user_last
  ON public.email_threads(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_unread
  ON public.email_threads(user_id) WHERE unread_count > 0;

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads"
  ON public.email_threads FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own threads"
  ON public.email_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads"
  ON public.email_threads FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads"
  ON public.email_threads FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_email_threads_updated_at
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.email_messages REPLICA IDENTITY FULL;
ALTER TABLE public.email_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_threads;
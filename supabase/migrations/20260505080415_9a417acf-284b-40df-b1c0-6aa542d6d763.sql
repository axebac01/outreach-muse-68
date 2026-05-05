
ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS sentiment text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS suggested_reply text,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_analysis_error text;

ALTER TABLE public.email_threads
  ADD COLUMN IF NOT EXISTS last_sentiment text,
  ADD COLUMN IF NOT EXISTS last_category text;

CREATE INDEX IF NOT EXISTS idx_email_threads_user_sentiment
  ON public.email_threads(user_id, last_sentiment);

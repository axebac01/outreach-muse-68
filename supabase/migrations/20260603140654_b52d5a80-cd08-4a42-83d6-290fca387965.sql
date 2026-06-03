DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'credit_wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_wallets;
  END IF;
END$$;
ALTER TABLE public.credit_wallets REPLICA IDENTITY FULL;
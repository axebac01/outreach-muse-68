
-- 1) Rensa ALL befintlig data först
TRUNCATE TABLE public.scheduled_sends RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sequence_senders RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sequence_steps RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sequence_leads RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sequences RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.leads RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.campaigns RESTART IDENTITY CASCADE;

-- 2) Droppa gamla AI-genereringstabellen och leads-tabellen
DROP TABLE IF EXISTS public.generated_outreach CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;

-- 3) Koppla sequences <-> campaigns 1:1
ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS campaign_id uuid UNIQUE
  REFERENCES public.campaigns(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sequences_campaign_id ON public.sequences(campaign_id);

-- 4) Trigger: när en kampanj skapas, skapa automatiskt en kopplad sekvens
CREATE OR REPLACE FUNCTION public.create_sequence_for_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sequences (user_id, name, campaign_id, timezone)
  VALUES (NEW.user_id, NEW.name, NEW.id, COALESCE(NULLIF(current_setting('app.tz', true), ''), 'UTC'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_create_sequence ON public.campaigns;
CREATE TRIGGER trg_campaigns_create_sequence
AFTER INSERT ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.create_sequence_for_campaign();

-- 5) Synka sekvens-namn när kampanjnamn ändras
CREATE OR REPLACE FUNCTION public.sync_sequence_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.sequences SET name = NEW.name WHERE campaign_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_sync_sequence_name ON public.campaigns;
CREATE TRIGGER trg_campaigns_sync_sequence_name
AFTER UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.sync_sequence_name();

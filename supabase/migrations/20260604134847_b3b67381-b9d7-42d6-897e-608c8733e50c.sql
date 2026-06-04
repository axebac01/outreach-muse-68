
CREATE OR REPLACE FUNCTION public.rearm_paused_sends_on_account_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    UPDATE public.scheduled_sends
       SET status = 'scheduled',
           error_message = NULL,
           scheduled_for = now()
     WHERE email_account_id = NEW.id
       AND status = 'paused_account_error';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_accounts_rearm_sends
AFTER UPDATE OF status ON public.email_accounts
FOR EACH ROW EXECUTE FUNCTION public.rearm_paused_sends_on_account_active();

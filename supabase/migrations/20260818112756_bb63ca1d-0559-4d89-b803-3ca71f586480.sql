WITH bad AS (
  SELECT id FROM public.sequence_leads
   WHERE sequence_id = '48fd4785-06d2-4c29-929d-11ea05084a7e'
     AND (
       split_part(lower(email), '@', 2) IN ('example.com','example.org','example.net','example.se','exempel.se','domain.com','company.com','test.com','test.se')
       OR split_part(lower(email), '@', 1) ~ '^(john|jane)[._-]?(doe|smith)[0-9]*$'
       OR split_part(lower(email), '@', 1) ~ '^(example|exempel|test|dummy|sample|firstname\.lastname)[._-]?[0-9]*$'
       OR full_name ~ '[\[\]{}<>]'
       OR full_name ~* '\m(john doe|jane doe|jane smith|john smith|name surname|name here|cfo name|ceo name|first name|last name)\M'
     )
)
UPDATE public.scheduled_sends ss
   SET status = 'cancelled',
       cancelled_reason = 'invalid_address',
       updated_at = now()
 WHERE ss.lead_id IN (SELECT id FROM bad)
   AND ss.status = 'scheduled';

UPDATE public.sequence_leads
   SET status = 'invalid'
 WHERE sequence_id = '48fd4785-06d2-4c29-929d-11ea05084a7e'
   AND status NOT IN ('bounced','replied','unsubscribed')
   AND (
     split_part(lower(email), '@', 2) IN ('example.com','example.org','example.net','example.se','exempel.se','domain.com','company.com','test.com','test.se')
     OR split_part(lower(email), '@', 1) ~ '^(john|jane)[._-]?(doe|smith)[0-9]*$'
     OR split_part(lower(email), '@', 1) ~ '^(example|exempel|test|dummy|sample|firstname\.lastname)[._-]?[0-9]*$'
     OR full_name ~ '[\[\]{}<>]'
     OR full_name ~* '\m(john doe|jane doe|jane smith|john smith|name surname|name here|cfo name|ceo name|first name|last name)\M'
   );
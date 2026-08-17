
-- 1. Rensa avregistrering från förra testet
delete from public.unsubscribes
where user_id = '0fed83ec-a0eb-4290-a868-8281c1c26b76'
  and email = 'axebac01@gmail.com';

-- 2. Ta bort det tomma placeholder-steget
delete from public.sequence_steps
where sequence_id = '4ed83fca-78ef-48eb-ab3d-021ef2e74843'
  and step_order = 0;

-- 3. Ämnesrader med å/ä/ö
update public.sequence_steps set subject = '[TEST 1/3] Hej {{first_name}} – kort fråga om {{company}} (åäö)'
where id = '033c755b-40f8-4513-9a6c-149752c52541';
update public.sequence_steps set subject = '[TEST 2/3] Uppföljning till {{first_name}} – återkoppling önskas'
where id = '1b704c78-0deb-4007-b657-f36b7d1e8826';
update public.sequence_steps set subject = '[TEST 3/3] Sista påminnelsen, {{first_name}} – trevlig sommar'
where id = 'a0fcca1f-97dd-490f-b9ca-697a0ef602a7';

-- 4. Avsändarnamn med svenska tecken på ett konto
update public.email_accounts set sender_name = 'Kevin Hermansson – Bisdata Försäljning'
where id = 'e80d998e-81ae-4ebf-98f2-c178cb261e0a';

-- 5. Uteslut gammalt duplicat och den ogiltiga adressen från detta test
update public.sequence_leads set status = 'completed'
where id in ('39eb58b8-8938-4b68-aa76-25c784f9e07e','5afb14a6-199b-4e12-a342-e06bd7f1a96a');

-- 6. Återställ de tre riktiga testmottagarna
update public.sequence_leads set status = 'active', current_step = 0
where id in (
  'ae0a82f5-a577-45d1-9b85-54708dea8ced',
  '137183b2-4840-48ce-9ded-b65c21060a93',
  '2eab1fe1-1190-4074-b331-f5659735f461'
);

-- 7. Schemalägg steg 1 direkt, ett konto per mottagare
insert into public.scheduled_sends
  (sequence_id, lead_id, step_id, email_account_id, user_id, scheduled_for, status)
values
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','ae0a82f5-a577-45d1-9b85-54708dea8ced','033c755b-40f8-4513-9a6c-149752c52541','e80d998e-81ae-4ebf-98f2-c178cb261e0a','0fed83ec-a0eb-4290-a868-8281c1c26b76', now(), 'scheduled'),
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','137183b2-4840-48ce-9ded-b65c21060a93','033c755b-40f8-4513-9a6c-149752c52541','ee1df3f0-627f-4c47-b3a3-c87c48fae8b7','0fed83ec-a0eb-4290-a868-8281c1c26b76', now(), 'scheduled'),
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','2eab1fe1-1190-4074-b331-f5659735f461','033c755b-40f8-4513-9a6c-149752c52541','9ce9ed0c-e9b0-4eee-aa4c-9205f96b598b','0fed83ec-a0eb-4290-a868-8281c1c26b76', now(), 'scheduled');

-- 8. Starta kampanjen
update public.sequences set status = 'active' where id = '4ed83fca-78ef-48eb-ab3d-021ef2e74843';

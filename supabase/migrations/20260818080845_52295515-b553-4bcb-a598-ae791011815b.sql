delete from sequence_steps where id='9cff63c5-5bd4-46da-a60a-be51bf11d944';
delete from scheduled_sends where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
update sequence_leads set status='active', current_step=0 where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
insert into scheduled_sends (sequence_id, lead_id, step_id, email_account_id, user_id, scheduled_for, status)
select l.sequence_id, l.id,
  (select id from sequence_steps where sequence_id=l.sequence_id order by step_order limit 1),
  (array['ee1df3f0-627f-4c47-b3a3-c87c48fae8b7','9ce9ed0c-e9b0-4eee-aa4c-9205f96b598b','e80d998e-81ae-4ebf-98f2-c178cb261e0a']::uuid[])[((row_number() over (order by l.email)) - 1) % 3 + 1],
  l.user_id, now(), 'scheduled'
from sequence_leads l where l.sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
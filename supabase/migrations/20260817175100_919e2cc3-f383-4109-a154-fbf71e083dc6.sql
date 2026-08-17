insert into public.scheduled_sends
  (sequence_id, lead_id, step_id, email_account_id, user_id, scheduled_for, status)
values
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','ae0a82f5-a577-45d1-9b85-54708dea8ced','033c755b-40f8-4513-9a6c-149752c52541','e80d998e-81ae-4ebf-98f2-c178cb261e0a','0fed83ec-a0eb-4290-a868-8281c1c26b76', now() - interval '1 minute', 'scheduled'),
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','137183b2-4840-48ce-9ded-b65c21060a93','033c755b-40f8-4513-9a6c-149752c52541','ee1df3f0-627f-4c47-b3a3-c87c48fae8b7','0fed83ec-a0eb-4290-a868-8281c1c26b76', now() - interval '1 minute', 'scheduled'),
  ('4ed83fca-78ef-48eb-ab3d-021ef2e74843','2eab1fe1-1190-4074-b331-f5659735f461','033c755b-40f8-4513-9a6c-149752c52541','9ce9ed0c-e9b0-4eee-aa4c-9205f96b598b','0fed83ec-a0eb-4290-a868-8281c1c26b76', now() - interval '1 minute', 'scheduled');

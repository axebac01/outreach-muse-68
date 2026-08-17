update public.scheduled_sends set scheduled_for = now() - interval '1 minute'
where sequence_id = '4ed83fca-78ef-48eb-ab3d-021ef2e74843' and status = 'scheduled';
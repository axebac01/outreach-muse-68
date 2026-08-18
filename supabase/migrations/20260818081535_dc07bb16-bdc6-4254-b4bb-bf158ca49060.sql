update sequence_leads set status='active', current_step=0 where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843' and email='axebac01@gmail.com';
update scheduled_sends set status='scheduled', cancelled_reason=null, attempts=0, scheduled_for=now()
where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843' and status='cancelled' and cancelled_reason='lead_replied';
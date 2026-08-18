delete from unsubscribes where email='axebac01@gmail.com';
delete from scheduled_sends where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
delete from email_messages where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
delete from email_threads where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
update sequence_leads set status='active', current_step=0 where sequence_id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
update sequences set status='draft' where id='4ed83fca-78ef-48eb-ab3d-021ef2e74843';
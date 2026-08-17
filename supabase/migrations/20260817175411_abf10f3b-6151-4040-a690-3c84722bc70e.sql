drop policy if exists "Users can view own email accounts" on public.email_accounts;

drop policy if exists "Users can insert own email accounts" on public.email_accounts;
create policy "Users can insert own email accounts"
on public.email_accounts for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own email accounts" on public.email_accounts;
create policy "Users can update own email accounts"
on public.email_accounts for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own email accounts" on public.email_accounts;
create policy "Users can delete own email accounts"
on public.email_accounts for delete to authenticated
using (auth.uid() = user_id);

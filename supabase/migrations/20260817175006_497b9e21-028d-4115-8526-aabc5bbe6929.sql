create table if not exists public.unsubscribe_links (
  id text primary key,
  user_id uuid not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

grant all on public.unsubscribe_links to service_role;

alter table public.unsubscribe_links enable row level security;

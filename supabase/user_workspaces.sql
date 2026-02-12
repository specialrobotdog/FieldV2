create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.user_workspaces enable row level security;

drop policy if exists "Users can read their own workspace" on public.user_workspaces;
create policy "Users can read their own workspace"
on public.user_workspaces
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can upsert their own workspace" on public.user_workspaces;
create policy "Users can upsert their own workspace"
on public.user_workspaces
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workspace" on public.user_workspaces;
create policy "Users can update their own workspace"
on public.user_workspaces
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

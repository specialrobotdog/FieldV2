drop table if exists public.user_workspaces cascade;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.fields (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create table if not exists public.items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  field_id text not null,
  src text not null,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  constraint items_field_fk foreign key (user_id, field_id)
    references public.fields (user_id, id)
    on delete cascade
);

create index if not exists items_user_field_position_idx
  on public.items (user_id, field_id, position);

alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.items enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.fields from anon;
revoke all on table public.items from anon;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fields_select_own" on public.fields;
create policy "fields_select_own"
on public.fields
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fields_insert_own" on public.fields;
create policy "fields_insert_own"
on public.fields
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "fields_update_own" on public.fields;
create policy "fields_update_own"
on public.fields
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "fields_delete_own" on public.fields;
create policy "fields_delete_own"
on public.fields
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
on public.items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
on public.items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
on public.items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
on public.items
for delete
to authenticated
using (auth.uid() = user_id);

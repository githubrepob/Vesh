begin;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  content text not null,
  memory_type text not null default 'fact',
  source text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint memories_memory_key_length
    check (char_length(memory_key) between 1 and 120),
  constraint memories_content_length
    check (char_length(content) between 1 and 2000),
  constraint memories_memory_type_check
    check (memory_type in ('fact', 'preference', 'goal', 'project', 'instruction')),
  constraint memories_source_check
    check (source in ('user', 'conversation'))
);

create unique index if not exists memories_user_key_unique
  on public.memories (user_id, lower(memory_key));

create index if not exists memories_user_updated_idx
  on public.memories (user_id, updated_at desc);

alter table public.memories enable row level security;

drop policy if exists "Users can read their own memories"
  on public.memories;
create policy "Users can read their own memories"
  on public.memories
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own memories"
  on public.memories;
create policy "Users can create their own memories"
  on public.memories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own memories"
  on public.memories;
create policy "Users can update their own memories"
  on public.memories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own memories"
  on public.memories;
create policy "Users can delete their own memories"
  on public.memories
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.memories from anon;
grant select, insert, update, delete on public.memories to authenticated;

-- The initial schema migration creates this shared trigger function.
drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

commit;

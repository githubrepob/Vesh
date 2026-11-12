
-- =========================================================
-- VESH: Initial production data foundation
-- Profiles, conversations, messages, RLS and auth trigger
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. Shared updated_at trigger
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 2. User profiles
-- One profile per Supabase Auth user
-- ---------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) <= 80)
);

-- ---------------------------------------------------------
-- 3. Conversations
-- Every conversation belongs to exactly one user
-- ---------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  title text not null default 'New conversation',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_title_length
    check (char_length(title) between 1 and 160),

  -- Composite key supports ownership-safe message references.
  constraint conversations_id_user_id_key
    unique (id, user_id)
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- ---------------------------------------------------------
-- 4. Messages
-- Each message belongs to a conversation and its owner
-- ---------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null,
  user_id uuid not null,

  role text not null,
  content text not null,

  created_at timestamptz not null default now(),

  constraint messages_role_check
    check (role in ('user', 'assistant')),

  constraint messages_content_length
    check (char_length(content) between 1 and 20000),

  constraint messages_conversation_owner_fkey
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);

create index if not exists messages_user_created_idx
  on public.messages (user_id, created_at desc);

-- ---------------------------------------------------------
-- 5. Keep updated_at current
-- ---------------------------------------------------------

drop trigger if exists profiles_set_updated_at
  on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at
  on public.conversations;

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 6. Create profile automatically after signup
-- ---------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      left(
        coalesce(new.raw_user_meta_data ->> 'display_name', ''),
        80
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 7. Enable Row Level Security
-- ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- ---------------------------------------------------------
-- 8. Profile policies
-- ---------------------------------------------------------

drop policy if exists "Users can read their own profile"
  on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile"
  on public.profiles;

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- ---------------------------------------------------------
-- 9. Conversation policies
-- ---------------------------------------------------------

drop policy if exists "Users can read their own conversations"
  on public.conversations;

create policy "Users can read their own conversations"
on public.conversations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own conversations"
  on public.conversations;

create policy "Users can create their own conversations"
on public.conversations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own conversations"
  on public.conversations;

create policy "Users can update their own conversations"
on public.conversations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own conversations"
  on public.conversations;

create policy "Users can delete their own conversations"
on public.conversations
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------
-- 10. Message policies
-- ---------------------------------------------------------

drop policy if exists "Users can read their own messages"
  on public.messages;

create policy "Users can read their own messages"
on public.messages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create messages in their conversations"
  on public.messages;

create policy "Users can create messages in their conversations"
on public.messages
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete their own messages"
  on public.messages;

create policy "Users can delete their own messages"
on public.messages
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------
-- 11. Restrict direct table privileges
-- ---------------------------------------------------------

revoke all on public.profiles from anon;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;

grant select, update on public.profiles to authenticated;

grant select, insert, update, delete
  on public.conversations to authenticated;

grant select, insert, delete
  on public.messages to authenticated;

commit;

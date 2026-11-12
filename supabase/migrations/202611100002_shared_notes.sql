begin;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_length check (char_length(title) between 1 and 160),
  constraint notes_content_length check (char_length(content) <= 12000)
);

create index if not exists notes_user_updated_idx on public.notes(user_id, pinned desc, updated_at desc);
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_productivity_updated_at();

alter table public.notes enable row level security;
drop policy if exists "Users manage their own notes" on public.notes;
create policy "Users manage their own notes" on public.notes for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

commit;

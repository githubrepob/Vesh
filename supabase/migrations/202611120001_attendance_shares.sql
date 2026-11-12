begin;

create table if not exists public.attendance_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  current_streak integer not null check (current_streak >= 0),
  total_days integer not null check (total_days >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint attendance_shares_token_length check (char_length(token) between 32 and 100)
);

create index if not exists attendance_shares_user_created_idx
  on public.attendance_shares(user_id, created_at desc);

alter table public.attendance_shares enable row level security;

drop policy if exists "Users can create their own attendance shares" on public.attendance_shares;
drop policy if exists "Users can read their own attendance shares" on public.attendance_shares;
drop policy if exists "Users can revoke their own attendance shares" on public.attendance_shares;
drop policy if exists "Anyone can view active public attendance shares" on public.attendance_shares;

create policy "Users can create their own attendance shares"
  on public.attendance_shares for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can read their own attendance shares"
  on public.attendance_shares for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can revoke their own attendance shares"
  on public.attendance_shares for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Anyone can view active public attendance shares"
  on public.attendance_shares for select to anon
  using (active = true);

revoke all on public.attendance_shares from anon;
grant select (token, current_streak, total_days, active, created_at) on public.attendance_shares to anon;
grant select, insert, update on public.attendance_shares to authenticated;

commit;

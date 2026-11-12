begin;

create table if not exists public.user_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attendance_date date not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),

  constraint user_attendance_timezone_length
    check (char_length(timezone) between 1 and 100),

  constraint user_attendance_user_date_unique
    unique (user_id, attendance_date)
);

create index if not exists user_attendance_user_date_desc_idx
  on public.user_attendance (user_id, attendance_date desc);

alter table public.user_attendance enable row level security;

drop policy if exists "Users can read their own attendance"
  on public.user_attendance;

create policy "Users can read their own attendance"
  on public.user_attendance
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own attendance"
  on public.user_attendance;

create policy "Users can create their own attendance"
  on public.user_attendance
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.user_attendance from anon;
grant select, insert on public.user_attendance to authenticated;

commit;
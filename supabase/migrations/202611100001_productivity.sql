begin;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  target_date date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_title_length check (char_length(title) between 1 and 160),
  constraint goals_description_length check (char_length(description) <= 4000)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  scheduled_at timestamptz,
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(title) between 1 and 160),
  constraint tasks_description_length check (char_length(description) <= 4000),
  constraint tasks_due_after_schedule check (due_at is null or scheduled_at is null or due_at >= scheduled_at)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text not null default '',
  event_type text not null default 'event' check (event_type in ('deadline','objective','event')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_length check (char_length(title) between 1 and 160),
  constraint calendar_events_description_length check (char_length(description) <= 4000),
  constraint calendar_events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists goals_user_target_idx on public.goals(user_id, target_date);
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists calendar_events_user_start_idx on public.calendar_events(user_id, starts_at);

create or replace function public.set_productivity_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_productivity_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_productivity_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events
for each row execute function public.set_productivity_updated_at();

alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

create policy "Users manage their own goals" on public.goals for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own tasks" on public.tasks for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own calendar events" on public.calendar_events for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.goals, public.tasks, public.calendar_events from anon;
grant select, insert, update, delete on public.goals, public.tasks, public.calendar_events to authenticated;

commit;

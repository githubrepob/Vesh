begin;

create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket, window_started_at),
  constraint api_rate_limits_bucket_length
    check (char_length(bucket) between 1 and 80)
);

create index if not exists api_rate_limits_window_idx
  on public.api_rate_limits (window_started_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_bucket is null
     or char_length(p_bucket) < 1
     or char_length(p_bucket) > 80
     or p_limit < 1
     or p_limit > 1000
     or p_window_seconds < 1
     or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (
    user_id, bucket, window_started_at, request_count
  )
  values (v_user_id, p_bucket, v_window_started_at, 1)
  on conflict (user_id, bucket, window_started_at)
  do update
    set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_request_count;

  -- Opportunistic cleanup; keep only the most recent day of counters.
  delete from public.api_rate_limits
  where window_started_at < now() - interval '1 day';

  return v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon;

grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to authenticated;

commit;

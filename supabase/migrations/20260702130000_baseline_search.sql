-- Baseline migration for the Limited Search rewrite.
-- Tables were dashboard-created with 0 rows; this tightens them, adds triggers,
-- granular RLS, and a server-side rate limiter.
-- (Applied to project kvrpxrsvwwrqcvloupup via Supabase MCP on 2026-07-02.)

-- 1) Tighten conversations
alter table public.conversations
  alter column user_id set not null,
  alter column title set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.conversations
  drop constraint conversations_user_id_fkey;
alter table public.conversations
  add constraint conversations_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- 2) Tighten messages
alter table public.messages
  alter column conversation_id set not null,
  alter column query set not null,
  alter column created_at set not null,
  alter column thinking set not null,
  alter column results set default '[]'::jsonb;

update public.messages set results = '[]'::jsonb where results is null;
alter table public.messages alter column results set not null;

alter table public.messages
  drop constraint messages_conversation_id_fkey;
alter table public.messages
  add constraint messages_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade;

alter table public.messages add column if not exists mode text not null default 'chat'
  check (mode in ('chat','search'));

-- 3) Indexes
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- 4) updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- 5) RLS: replace broad ALL policies with granular ones
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users see own conversations" on public.conversations;
drop policy if exists "Users see own messages" on public.messages;

create policy "conversations_select_own" on public.conversations
  for select using ((select auth.uid()) = user_id);
create policy "conversations_insert_own" on public.conversations
  for insert with check ((select auth.uid()) = user_id);
create policy "conversations_update_own" on public.conversations
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations_delete_own" on public.conversations
  for delete using ((select auth.uid()) = user_id);

create policy "messages_select_own" on public.messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy "messages_insert_own" on public.messages for insert
  with check (exists (select 1 from public.conversations c
                      where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy "messages_delete_own" on public.messages for delete
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.user_id = (select auth.uid())));

-- 6) Rate limiting: fixed-window counters; no direct client access (RLS on, no policies).
create table public.rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, action, window_start)
);
alter table public.rate_limits enable row level security;

create or replace function public.consume_rate_limit(
  p_action text, p_max int, p_window_seconds int
) returns jsonb
language plpgsql security definer
set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  if v_user is null then
    return jsonb_build_object('allowed', false, 'retry_after_sec', 0);
  end if;
  insert into public.rate_limits as rl (user_id, action, window_start, count)
  values (v_user, p_action, v_window, 1)
  on conflict (user_id, action, window_start)
  do update set count = rl.count + 1
  returning count into v_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object(
    'allowed', v_count <= p_max,
    'retry_after_sec', greatest(0, extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now()))::int)
  );
end $$;

revoke all on function public.consume_rate_limit(text, int, int) from public, anon;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated;

-- Lightweight in-app feedback ("Report an issue" on an assistant message).
-- Insert-only from the client; no update/delete policy is exposed.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index feedback_user_created_idx
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert with check ((select auth.uid()) = user_id);

create policy "feedback_select_own" on public.feedback
  for select using ((select auth.uid()) = user_id);

-- SRE Learning · progress sync schema for Supabase (run once in the SQL editor).
-- One row per user. Everyone signed in can READ the team's progress; each user can only WRITE their own row.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Expose the table to the Data API for signed-in users only (RLS below still limits rows).
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;

drop policy if exists "team can read progress" on public.progress;
create policy "team can read progress" on public.progress
  for select to authenticated using (true);

drop policy if exists "users insert own progress" on public.progress;
create policy "users insert own progress" on public.progress
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users update own progress" on public.progress;
create policy "users update own progress" on public.progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

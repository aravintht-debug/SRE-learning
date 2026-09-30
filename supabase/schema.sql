-- SRE Learning · Supabase schema (run in the SQL editor; safe to re-run).
-- Accounts: email + password; ONLY @swiftant.com addresses on the allowlist can be created (enforced below, in the database).
-- Progress: one row per user. Signed-in company users can READ the team's progress; each user can only WRITE their own row.

-- 1. Allowlist: only approved addresses can create an account.
--    Add people in Table Editor → allowed_emails (or with the insert below). Existing accounts are not affected.
create table if not exists public.allowed_emails (
  email    text primary key check (email = lower(email) and email like '%@swiftant.com'),
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security; -- no policies: not readable or writable from the site
revoke all on public.allowed_emails from anon, authenticated;

insert into public.allowed_emails (email) values ('aravinth.t@swiftant.com') on conflict do nothing;

-- 2. Only company email addresses on the allowlist can create an account.
create or replace function public.enforce_company_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(new.email) not like '%@swiftant.com' then
    raise exception 'Only @swiftant.com email addresses can sign up';
  end if;
  if not exists (select 1 from public.allowed_emails a where a.email = lower(new.email)) then
    raise exception 'This address is not on the SRE Learning allowlist';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_company_email on auth.users;
create trigger enforce_company_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_company_email();

-- 3. Progress table.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

-- Exposed to the Data API for signed-in users only (RLS below still limits rows).
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;

drop policy if exists "team can read progress" on public.progress;
create policy "team can read progress" on public.progress
  for select to authenticated
  using ((auth.jwt() ->> 'email') ilike '%@swiftant.com');

drop policy if exists "users insert own progress" on public.progress;
create policy "users insert own progress" on public.progress
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'email') ilike '%@swiftant.com');

drop policy if exists "users update own progress" on public.progress;
create policy "users update own progress" on public.progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (auth.jwt() ->> 'email') ilike '%@swiftant.com');

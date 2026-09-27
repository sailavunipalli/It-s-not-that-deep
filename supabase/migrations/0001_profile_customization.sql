-- =========================================================
--   0001_profile_customization.sql
--   Adds profile image + a 14-day display name lock.
--
--   Run this in Supabase Studio -> SQL Editor -> New query -> Run.
--   The 14-day lock is enforced here, in Postgres, on purpose. A cooldown
--   checked in JavaScript is bypassed by anyone who opens devtools.
-- =========================================================

-- 1. Columns -------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists display_name_updated_at timestamptz;

-- Existing rows start their clock now, so nobody is locked out on day one.
update public.profiles
   set display_name_updated_at = now()
 where display_name_updated_at is null;

-- 2. The lock ------------------------------------------------------------
create or replace function public.enforce_display_name_cooldown()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.display_name is distinct from old.display_name then
    if old.display_name_updated_at is not null
       and now() < old.display_name_updated_at + interval '14 days' then
      raise exception
        'Display name can only be changed once every 14 days. Next available: %',
        to_char(old.display_name_updated_at + interval '14 days', 'YYYY-MM-DD HH24:MI');
    end if;

    new.display_name_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_display_name_cooldown on public.profiles;

create trigger profiles_display_name_cooldown
  before update on public.profiles
  for each row
  execute function public.enforce_display_name_cooldown();

-- 3. Allow a user to edit their own row (avatar path lives here too) -----
drop policy if exists "update own profile" on public.profiles;

create policy "update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

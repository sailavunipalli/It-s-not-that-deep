-- =========================================================
--   0003_fly_likes.sql
--   First primitive of the reward system: a like on a Fly.
--
--   Design: a row per like, not a counter column. The primary key
--   (fly_id, user_id) makes repeat calls a no-op at the database
--   level, so a double-click cannot double-count, and it is what
--   lets the button know whether *this* viewer already liked it.
--   That is also what makes undo possible.
--
--   Row-per-like is an event log. Timestamps and per-user rows mean a
--   later weighting, points or tiers layer drops on top without
--   reshaping anything.
--
--   Counts are readable by anon on purpose: a count is not identity.
--
--   Run in Supabase Studio -> SQL Editor -> New query -> Run.
-- =========================================================

create table if not exists public.fly_likes (
  fly_id     uuid        not null references public.flies(id)   on delete cascade,
  user_id    uuid        not null references auth.users(id)     on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fly_id, user_id)
);

-- No index beyond the primary key. It already leads with fly_id, which
-- is the only column the counts below filter on.

alter table public.fly_likes enable row level security;

-- Deliberately no policies on fly_likes. The anon role has no direct
-- access to this table at all; every read and write goes through the
-- three functions below, each of which checks auth.uid() itself.


-- =========================================================
--   Public read: count plus whether the current viewer liked it.
--   auth.uid() is null for an anonymous caller, so viewer_has_liked
--   is simply false for them. No special-casing needed.
-- =========================================================

create or replace function public.get_fly_like_state(p_fly_id uuid)
returns table (like_count integer, viewer_has_liked boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- An unpublished Fly is not readable, so it gets no like surface.
  if not exists (
    select 1 from public.flies f
    where f.id = p_fly_id and coalesce(f.published, false)
  ) then
    return query select 0, false;
    return;
  end if;

  return query
    select
      (select count(*)::int from public.fly_likes fl where fl.fly_id = p_fly_id),
      exists (
        select 1 from public.fly_likes fl2
        where fl2.fly_id = p_fly_id and fl2.user_id = auth.uid()
      );
end;
$$;

revoke all on function public.get_fly_like_state(uuid) from public;
grant execute on function public.get_fly_like_state(uuid) to anon, authenticated;


-- =========================================================
--   Write: like and unlike.
--
--   Self-likes are allowed, so there is no owner check here.
--   unlike_fly deliberately does NOT require the Fly to still be
--   published: if an author unpublishes a Fly you had liked, you must
--   still be able to withdraw the like, or the row is stranded forever.
-- =========================================================

create or replace function public.like_fly(p_fly_id uuid)
returns table (like_count integer, viewer_has_liked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in to like a Fly.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.flies f
    where f.id = p_fly_id and coalesce(f.published, false)
  ) then
    raise exception 'That Fly is not published.' using errcode = '42501';
  end if;

  insert into public.fly_likes (fly_id, user_id)
  values (p_fly_id, v_uid)
  on conflict do nothing;

  return query
    select
      (select count(*)::int from public.fly_likes fl where fl.fly_id = p_fly_id),
      true;
end;
$$;

create or replace function public.unlike_fly(p_fly_id uuid)
returns table (like_count integer, viewer_has_liked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be signed in to remove a like.' using errcode = '42501';
  end if;

  delete from public.fly_likes
  where fly_id = p_fly_id and user_id = v_uid;

  return query
    select
      (select count(*)::int from public.fly_likes fl where fl.fly_id = p_fly_id),
      false;
end;
$$;

revoke all on function public.like_fly(uuid) from public;
revoke all on function public.unlike_fly(uuid) from public;
grant execute on function public.like_fly(uuid) to authenticated;
grant execute on function public.unlike_fly(uuid) to authenticated;

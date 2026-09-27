-- =========================================================
--   0002_public_draft_ticker.sql
--   Lets the home ticker show unpublished Flies to every visitor.
--
--   Why this exists: the ticker's orange dot advertises a claim that
--   anyone can see before its author publishes it. A direct
--   `from("flies")` select cannot do this, because Row Level Security
--   scopes rows to their author. So the ticker needs a function that
--   runs with elevated read rights.
--
--   CONSEQUENCE, DELIBERATE: publishing becomes a label, not a gate.
--   A draft claim is now world-readable the moment it is written.
--   If that is not what you want, do not run this.
--
--   Run in Supabase Studio -> SQL Editor -> New query -> Run.
-- =========================================================

-- Returns the newest Flies regardless of published state.
-- Built as jsonb so this does not depend on the column type of flies.id.
create or replace function public.get_ticker_flies()
returns setof jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id',         f.id,
    'claim',      f.claim,
    'created_at', f.created_at,
    'published',  coalesce(f.published, false)
  )
  from public.flies f
  order by f.created_at desc
  limit 12;
$$;

revoke all on function public.get_ticker_flies() from public;
grant execute on function public.get_ticker_flies() to anon, authenticated;


-- =========================================================
--   OPTIONAL, AND YOU PROBABLY WANT IT
--
--   The ticker links an orange claim to fly.html?id=... . If
--   get_public_fly filters to published rows, that link is a dead end:
--   a headline anyone can read, with no body behind it. Run the block
--   below to serve drafts from the Fly page too, so a teased claim is
--   actually readable.
--
--   Comment this whole block out if you want headline-only visibility.
-- =========================================================

-- create or replace function public.get_public_fly(fly_id uuid)
-- returns setof jsonb
-- language sql
-- security definer
-- set search_path = public
-- as $$
--   select jsonb_build_object(
--     'id',                  f.id,
--     'claim',               f.claim,
--     'description',         f.description,
--     'evidence',            f.evidence,
--     'full_story',          f.full_story,
--     'conclusion',          f.conclusion,
--     'impact',              f.impact,
--     'evidence_image_path', f.evidence_image_path,
--     'image_urls',          f.image_urls,
--     'created_at',          f.created_at,
--     'published',           coalesce(f.published, false)
--   )
--   from public.flies f
--   where f.id = fly_id;
-- $$;
--
-- revoke all on function public.get_public_fly(uuid) from public;
-- grant execute on function public.get_public_fly(uuid) to anon, authenticated;

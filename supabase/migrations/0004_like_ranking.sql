-- =========================================================
--   0004_like_ranking.sql
--   Batched like counts, so the feed can order by engagement.
--
--   WHAT THIS IS NOT: promotion. INTD does not sell placement and
--   never will. No Fly is featured, boosted or paid for. This is a
--   plain sort of the public record by how many readers liked it,
--   and nothing else influences the order.
--
--   get_public_flies() is deliberately left alone. Redefining it to
--   add like_count means restating its return signature, and guessing
--   wrong on a column type fails the whole function and takes the feed
--   down. So the counts come from here instead: one extra query per
--   feed load, returning integers only.
--
--   Run in Supabase Studio -> SQL Editor -> New query -> Run.
-- =========================================================

-- Returns like counts AND whether the caller already liked each Fly,
-- in one round trip, so a card can show a filled or outline button
-- without a second query per card. auth.uid() is null anonymously, so
-- viewer_has_liked is simply false for a signed-out reader.
create or replace function public.get_fly_like_counts(p_fly_ids uuid[])
returns table (fly_id uuid, like_count integer, viewer_has_liked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         (select count(*)::int
            from public.fly_likes fl
           where fl.fly_id = f.id),
         exists (
           select 1 from public.fly_likes fl2
           where fl2.fly_id = f.id and fl2.user_id = auth.uid()
         )
  from public.flies f
  where f.id = any(p_fly_ids)
    and coalesce(f.published, false);
$$;

revoke all on function public.get_fly_like_counts(uuid[]) from public;
grant execute on function public.get_fly_like_counts(uuid[]) to anon, authenticated;

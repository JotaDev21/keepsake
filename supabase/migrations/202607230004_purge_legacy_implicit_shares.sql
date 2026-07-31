-- Before explicit consent existed, these mirrors were automatic. They must not
-- survive the move to private-by-default: each person can opt in again.
delete from public.mood_entries entry
where not exists (
  select 1
  from public.sharing_preferences preference
  where preference.user_id = entry.author_id
    and preference.share_mood
);

delete from public.water_days entry
where not exists (
  select 1
  from public.sharing_preferences preference
  where preference.user_id = entry.author_id
    and preference.share_water
);

delete from public.songs entry
where not exists (
  select 1
  from public.sharing_preferences preference
  where preference.user_id = entry.author_id
    and preference.share_song
);

delete from public.shared_dates entry
where not exists (
  select 1
  from public.sharing_preferences preference
  where preference.user_id = entry.author_id
    and preference.share_dates
);

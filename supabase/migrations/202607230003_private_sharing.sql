-- Memory EV: consent first. Nothing in the diary becomes shared merely
-- because two devices are paired.

create table if not exists public.sharing_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  share_mood boolean not null default false,
  share_water boolean not null default false,
  share_song boolean not null default false,
  share_dates boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.sharing_preferences enable row level security;
grant select on table public.sharing_preferences to authenticated;

drop policy if exists "sharing preferences own select" on public.sharing_preferences;
create policy "sharing preferences own select" on public.sharing_preferences for select
using (user_id = auth.uid());

create or replace function public.set_sharing_preference(p_key text, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := public.my_couple_id();
  if auth.uid() is null or cid is null then return false; end if;
  if p_key not in ('mood', 'water', 'song', 'dates') then return false; end if;

  insert into public.sharing_preferences (user_id, couple_id)
  values (auth.uid(), cid)
  on conflict (user_id) do update set couple_id = excluded.couple_id;

  update public.sharing_preferences
  set share_mood = case when p_key = 'mood' then p_enabled else share_mood end,
      share_water = case when p_key = 'water' then p_enabled else share_water end,
      share_song = case when p_key = 'song' then p_enabled else share_song end,
      share_dates = case when p_key = 'dates' then p_enabled else share_dates end,
      updated_at = now()
  where user_id = auth.uid();

  if not p_enabled then
    if p_key = 'mood' then delete from public.mood_entries where author_id = auth.uid(); end if;
    if p_key = 'water' then delete from public.water_days where author_id = auth.uid(); end if;
    if p_key = 'song' then delete from public.songs where author_id = auth.uid(); end if;
    if p_key = 'dates' then delete from public.shared_dates where author_id = auth.uid(); end if;
  end if;
  return true;
end;
$$;

revoke all on function public.set_sharing_preference(text, boolean) from public;
grant execute on function public.set_sharing_preference(text, boolean) to authenticated;

-- RLS also enforces consent, so an outdated or modified client cannot publish
-- a category that the person left private. Mood notes/tags never cross devices.
create or replace function public.may_share(p_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case p_key
    when 'mood' then coalesce(share_mood, false)
    when 'water' then coalesce(share_water, false)
    when 'song' then coalesce(share_song, false)
    when 'dates' then coalesce(share_dates, false)
    else false
  end
  from public.sharing_preferences
  where user_id = auth.uid();
$$;

revoke all on function public.may_share(text) from public;
grant execute on function public.may_share(text) to authenticated;

drop policy if exists "mood insert" on public.mood_entries;
create policy "mood insert" on public.mood_entries for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('mood')
  and nota is null
  and coalesce(tags, '[]'::jsonb) = '[]'::jsonb
);
drop policy if exists "mood update" on public.mood_entries;
create policy "mood update" on public.mood_entries for update
using (author_id = auth.uid())
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('mood')
  and nota is null
  and coalesce(tags, '[]'::jsonb) = '[]'::jsonb
);

drop policy if exists "water insert" on public.water_days;
create policy "water insert" on public.water_days for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('water')
);
drop policy if exists "water update" on public.water_days;
create policy "water update" on public.water_days for update
using (author_id = auth.uid())
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('water')
);

drop policy if exists "songs write" on public.songs;
create policy "songs write" on public.songs for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('song')
);
drop policy if exists "songs update" on public.songs;
create policy "songs update" on public.songs for update
using (author_id = auth.uid())
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('song')
);

alter table public.shared_dates add column if not exists source_key text;
create unique index if not exists idx_shared_dates_author_source
  on public.shared_dates(author_id, source_key) where source_key is not null;

drop policy if exists "dates insert" on public.shared_dates;
create policy "dates insert" on public.shared_dates for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('dates')
);
drop policy if exists "dates update" on public.shared_dates;
create policy "dates update" on public.shared_dates for update
using (author_id = auth.uid())
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and public.may_share('dates')
);

create or replace function public.replace_my_shared_dates(p_dates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  item jsonb;
  inserted integer := 0;
begin
  cid := public.my_couple_id();
  if auth.uid() is null or cid is null then raise exception 'sem casal'; end if;
  if not coalesce((
    select share_dates from public.sharing_preferences where user_id = auth.uid()
  ), false) then
    delete from public.shared_dates where author_id = auth.uid();
    return 0;
  end if;
  if jsonb_typeof(p_dates) <> 'array' or jsonb_array_length(p_dates) > 100 then
    raise exception 'datas invalidas';
  end if;

  delete from public.shared_dates where author_id = auth.uid();
  for item in select value from jsonb_array_elements(p_dates)
  loop
    if length(trim(coalesce(item->>'titulo', ''))) between 1 and 80
       and coalesce((item->>'data')::bigint, 0) > 0 then
      insert into public.shared_dates (
        couple_id, author_id, titulo, data, recorrente, tipo, source_key
      )
      values (
        cid,
        auth.uid(),
        trim(item->>'titulo'),
        (item->>'data')::bigint,
        coalesce((item->>'recorrente')::boolean, false),
        case
          when item->>'tipo' in ('aniversario', 'primeiro_encontro', 'outro')
            then item->>'tipo'
          else 'outro'
        end,
        left(coalesce(item->>'source_key', extensions.gen_random_uuid()::text), 80)
      );
      inserted := inserted + 1;
    end if;
  end loop;
  return inserted;
end;
$$;

revoke all on function public.replace_my_shared_dates(jsonb) from public;
grant execute on function public.replace_my_shared_dates(jsonb) to authenticated;

create table if not exists public.shared_media (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'video', 'audio')),
  storage_path text not null,
  thumb_path text,
  legenda text,
  data_memoria bigint,
  local text,
  created_at timestamptz not null default now()
);
create index if not exists idx_shared_media_couple
  on public.shared_media(couple_id, created_at desc);
alter table public.shared_media enable row level security;
grant select, insert, update, delete on table public.shared_media to authenticated;

drop policy if exists "shared media select" on public.shared_media;
create policy "shared media select" on public.shared_media for select
using (couple_id = public.my_couple_id());
drop policy if exists "shared media insert" on public.shared_media;
create policy "shared media insert" on public.shared_media for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
  and storage_path like auth.uid()::text || '/%'
  and (thumb_path is null or thumb_path like auth.uid()::text || '/%')
);
drop policy if exists "shared media update" on public.shared_media;
create policy "shared media update" on public.shared_media for update
using (author_id = auth.uid())
with check (couple_id = public.my_couple_id() and author_id = auth.uid());
drop policy if exists "shared media delete" on public.shared_media;
create policy "shared media delete" on public.shared_media for delete
using (author_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shared-media',
  'shared-media',
  false,
  47185920,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime', 'audio/mp4', 'audio/m4a', 'audio/aac'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 47185920,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shared media couple read" on storage.objects;
create policy "shared media couple read" on storage.objects for select to authenticated
using (
  bucket_id = 'shared-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.members target
      where target.id::text = (storage.foldername(name))[1]
        and target.couple_id = public.my_couple_id()
    )
  )
);
drop policy if exists "shared media own insert" on storage.objects;
create policy "shared media own insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'shared-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "shared media own update" on storage.objects;
create policy "shared media own update" on storage.objects for update to authenticated
using (bucket_id = 'shared-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'shared-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "shared media own delete" on storage.objects;
create policy "shared media own delete" on storage.objects for delete to authenticated
using (bucket_id = 'shared-media' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  alter publication supabase_realtime add table public.sharing_preferences;
exception when duplicate_object then null;
end
$$;
do $$
begin
  alter publication supabase_realtime add table public.shared_media;
exception when duplicate_object then null;
end
$$;

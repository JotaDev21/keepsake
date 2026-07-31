-- Memory EV: identidades individuais e respostas cuidadosas ao Pulso.

alter table public.members add column if not exists avatar_path text;
alter table public.members add column if not exists updated_at timestamptz not null default now();

create or replace function public.update_member_profile(p_display_name text, p_avatar_path text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  changed integer;
begin
  if auth.uid() is null then return false; end if;
  clean_name := nullif(trim(p_display_name), '');
  if clean_name is null or char_length(clean_name) > 50 then return false; end if;
  if p_avatar_path is not null
     and p_avatar_path !~ ('^' || auth.uid()::text || '/[A-Za-z0-9._-]+$') then
    return false;
  end if;

  update public.members
  set display_name = clean_name,
      avatar_path = p_avatar_path,
      updated_at = now()
  where id = auth.uid();
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.update_member_profile(text, text) from public;
grant execute on function public.update_member_profile(text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar couple read" on storage.objects;
create policy "avatar couple read" on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.members target
      where target.id::text = (storage.foldername(name))[1]
        and target.couple_id = public.my_couple_id()
    )
  )
);

drop policy if exists "avatar own insert" on storage.objects;
create policy "avatar own insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatar own update" on storage.objects;
create policy "avatar own update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar own delete" on storage.objects;
create policy "avatar own delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.pulse_receipts (
  pulse_id uuid not null references public.quick_pulses(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  viewer_id uuid not null references public.members(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (pulse_id, viewer_id)
);
alter table public.pulse_receipts enable row level security;
grant select on table public.pulse_receipts to authenticated;

drop policy if exists "pulse receipts select" on public.pulse_receipts;
create policy "pulse receipts select" on public.pulse_receipts for select
using (couple_id = public.my_couple_id());

create or replace function public.see_quick_pulse(p_pulse_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.quick_pulses%rowtype;
begin
  select * into target
  from public.quick_pulses
  where id = p_pulse_id
    and couple_id = public.my_couple_id()
    and author_id <> auth.uid()
    and expires_at > now();
  if target.id is null then return false; end if;

  insert into public.pulse_receipts (pulse_id, couple_id, viewer_id, seen_at)
  values (target.id, target.couple_id, auth.uid(), now())
  on conflict (pulse_id, viewer_id) do update set seen_at = excluded.seen_at;
  return true;
end;
$$;

revoke all on function public.see_quick_pulse(uuid) from public;
grant execute on function public.see_quick_pulse(uuid) to authenticated;

create table if not exists public.pulse_responses (
  id uuid primary key,
  pulse_id uuid not null references public.quick_pulses(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('aqui', 'conversar', 'espaco')),
  created_at timestamptz not null default now(),
  unique (pulse_id, author_id)
);
alter table public.pulse_responses enable row level security;
grant select on table public.pulse_responses to authenticated;

drop policy if exists "pulse responses select" on public.pulse_responses;
create policy "pulse responses select" on public.pulse_responses for select
using (couple_id = public.my_couple_id());

-- Replacing a member's current pulse must atomically remove every response and
-- receipt tied to the old one. Calling this with the user's JWT preserves
-- auth.uid() even though direct writes remain closed.
create or replace function public.publish_quick_pulse(
  p_id uuid,
  p_kind text,
  p_created_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  current_pulse public.quick_pulses%rowtype;
  safe_created timestamptz;
begin
  cid := public.my_couple_id();
  if auth.uid() is null or cid is null then return 'forbidden'; end if;
  if p_kind not in ('bem', 'carinho', 'pesado', 'conversar', 'espaco') then
    return 'invalid';
  end if;
  safe_created := p_created_at;
  if safe_created < now() - interval '8 hours'
     or safe_created > now() + interval '1 minute' then
    return 'expired';
  end if;

  select * into current_pulse
  from public.quick_pulses
  where author_id = auth.uid()
  for update;

  if current_pulse.id = p_id then return 'duplicate'; end if;
  if current_pulse.id is not null and current_pulse.created_at >= safe_created then
    return 'stale';
  end if;

  if current_pulse.id is not null then
    delete from public.quick_pulses where id = current_pulse.id;
  end if;
  insert into public.quick_pulses (
    id, couple_id, author_id, kind, created_at, expires_at
  )
  values (
    p_id, cid, auth.uid(), p_kind, safe_created, safe_created + interval '8 hours'
  );
  return 'created';
end;
$$;

revoke all on function public.publish_quick_pulse(uuid, text, timestamptz) from public;
grant execute on function public.publish_quick_pulse(uuid, text, timestamptz) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.pulse_receipts;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.pulse_responses;
exception when duplicate_object then null;
end
$$;

-- Memory EV: two people, two identities, one private shared space.
-- Apply after docs/supabase.sql. Existing complete couples remain connected;
-- reusable legacy codes are disabled and incomplete invites are rotated.

create extension if not exists pgcrypto;

alter table public.couples add column if not exists invite_active boolean not null default false;
alter table public.couples add column if not exists invite_expires_at timestamptz;

-- A complete couple never keeps a reusable invite. A waiting couple receives a
-- fresh 64-bit code and a new 24-hour window.
update public.couples c
set invite_active = false,
    invite_expires_at = null
where (select count(*) from public.members m where m.couple_id = c.id) >= 2;

update public.couples c
set invite_code = upper(encode(extensions.gen_random_bytes(8), 'hex')),
    invite_active = true,
    invite_expires_at = now() + interval '24 hours'
where (select count(*) from public.members m where m.couple_id = c.id) < 2
  and (length(c.invite_code) < 16 or c.invite_expires_at is null);

create or replace function public.answers_revealed(p_couple uuid, p_day bigint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    p_couple = public.my_couple_id()
    and exists (
      select 1 from public.question_answers
      where couple_id = p_couple and dia = p_day and author_id = auth.uid()
    )
    and (
      select count(distinct author_id) from public.question_answers
      where couple_id = p_couple and dia = p_day
    ) >= 2;
$$;

-- Direct writes are split by operation. This prevents a member from deleting
-- or taking ownership of the partner's rows through a broad FOR ALL policy.
drop policy if exists "couple mood" on public.mood_entries;
drop policy if exists "mood select" on public.mood_entries;
drop policy if exists "mood insert" on public.mood_entries;
drop policy if exists "mood update" on public.mood_entries;
drop policy if exists "mood delete" on public.mood_entries;
create policy "mood select" on public.mood_entries for select
  using (couple_id = public.my_couple_id());
create policy "mood insert" on public.mood_entries for insert
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy "mood update" on public.mood_entries for update
  using (author_id = auth.uid())
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy "mood delete" on public.mood_entries for delete
  using (author_id = auth.uid());

drop policy if exists "insert own member" on public.members;
drop policy if exists "update own member" on public.members;

drop policy if exists "letters update" on public.shared_letters;

drop policy if exists "couple dates" on public.shared_dates;
drop policy if exists "dates select" on public.shared_dates;
drop policy if exists "dates insert" on public.shared_dates;
drop policy if exists "dates update" on public.shared_dates;
drop policy if exists "dates delete" on public.shared_dates;
create policy "dates select" on public.shared_dates for select
  using (couple_id = public.my_couple_id());
create policy "dates insert" on public.shared_dates for insert
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy "dates update" on public.shared_dates for update
  using (author_id = auth.uid())
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());
create policy "dates delete" on public.shared_dates for delete
  using (author_id = auth.uid());

drop policy if exists "nudges update" on public.nudges;

drop policy if exists "answers select" on public.question_answers;
create policy "answers select" on public.question_answers for select
  using (
    author_id = auth.uid()
    or (
      couple_id = public.my_couple_id()
      and public.answers_revealed(couple_id, dia)
    )
  );

create or replace function public.create_couple()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  cid uuid;
  member_count int;
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;

  select couple_id into cid from public.members where id = auth.uid() for update;
  if cid is not null then
    select count(*) into member_count from public.members where couple_id = cid;
    if member_count >= 2 then raise exception 'ja conectado'; end if;
  else
    insert into public.couples (invite_code, invite_active)
    values (upper(encode(extensions.gen_random_bytes(8), 'hex')), false)
    returning id into cid;
    insert into public.members (id, couple_id, last_seen_at)
    values (auth.uid(), cid, now())
    on conflict (id) do update
      set couple_id = excluded.couple_id, last_seen_at = now();
  end if;

  code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  update public.couples
  set invite_code = code,
      invite_active = true,
      invite_expires_at = now() + interval '24 hours'
  where id = cid;
  return code;
end;
$$;

create or replace function public.join_couple(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  current_cid uuid;
begin
  if auth.uid() is null then raise exception 'sem sessao'; end if;

  select id into cid
  from public.couples
  where invite_code = upper(regexp_replace(code, '[^a-zA-Z0-9]', '', 'g'))
    and invite_active = true
    and invite_expires_at > now()
  for update;

  if cid is null then raise exception 'codigo invalido ou expirado'; end if;

  select couple_id into current_cid from public.members where id = auth.uid() for update;
  if current_cid is not null and current_cid <> cid then
    raise exception 'aparelho ja conectado';
  end if;
  if (select count(*) from public.members where couple_id = cid and id <> auth.uid()) >= 2 then
    raise exception 'casal cheio';
  end if;

  insert into public.members (id, couple_id, last_seen_at)
  values (auth.uid(), cid, now())
  on conflict (id) do update
    set couple_id = excluded.couple_id, last_seen_at = now();

  update public.couples
  set invite_active = false, invite_expires_at = null
  where id = cid;
  return cid;
end;
$$;

create or replace function public.leave_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  select couple_id into cid from public.members where id = auth.uid() for update;
  if cid is null then return; end if;

  update public.members set couple_id = null, last_seen_at = now() where id = auth.uid();
  if not exists (select 1 from public.members where couple_id = cid) then
    delete from public.couples where id = cid;
  else
    update public.couples
    set invite_code = upper(encode(extensions.gen_random_bytes(8), 'hex')),
        invite_active = true,
        invite_expires_at = now() + interval '24 hours'
    where id = cid;
  end if;
end;
$$;

drop function if exists public.evict_partner();
create function public.evict_partner()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  code text;
begin
  select couple_id into cid from public.members where id = auth.uid() for update;
  if cid is null then raise exception 'sem casal'; end if;

  update public.members
  set couple_id = null, last_seen_at = now()
  where couple_id = cid and id <> auth.uid();

  code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  update public.couples
  set invite_code = code,
      invite_active = true,
      invite_expires_at = now() + interval '24 hours'
  where id = cid;
  return code;
end;
$$;

create or replace function public.touch_member()
returns void
language sql
security definer
set search_path = public
as $$
  update public.members set last_seen_at = now() where id = auth.uid();
$$;

create or replace function public.open_shared_letter(letter_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed int;
begin
  update public.shared_letters
  set aberta = true
  where id = letter_id
    and couple_id = public.my_couple_id()
    and author_id <> auth.uid()
    and (abrir_em is null or abrir_em <= floor(extract(epoch from now()) * 1000)::bigint);
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.mark_nudges_seen(nudge_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed int;
begin
  update public.nudges
  set seen = true
  where id = any(nudge_ids)
    and couple_id = public.my_couple_id()
    and author_id <> auth.uid();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create table if not exists public.ai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);
alter table public.ai_rate_limits enable row level security;

-- Edge Function calls this with the caller's JWT. No direct table policy is
-- exposed; the function grants at most 20 AI requests per identity per hour.
create or replace function public.claim_ai_request()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  if auth.uid() is null then return false; end if;

  insert into public.ai_rate_limits (user_id, window_started_at, request_count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when public.ai_rate_limits.window_started_at <= now() - interval '1 hour' then now()
        else public.ai_rate_limits.window_started_at
      end,
      request_count = case
        when public.ai_rate_limits.window_started_at <= now() - interval '1 hour' then 1
        else public.ai_rate_limits.request_count + 1
      end
  returning request_count <= 20 into allowed;

  return allowed;
end;
$$;

revoke all on function public.create_couple() from public;
revoke all on function public.join_couple(text) from public;
revoke all on function public.leave_couple() from public;
revoke all on function public.evict_partner() from public;
revoke all on function public.touch_member() from public;
revoke all on function public.open_shared_letter(uuid) from public;
revoke all on function public.mark_nudges_seen(uuid[]) from public;
revoke all on function public.answers_revealed(uuid, bigint) from public;
revoke all on function public.claim_ai_request() from public;

grant execute on function public.create_couple() to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.leave_couple() to authenticated;
grant execute on function public.evict_partner() to authenticated;
grant execute on function public.touch_member() to authenticated;
grant execute on function public.open_shared_letter(uuid) to authenticated;
grant execute on function public.mark_nudges_seen(uuid[]) to authenticated;
grant execute on function public.answers_revealed(uuid, bigint) to authenticated;
grant execute on function public.claim_ai_request() to authenticated;

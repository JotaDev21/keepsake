-- ev (memory ev) — esquema de sincronização. Cole TUDO isto no SQL Editor do Supabase e Run.

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists mood_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  dia bigint not null,
  humor text not null,
  intensidade int not null default 3,
  nota text,
  tags jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique (author_id, dia)
);

create table if not exists shared_letters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  titulo text not null,
  corpo text not null,
  abrir_em bigint,
  aberta boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists shared_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  titulo text not null,
  data bigint not null,
  recorrente boolean not null default false,
  tipo text not null default 'outro',
  created_at timestamptz default now()
);

create or replace function my_couple_id() returns uuid
language sql security definer stable set search_path = public as $$
  select couple_id from members where id = auth.uid();
$$;

alter table couples enable row level security;
alter table members enable row level security;
alter table mood_entries enable row level security;
alter table shared_letters enable row level security;
alter table shared_dates enable row level security;

drop policy if exists "own member" on members;
create policy "own member" on members for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "see own couple" on couples;
create policy "see own couple" on couples for select
  using (id = my_couple_id());

drop policy if exists "couple mood" on mood_entries;
create policy "couple mood" on mood_entries for all
  using (couple_id = my_couple_id())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

drop policy if exists "couple letters" on shared_letters;
create policy "couple letters" on shared_letters for all
  using (couple_id = my_couple_id())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

drop policy if exists "couple dates" on shared_dates;
create policy "couple dates" on shared_dates for all
  using (couple_id = my_couple_id())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

create or replace function create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare code text; cid uuid;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into couples (invite_code) values (code) returning id into cid;
  insert into members (id, couple_id) values (auth.uid(), cid)
    on conflict (id) do update set couple_id = excluded.couple_id;
  return code;
end; $$;

create or replace function join_couple(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from couples where invite_code = upper(code);
  if cid is null then raise exception 'codigo invalido'; end if;
  insert into members (id, couple_id) values (auth.uid(), cid)
    on conflict (id) do update set couple_id = excluded.couple_id;
  return cid;
end; $$;

alter publication supabase_realtime add table mood_entries;
alter publication supabase_realtime add table shared_letters;
alter publication supabase_realtime add table shared_dates;

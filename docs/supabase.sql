-- ev (memory ev) — esquema de sincronização v2. Cole TUDO isto no SQL Editor do
-- Supabase e Run. O script é idempotente: pode rodar de novo sem quebrar nada,
-- inclusive por cima do esquema v1.

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

-- v2: presença suave — quem apareceu por último (usado na recuperação de vínculo).
alter table members add column if not exists last_seen_at timestamptz default now();

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

-- v2: "pensando em você" persistente — chega mesmo se o app do outro estiver fechado.
-- kind: 'thinking' (pensando em você) | 'agua' (lembrete carinhoso de água).
create table if not exists nudges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  seen boolean not null default false,
  created_at timestamptz default now()
);
alter table nudges add column if not exists kind text not null default 'thinking';
create index if not exists idx_nudges_couple on nudges(couple_id, seen, created_at desc);

-- v3: pergunta do dia — uma pergunta, dois lados. A resposta do outro só
-- aparece no app depois que os dois responderam (regra do cliente).
create table if not exists daily_questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  dia bigint not null,
  pergunta text not null,
  created_at timestamptz default now(),
  unique (couple_id, dia)
);

create table if not exists question_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  dia bigint not null,
  resposta text not null,
  updated_at timestamptz default now(),
  unique (author_id, dia)
);

-- v3: água do dia — cada um vê o copo do outro enchendo.
create table if not exists water_days (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  dia bigint not null,
  ml int not null default 0,
  updated_at timestamptz default now(),
  unique (author_id, dia)
);

-- v2: dias de cuidado — o jardim que os dois regam.
create table if not exists day_visits (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  dia bigint not null,
  created_at timestamptz default now(),
  unique (author_id, dia)
);

-- v2: espelho de gratidões e motivos (privados: só o autor lê).
create table if not exists gratitudes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  local_id bigint not null,
  dia bigint not null,
  texto text not null,
  created_at timestamptz default now(),
  unique (author_id, local_id)
);

create table if not exists reasons (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  local_id bigint not null,
  texto text not null,
  created_at timestamptz default now(),
  unique (author_id, local_id)
);

-- v2: música do dia — a trilha vira de vocês dois.
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  dia bigint not null,
  track jsonb not null,
  updated_at timestamptz default now(),
  unique (author_id, dia)
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
alter table nudges enable row level security;
alter table day_visits enable row level security;
alter table water_days enable row level security;
alter table daily_questions enable row level security;
alter table question_answers enable row level security;
alter table gratitudes enable row level security;
alter table reasons enable row level security;
alter table songs enable row level security;

-- Members: cada um edita só a própria linha, mas ENXERGA o casal (para saber
-- quando o parceiro entrou e quem é).
drop policy if exists "own member" on members;
drop policy if exists "see couple members" on members;
create policy "see couple members" on members for select
  using (id = auth.uid() or couple_id = my_couple_id());
drop policy if exists "insert own member" on members;
create policy "insert own member" on members for insert with check (id = auth.uid());
drop policy if exists "update own member" on members;
create policy "update own member" on members for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "see own couple" on couples;
create policy "see own couple" on couples for select
  using (id = my_couple_id());

drop policy if exists "couple mood" on mood_entries;
create policy "couple mood" on mood_entries for all
  using (couple_id = my_couple_id())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

-- Cartas: o casal lê; só o autor cria/apaga; o casal atualiza (a destinatária
-- marca "aberta" quando abre a cápsula).
drop policy if exists "couple letters" on shared_letters;
drop policy if exists "letters select" on shared_letters;
create policy "letters select" on shared_letters for select
  using (couple_id = my_couple_id());
drop policy if exists "letters insert" on shared_letters;
create policy "letters insert" on shared_letters for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());
drop policy if exists "letters update" on shared_letters;
create policy "letters update" on shared_letters for update
  using (couple_id = my_couple_id()) with check (couple_id = my_couple_id());
drop policy if exists "letters delete" on shared_letters;
create policy "letters delete" on shared_letters for delete
  using (couple_id = my_couple_id() and author_id = auth.uid());

drop policy if exists "couple dates" on shared_dates;
create policy "couple dates" on shared_dates for all
  using (couple_id = my_couple_id())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

-- Nudges: o casal lê; só o autor cria; o casal atualiza (o outro marca "visto").
drop policy if exists "nudges select" on nudges;
create policy "nudges select" on nudges for select
  using (couple_id = my_couple_id());
drop policy if exists "nudges insert" on nudges;
create policy "nudges insert" on nudges for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());
drop policy if exists "nudges update" on nudges;
create policy "nudges update" on nudges for update
  using (couple_id = my_couple_id()) with check (couple_id = my_couple_id());

-- Pergunta do dia: qualquer um dos dois pode semear a pergunta; o casal lê.
drop policy if exists "questions select" on daily_questions;
create policy "questions select" on daily_questions for select
  using (couple_id = my_couple_id());
drop policy if exists "questions insert" on daily_questions;
create policy "questions insert" on daily_questions for insert
  with check (couple_id = my_couple_id());

-- Respostas: o casal lê (a revelação "só depois dos dois" é regra do app);
-- só o autor escreve a própria.
drop policy if exists "answers select" on question_answers;
create policy "answers select" on question_answers for select
  using (couple_id = my_couple_id());
drop policy if exists "answers insert" on question_answers;
create policy "answers insert" on question_answers for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());
drop policy if exists "answers update" on question_answers;
create policy "answers update" on question_answers for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Água: o casal lê (cada um vê o copo do outro); só o autor escreve o próprio.
drop policy if exists "water select" on water_days;
create policy "water select" on water_days for select
  using (couple_id = my_couple_id());
drop policy if exists "water insert" on water_days;
create policy "water insert" on water_days for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());
drop policy if exists "water update" on water_days;
create policy "water update" on water_days for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Visitas ao jardim: o casal lê (o jardim é dos dois); só o autor grava.
drop policy if exists "visits select" on day_visits;
create policy "visits select" on day_visits for select
  using (couple_id = my_couple_id());
drop policy if exists "visits insert" on day_visits;
create policy "visits insert" on day_visits for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());

-- Gratidões e motivos: privados — só o autor lê/escreve (espelho de backup).
drop policy if exists "gratitudes own" on gratitudes;
create policy "gratitudes own" on gratitudes for all
  using (author_id = auth.uid())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

drop policy if exists "reasons own" on reasons;
create policy "reasons own" on reasons for all
  using (author_id = auth.uid())
  with check (couple_id = my_couple_id() and author_id = auth.uid());

-- Música do dia: o casal lê; só o autor escreve.
drop policy if exists "songs select" on songs;
create policy "songs select" on songs for select
  using (couple_id = my_couple_id());
drop policy if exists "songs write" on songs;
create policy "songs write" on songs for insert
  with check (couple_id = my_couple_id() and author_id = auth.uid());
drop policy if exists "songs update" on songs;
create policy "songs update" on songs for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "songs delete" on songs;
create policy "songs delete" on songs for delete
  using (author_id = auth.uid());

create or replace function create_couple() returns text
language plpgsql security definer set search_path = public as $$
declare code text; cid uuid;
begin
  code := upper(substr(md5(random()::text), 1, 6));
  insert into couples (invite_code) values (code) returning id into cid;
  insert into members (id, couple_id, last_seen_at) values (auth.uid(), cid, now())
    on conflict (id) do update set couple_id = excluded.couple_id, last_seen_at = now();
  return code;
end; $$;

-- v2: entrar com o código do casal. Um casal tem no máximo 2 lugares; se está
-- cheio, quem ficou precisa "liberar a vaga" (evict_partner) antes — nunca
-- expulsamos alguém automaticamente, para não derrubar o parceiro vivo.
create or replace function join_couple(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from couples where invite_code = upper(code);
  if cid is null then raise exception 'codigo invalido'; end if;

  if (select count(*) from members where couple_id = cid and id <> auth.uid()) >= 2 then
    raise exception 'casal cheio';
  end if;

  insert into members (id, couple_id, last_seen_at) values (auth.uid(), cid, now())
    on conflict (id) do update set couple_id = excluded.couple_id, last_seen_at = now();
  return cid;
end; $$;

-- v2: desfazer o vínculo deste aparelho (os dados do casal ficam no servidor).
create or replace function leave_couple() returns void
language plpgsql security definer set search_path = public as $$
begin
  update members set couple_id = null where id = auth.uid();
end; $$;

-- v2: liberar a vaga do parceiro (aparelho perdido/trocado). Quem FICOU chama
-- isto; o aparelho novo entra em seguida com o mesmo código do casal.
create or replace function evict_partner() returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select couple_id into cid from members where id = auth.uid();
  if cid is null then raise exception 'sem casal'; end if;
  update members set couple_id = null where couple_id = cid and id <> auth.uid();
end; $$;

-- Realtime para as tabelas que o app escuta ao vivo.
do $$ begin alter publication supabase_realtime add table mood_entries; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table shared_letters; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table shared_dates; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table nudges; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table day_visits; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table water_days; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table question_answers; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table songs; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table members; exception when duplicate_object then null; end $$;

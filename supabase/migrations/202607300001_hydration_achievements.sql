-- Memory EV: hydration as a consensual shared ritual, plus couple milestones.

alter table public.water_days
  add column if not exists goal_ml integer not null default 2000;

alter table public.water_days
  drop constraint if exists water_days_goal_ml_check;
alter table public.water_days
  add constraint water_days_goal_ml_check check (goal_ml between 500 and 6000);

create table if not exists public.couple_achievements (
  id uuid primary key default extensions.gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  key text not null check (
    key in (
      'dois_lados',
      'mesmo_dia',
      'tres_encontros',
      'sete_encontros',
      'agua_juntos',
      'primeira_memoria',
      'dez_memorias',
      'resposta_encontro'
    )
  ),
  unlocked_by uuid not null references public.members(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (couple_id, key)
);

create index if not exists idx_couple_achievements_couple
  on public.couple_achievements(couple_id, unlocked_at);

alter table public.couple_achievements enable row level security;
revoke all on table public.couple_achievements from authenticated;
grant select on table public.couple_achievements to authenticated;

drop policy if exists "couple achievements select" on public.couple_achievements;
create policy "couple achievements select" on public.couple_achievements for select
using (couple_id = public.my_couple_id());

drop policy if exists "couple achievements insert" on public.couple_achievements;

create or replace function public.claim_couple_achievement(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  eligible boolean := false;
begin
  cid := public.my_couple_id();
  if auth.uid() is null or cid is null then return false; end if;

  eligible := case p_key
    when 'dois_lados' then (
      select count(*) >= 2 from public.members where couple_id = cid
    )
    when 'mesmo_dia' then exists (
      select 1
      from public.day_visits
      where couple_id = cid
      group by dia
      having count(distinct author_id) >= 2
    )
    when 'tres_encontros' then (
      select count(*) >= 3
      from (
        select dia
        from public.day_visits
        where couple_id = cid
        group by dia
        having count(distinct author_id) >= 2
      ) shared_days
    )
    when 'sete_encontros' then (
      select count(*) >= 7
      from (
        select dia
        from public.day_visits
        where couple_id = cid
        group by dia
        having count(distinct author_id) >= 2
      ) shared_days
    )
    when 'agua_juntos' then exists (
      select 1
      from public.water_days
      where couple_id = cid and ml >= goal_ml
      group by dia
      having count(distinct author_id) >= 2
    )
    when 'primeira_memoria' then (
      select count(*) >= 1 from public.shared_media where couple_id = cid
    )
    when 'dez_memorias' then (
      select count(*) >= 10 from public.shared_media where couple_id = cid
    )
    when 'resposta_encontro' then exists (
      select 1
      from public.question_answers
      where couple_id = cid
      group by dia
      having count(distinct author_id) >= 2
    )
    else false
  end;

  if not eligible then return false; end if;

  insert into public.couple_achievements (couple_id, key, unlocked_by)
  values (cid, p_key, auth.uid())
  on conflict (couple_id, key) do nothing;
  return true;
end;
$$;

revoke all on function public.claim_couple_achievement(text) from public;
grant execute on function public.claim_couple_achievement(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.couple_achievements;
exception when duplicate_object then null;
end
$$;

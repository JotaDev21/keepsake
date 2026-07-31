-- Quiet, opt-in self-care signals shared between the two members.
create table if not exists public.care_checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  dia bigint not null,
  kind text not null check (kind in ('refeicao', 'pausa', 'movimento', 'descanso')),
  completed_at timestamptz not null default now(),
  unique (author_id, dia, kind)
);

create index if not exists idx_care_checkins_couple_day
  on public.care_checkins(couple_id, dia desc);

alter table public.care_checkins enable row level security;
grant select, insert, update, delete on table public.care_checkins to authenticated;

drop policy if exists "care couple read" on public.care_checkins;
create policy "care couple read" on public.care_checkins for select
using (couple_id = public.my_couple_id());

drop policy if exists "care own insert" on public.care_checkins;
create policy "care own insert" on public.care_checkins for insert
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
);

drop policy if exists "care own update" on public.care_checkins;
create policy "care own update" on public.care_checkins for update
using (author_id = auth.uid())
with check (
  couple_id = public.my_couple_id()
  and author_id = auth.uid()
);

drop policy if exists "care own delete" on public.care_checkins;
create policy "care own delete" on public.care_checkins for delete
using (author_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.care_checkins;
exception when duplicate_object then null;
end
$$;

-- Memory EV: Pulso rápido.
-- Um sinal curto e temporário entre as duas pessoas, sem expor o conteúdo
-- emocional na notificação da tela bloqueada.

create table if not exists public.quick_pulses (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references public.members(id) on delete cascade,
  kind text not null check (kind in ('bem', 'carinho', 'pesado', 'conversar', 'espaco')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (author_id)
);

create index if not exists idx_quick_pulses_couple
  on public.quick_pulses(couple_id, expires_at desc);

alter table public.quick_pulses enable row level security;
grant select on table public.quick_pulses to authenticated;

drop policy if exists "pulses select" on public.quick_pulses;
create policy "pulses select" on public.quick_pulses for select
  using (couple_id = public.my_couple_id());

-- Escrita passa pela Edge Function para que o evento e o push sejam tratados
-- juntos. Não há INSERT/UPDATE/DELETE direto pelo cliente.

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;

create or replace function public.register_push_token(p_token text, p_platform text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  if p_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$'
     and p_token !~ '^ExpoPushToken\[[A-Za-z0-9_-]+\]$' then
    return false;
  end if;
  if p_platform not in ('android', 'ios') then return false; end if;

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = auth.uid(),
        platform = excluded.platform,
        updated_at = now();
  return true;
end;
$$;

revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.quick_pulses;
exception
  when duplicate_object then null;
end
$$;

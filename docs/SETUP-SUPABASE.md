# Sincronização (Supabase) — setup

O app pareia dois celulares por um **código** e sincroniza entre eles: humor,
"pensando em você" (com entrega garantida), cartas & cápsulas, o jardim
(regado pelos dois), a música do dia, e um espelho privado de gratidões/motivos.
Privacidade: cada pessoa entra de forma **anônima** (sem e-mail/senha), os dados
ficam atrelados ao "casal", e o **Row Level Security** garante que só vocês dois
leem os dados de vocês. A anon key é pública por design — a proteção real é o RLS.

## 1. Habilitar login anônimo
No painel do Supabase: **Authentication → Sign In / Providers → Anonymous** →
ative **Allow anonymous sign-ins**.

## 2. Rodar o SQL
Cole **todo o conteúdo de [`docs/supabase.sql`](./supabase.sql)** em
**SQL Editor → New query → Run**.

Em seguida, rode também
[`supabase/migrations/202607220001_two_person_security.sql`](../supabase/migrations/202607220001_two_person_security.sql).
Essa segunda etapa transforma o código em convite de uso único, com validade
de 24 horas, e restringe no servidor ações que pertencem apenas ao destinatário.

O script é idempotente: rode de novo por cima de qualquer versão anterior —
ele cria as tabelas novas (`nudges`, `day_visits`, `gratitudes`, `reasons`,
`songs`, `water_days`), ajusta as policies e atualiza as funções de
pareamento. Se você já tinha rodado uma versão antiga, rode de novo: as
adições (como a água do casal e o tipo do nudge) entram sem quebrar nada.

> **Importante:** enquanto o SQL v2 não rodar, o app continua funcionando — os
> envios que dependem das tabelas novas ficam numa fila local (outbox) e são
> entregues assim que o servidor estiver pronto.

## 3. Pronto
As chaves (Project URL + anon key) já estão no `.env` do projeto (fora do git).
No app: **Hoje → "Conectar com ela"** (ou Ajustes → Conexão) → "Criar convite"
num celular, e "Tenho um código" no outro.

## Trocou/reinstalou o aparelho?
No aparelho de quem **ficou**: Conexão → **"Liberar a vaga"** (isso desliga o
aparelho antigo do casal — nunca é automático, para não derrubar ninguém por
engano). Essa ação gera um **novo convite**, válido por 24 horas e por um único
uso. No aparelho novo: **"Tenho um código"** com esse novo convite. O que foi trocado (cartas
recebidas, humor, jardim) continua no aparelho do outro e no servidor; o que
era só local do aparelho perdido não volta.

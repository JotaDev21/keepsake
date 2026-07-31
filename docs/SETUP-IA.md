# IA (Claude) — setup

O app usa a API da Claude (Anthropic) para três gestos discretos:

- **Lapidar com carinho** (Cartas → Escrever): pole o rascunho preservando a sua voz, com "voltar ao meu rascunho".
- **Leitura da semana** (Humor): uma reflexão gentil dos últimos dias, gerada no máximo uma vez por semana.
- **Me inspira** (Motivos): três perguntas-faísca para destravar a memória.

**A chave da Anthropic NUNCA fica no aparelho.** Tudo passa pela Edge Function
`ai` do Supabase — o app chama a função autenticado com a sessão anônima que
já existe, e a função fala com a Anthropic usando a chave guardada nos
secrets do projeto. Sem a função configurada, os botões de IA simplesmente
falham em silêncio gentil; o resto do app não depende deles.

## 1. Criar a chave da Anthropic
Em [console.anthropic.com](https://console.anthropic.com) → **API Keys** →
Create Key. Guarde a chave (`sk-ant-...`).

## 2. Publicar a função
Antes, aplique a migração
[`supabase/migrations/202607220001_two_person_security.sql`](../supabase/migrations/202607220001_two_person_security.sql).
Ela cria o limite de uso da IA por identidade; sem essa migração, a função
recusa chamadas para não deixar a chave desprotegida.

Duas opções:

**Pelo painel (sem CLI):** Supabase → **Edge Functions** → **Deploy a new
function** → método "Via Editor" → nome `ai` → cole o conteúdo de
[`supabase/functions/ai/index.ts`](../supabase/functions/ai/index.ts) → Deploy.
Deixe **Verify JWT** LIGADO (padrão) — é o que impede estranhos de usarem sua chave.

**Pela CLI:**
```sh
supabase functions deploy ai
```

## 3. Guardar a chave nos secrets
No painel: **Edge Functions → Secrets** → adicionar `ANTHROPIC_API_KEY` com a
chave do passo 1. (Ou `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`.)

## 4. Pronto
Nenhuma mudança no app é necessária (ele já usa a URL/anon key do `.env`).

## Modelo e custo
A função usa `claude-opus-4-8` (constante `MODEL` no topo de `index.ts`).
Custo por uso é de centavos: uma carta lapidada ou uma leitura da semana usa
~1–3 mil tokens (US$5/M de entrada, US$25/M de saída). Se quiser mais barato,
troque `MODEL` para `claude-haiku-4-5` ($1/$5) — qualidade de escrita menor.

## Privacidade
O que sai do aparelho quando você usa um botão de IA: o rascunho da carta, ou
os registros de humor recentes (humor, intensidade, tags e notas). Vai direto
do Supabase para a API da Anthropic sob a sua chave, apenas quando você toca
no botão — nunca em segundo plano. A Anthropic não treina modelos com dados
da API.

## Proteção de custo

A Edge Function valida novamente o JWT e permite no máximo 20 chamadas por
identidade a cada hora. A tabela de contagem não possui acesso direto pelo
cliente; somente a função protegida do banco pode incrementá-la.

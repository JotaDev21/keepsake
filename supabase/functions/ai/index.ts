// Supabase Edge Function "ai" — o único lugar que fala com a API da Claude.
// A chave ANTHROPIC_API_KEY vive nos secrets do Supabase, nunca no app.
// O app chama via supabase.functions.invoke('ai', ...) autenticado com a
// sessão anônima do casal (verify_jwt fica ligado — requests sem sessão 401).
//
// Deploy: veja docs/SETUP-IA.md.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-4-8";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "" });

interface PolishPayload {
  action: "polish_letter";
  corpo: string;
  titulo?: string;
  nome?: string;
}

interface ReadingEntry {
  dia: string; // "2026-07-01"
  humor: string;
  intensidade: number;
  tags: string[];
}

interface ReadingPayload {
  action: "weekly_reading";
  nome?: string;
  entries: ReadingEntry[];
}

interface SparksPayload {
  action: "reason_sparks";
  nome?: string;
}

interface QuestionPayload {
  action: "daily_question";
  /** Start-of-day epoch ms — seeds the theme so days don't repeat the vibe. */
  dia: number;
}

type Payload = PolishPayload | ReadingPayload | SparksPayload | QuestionPayload;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Pull the plain text out of a Messages API response, or null on refusal/empty. */
function textOf(message: Anthropic.Message): string | null {
  if (message.stop_reason === "refusal") return null;
  const parts = message.content.filter((b) => b.type === "text").map((b) => b.text);
  const text = parts.join("").trim();
  return text.length > 0 ? text : null;
}

async function polishLetter(p: PolishPayload): Promise<Response> {
  const corpo = (p.corpo ?? "").slice(0, 6000);
  if (corpo.trim().length < 10) return json({ error: "carta muito curta" }, 400);
  const nome = (p.nome ?? "essa pessoa").slice(0, 60);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system:
      `Você lapida cartas de amor escritas por uma pessoa para ${nome}, com quem ela divide a vida. ` +
      "Seu trabalho é polir, não reescrever: preserve a voz, o vocabulário e o jeito de quem escreveu; " +
      "melhore fluidez, ritmo e clareza; conserte a pontuação; corte repetições. " +
      "NUNCA invente fatos, memórias, apelidos ou promessas que não estão no rascunho. " +
      "Não exagere o tom nem adicione floreios genéricos — contenção vale mais que adjetivo. " +
      "Escreva em português brasileiro. Responda APENAS com a carta lapidada, sem título, sem comentários, sem aspas.",
    messages: [{ role: "user", content: `Rascunho da carta:\n\n${corpo}` }],
  });

  const text = textOf(message);
  if (!text) return json({ error: "sem resposta" }, 502);
  return json({ text });
}

async function weeklyReading(p: ReadingPayload): Promise<Response> {
  const entries = (p.entries ?? []).slice(0, 40).map((e) => ({
    dia: String(e.dia).slice(0, 10),
    humor: String(e.humor).slice(0, 20),
    intensidade: Number(e.intensidade) || 3,
    tags: (e.tags ?? []).slice(0, 10).map((t) => String(t).slice(0, 20)),
  }));
  if (entries.length < 3) return json({ error: "poucos registros" }, 400);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system:
      "Você escreve uma leitura semanal curta e gentil do clima emocional de uma pessoa, a partir dos registros " +
      "de humor dessa pessoa (app íntimo de duas pessoas). Fale diretamente com quem registrou, em segunda pessoa, português brasileiro. " +
      "Tom: caloroso, calmo, específico — como um amigo atento, nunca como terapeuta ou coach. " +
      "Aponte padrões reais dos dados (dias mais pesados, o que apareceu nas tags, viradas de clima). " +
      "Nada de conselhos genéricos, nada de clichês de autoajuda, nada de julgamento. " +
      "No máximo 3 parágrafos curtos. Sem títulos, sem listas, sem emoji.",
    messages: [
      {
        role: "user",
        content:
          "Registros dos últimos dias (JSON, humor numa escala pesado→radiante, intensidade 1-5):\n\n" +
          JSON.stringify(entries),
      },
    ],
  });

  const text = textOf(message);
  if (!text) return json({ error: "sem resposta" }, 502);
  return json({ text });
}

async function reasonSparks(p: SparksPayload): Promise<Response> {
  const nome = (p.nome ?? "essa pessoa").slice(0, 60);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    thinking: { type: "adaptive" },
    system:
      `Uma pessoa mantém um baralho de "motivos pra amar" ${nome}, com quem divide a vida, e travou na hora de escrever. ` +
      "Gere exatamente 3 perguntas-faísca curtas (máx. 12 palavras cada) que ajudem a LEMBRAR de um motivo concreto — " +
      "perguntas sobre gestos, manias, momentos, sons, cheiros, pequenas coisas do cotidiano. " +
      "As perguntas devem puxar memórias específicas, nunca sugerir o motivo pronto. " +
      "Português brasileiro, tom íntimo e quieto, sem emoji.",
    messages: [{ role: "user", content: "Me dá as 3 faíscas." }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            sparks: { type: "array", items: { type: "string" } },
          },
          required: ["sparks"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = textOf(message);
  if (!text) return json({ error: "sem resposta" }, 502);
  try {
    const parsed = JSON.parse(text) as { sparks: string[] };
    return json({ sparks: parsed.sparks.slice(0, 3) });
  } catch {
    return json({ error: "resposta inválida" }, 502);
  }
}

const QUESTION_THEMES = [
  "uma memória específica do casal",
  "um sonho ou plano de futuro a dois",
  "algo que um admira no outro",
  "um prazer pequeno do cotidiano juntos",
  "um 'e se' divertido ou hipotético",
  "algo nunca dito ou pouco falado, leve",
  "sentidos: um cheiro, som, gosto ou toque que lembra o outro",
  "gratidão por algo recente",
];

async function dailyQuestion(p: QuestionPayload): Promise<Response> {
  const dia = Number(p.dia) || Date.now();
  const tema = QUESTION_THEMES[Math.floor(dia / 86400000) % QUESTION_THEMES.length];

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    thinking: { type: "adaptive" },
    system:
      "Você escreve UMA pergunta do dia para um casal apaixonado responder separadamente — cada um responde " +
      "sem ver a resposta do outro, e as respostas se revelam juntas depois. " +
      "A pergunta deve: ser em português brasileiro; ter no máximo 18 palavras; puxar uma resposta pessoal e " +
      "específica (nunca sim/não); ser íntima e calorosa sem ser invasiva; evitar clichês de coach. " +
      "Responda em JSON.",
    messages: [{ role: "user", content: `Tema de hoje: ${tema}. Gere a pergunta.` }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { pergunta: { type: "string" } },
          required: ["pergunta"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = textOf(message);
  if (!text) return json({ error: "sem resposta" }, 502);
  try {
    const parsed = JSON.parse(text) as { pergunta: string };
    const pergunta = parsed.pergunta.trim();
    if (!pergunta) return json({ error: "resposta inválida" }, 502);
    return json({ pergunta });
  } catch {
    return json({ error: "resposta inválida" }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ANTHROPIC_API_KEY não configurada" }, 500);

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) return json({ error: "payload muito grande" }, 413);

  const authorization = req.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authorization || !supabaseUrl || !supabaseAnonKey) return json({ error: "não autorizado" }, 401);

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "não autorizado" }, 401);

  const { data: allowed, error: rateError } = await authClient.rpc("claim_ai_request");
  if (rateError) {
    console.error("ai rate limit error", rateError);
    return json({ error: "proteção de uso indisponível" }, 503);
  }
  if (allowed !== true) return json({ error: "limite temporário atingido" }, 429);

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  try {
    switch (payload.action) {
      case "polish_letter":
        return await polishLetter(payload);
      case "weekly_reading":
        return await weeklyReading(payload);
      case "reason_sparks":
        return await reasonSparks(payload);
      case "daily_question":
        return await dailyQuestion(payload);
      default:
        return json({ error: "ação desconhecida" }, 400);
    }
  } catch (e) {
    console.error("ai function error", e);
    return json({ error: "falha ao falar com a IA" }, 502);
  }
});

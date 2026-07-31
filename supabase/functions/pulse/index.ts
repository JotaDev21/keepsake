import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const PULSES = new Set(["bem", "carinho", "pesado", "conversar", "espaco"]);
const RESPONSES = new Set(["aqui", "conversar", "espaco"]);
const NUDGES = new Set(["thinking", "agua", "checkin"]);
const TTL_MS = 8 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function sendPush(
  service: SupabaseClient,
  userId: string,
  body: string,
  type: "pulse" | "pulse_response" | "nudge",
  url = "/",
): Promise<boolean> {
  const { data: tokens } = await service.from("push_tokens").select("token").eq("user_id", userId);
  if (!tokens?.length) return false;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "accept-encoding": "gzip, deflate",
    },
    body: JSON.stringify(
      tokens.map(({ token }) => ({
        to: token,
        title: "memory ev",
        body,
        sound: "default",
        priority: "high",
        channelId: "sinais",
        data: { url, type },
      })),
    ),
  });
  if (!response.ok) console.error("expo push", response.status, await response.text());
  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authorization = req.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "não autorizado" }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "não autorizado" }, 401);

  let payload: {
    action?: "respond" | "nudge";
    id?: string;
    pulseId?: string;
    kind?: string;
    createdAt?: number;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "json inválido" }, 400);
  }

  const { data: member, error: memberError } = await service
    .from("members")
    .select("couple_id")
    .eq("id", user.id)
    .maybeSingle();
  if (memberError || !member?.couple_id) return json({ error: "sem casal" }, 409);

  const now = new Date();
  if (payload.action === "nudge") {
    if (!payload.id || !UUID.test(payload.id) || !NUDGES.has(payload.kind ?? "")) {
      return json({ error: "cuidado inválido" }, 400);
    }

    const { data: existing } = await service
      .from("nudges")
      .select("id")
      .eq("id", payload.id)
      .maybeSingle();
    if (existing) return json({ ok: true, duplicate: true });

    const { data: recent } = await service
      .from("nudges")
      .select("created_at")
      .eq("author_id", user.id)
      .gte("created_at", new Date(now.getTime() - 60_000).toISOString())
      .limit(1);
    const quiet = Boolean(recent?.length);

    const { error: nudgeError } = await service.from("nudges").insert({
      id: payload.id,
      couple_id: member.couple_id,
      author_id: user.id,
      kind: payload.kind,
      created_at: now.toISOString(),
    });
    if (nudgeError) return json({ error: "não foi possível enviar" }, 503);

    const { data: partner } = await service
      .from("members")
      .select("id")
      .eq("couple_id", member.couple_id)
      .neq("id", user.id)
      .maybeSingle();
    if (!partner || quiet) return json({ ok: true, delivered: false, quiet });

    const body =
      payload.kind === "agua"
        ? "Um lembrete carinhoso: água. 💧"
        : payload.kind === "checkin"
          ? "Como você está? Tem um pedido gentil de check-in. 🌻"
          : "Alguém pensou em você. 🌻";
    try {
      const delivered = await sendPush(
        service,
        partner.id,
        body,
        "nudge",
        payload.kind === "checkin" ? "/humor" : "/",
      );
      return json({ ok: true, delivered });
    } catch (error) {
      console.error("nudge push", error);
      return json({ ok: true, delivered: false });
    }
  }

  if (payload.action === "respond") {
    if (
      !payload.id ||
      !UUID.test(payload.id) ||
      !payload.pulseId ||
      !UUID.test(payload.pulseId) ||
      !RESPONSES.has(payload.kind ?? "")
    ) {
      return json({ error: "resposta inválida" }, 400);
    }

    const { data: pulse } = await service
      .from("quick_pulses")
      .select("id,couple_id,author_id,expires_at")
      .eq("id", payload.pulseId)
      .eq("couple_id", member.couple_id)
      .neq("author_id", user.id)
      .gt("expires_at", now.toISOString())
      .maybeSingle();
    if (!pulse) return json({ error: "pulso indisponível" }, 409);

    const { data: existing } = await service
      .from("pulse_responses")
      .select("id,created_at")
      .eq("pulse_id", pulse.id)
      .eq("author_id", user.id)
      .maybeSingle();
    if (existing?.id === payload.id) return json({ ok: true, duplicate: true });
    const quiet = existing != null && now.getTime() - Date.parse(existing.created_at) < 60_000;

    const { error: responseError } = await service.from("pulse_responses").upsert(
      {
        id: payload.id,
        pulse_id: pulse.id,
        couple_id: member.couple_id,
        author_id: user.id,
        kind: payload.kind,
        created_at: now.toISOString(),
      },
      { onConflict: "pulse_id,author_id" },
    );
    if (responseError) return json({ error: "não foi possível responder" }, 503);

    await service.from("pulse_receipts").upsert(
      {
        pulse_id: pulse.id,
        couple_id: member.couple_id,
        viewer_id: user.id,
        seen_at: now.toISOString(),
      },
      { onConflict: "pulse_id,viewer_id" },
    );

    if (!quiet) {
      try {
        await sendPush(
          service,
          pulse.author_id,
          "Tem uma resposta esperando por você.",
          "pulse_response",
        );
      } catch (error) {
        console.error("pulse response push", error);
      }
    }
    return json({ ok: true, delivered: !quiet });
  }

  if (!payload.id || !UUID.test(payload.id) || !PULSES.has(payload.kind ?? "")) {
    return json({ error: "pulso inválido" }, 400);
  }

  const requestedAt = Number(payload.createdAt);
  const createdAt =
    Number.isFinite(requestedAt) &&
    requestedAt <= now.getTime() + 60_000 &&
    requestedAt >= now.getTime() - TTL_MS
      ? new Date(requestedAt)
      : now;
  const expiresAt = new Date(createdAt.getTime() + TTL_MS);
  if (expiresAt <= now) return json({ ok: true, expired: true });

  const { data: existing } = await service
    .from("quick_pulses")
    .select("id,created_at")
    .eq("author_id", user.id)
    .maybeSingle();
  if (existing?.id === payload.id) return json({ ok: true, duplicate: true });
  if (existing && Date.parse(existing.created_at) >= createdAt.getTime()) {
    return json({ ok: true, stale: true });
  }
  const quiet = existing != null && now.getTime() - Date.parse(existing.created_at) < 60_000;

  const { data: publishResult, error: pulseError } = await authClient.rpc(
    "publish_quick_pulse",
    {
      p_id: payload.id,
      p_kind: payload.kind,
      p_created_at: createdAt.toISOString(),
    },
  );
  if (pulseError || publishResult === "forbidden" || publishResult === "invalid") {
    return json({ error: "não foi possível compartilhar" }, 503);
  }
  if (publishResult !== "created") return json({ ok: true, status: publishResult });
  if (quiet) return json({ ok: true, delivered: false, quiet: true });

  const { data: partner } = await service
    .from("members")
    .select("id")
    .eq("couple_id", member.couple_id)
    .neq("id", user.id)
    .maybeSingle();
  if (!partner) return json({ ok: true, delivered: false });

  try {
    const delivered = await sendPush(
      service,
      partner.id,
      "Tem um novo sinal esperando por você.",
      "pulse",
    );
    return json({ ok: true, delivered, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("pulse push", error);
    return json({ ok: true, delivered: false, expiresAt: expiresAt.toISOString() });
  }
});

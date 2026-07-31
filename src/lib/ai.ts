import { Storage } from 'expo-sqlite/kv-store';

import { supabase } from './supabase';
import type { MoodEntry } from '@/types/models';

/**
 * IA do app — sempre via a Edge Function "ai" do Supabase (a chave da
 * Anthropic vive lá, nunca no aparelho). Tudo aqui falha em silêncio
 * gentil: sem rede ou sem função configurada → null, e a UI segue viva.
 */

async function invoke<T>(body: Record<string, unknown>): Promise<T | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke<T>('ai', { body });
    if (error) {
      console.warn('ev: ia falhou', error);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.warn('ev: ia falhou', e);
    return null;
  }
}

/** Polish a letter draft, preserving the writer's voice. Null on failure. */
export async function polishLetter(corpo: string, nome: string): Promise<string | null> {
  const res = await invoke<{ text?: string }>({ action: 'polish_letter', corpo, nome });
  return res?.text ?? null;
}

/** ISO-ish week key so the reading regenerates once per week, not per open. */
function weekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
  return `ai.reading.${now.getFullYear()}-${week}`;
}

/** The cached weekly reading, if this week's was already written. */
export function getCachedReading(): string | null {
  try {
    return Storage.getItemSync(weekKey());
  } catch {
    return null;
  }
}

/**
 * A gentle reading of the recent emotional weather, from mood entries.
 * Cached per week — asking twice in the same week returns the same text.
 */
export async function weeklyReading(entries: MoodEntry[], nome: string): Promise<string | null> {
  const cached = getCachedReading();
  if (cached) return cached;

  const payload = entries.slice(-28).map((e) => ({
    dia: new Date(e.dia).toISOString().slice(0, 10),
    humor: e.humor,
    intensidade: e.intensidade,
    tags: e.tags,
  }));
  if (payload.length < 3) return null;

  const res = await invoke<{ text?: string }>({ action: 'weekly_reading', entries: payload, nome });
  const text = res?.text ?? null;
  if (text) {
    try {
      Storage.setItemSync(weekKey(), text);
    } catch {
      // Losing the cache only costs a regeneration.
    }
  }
  return text;
}

/** Three short question-sparks to help remember a reason. Null on failure. */
export async function reasonSparks(nome: string): Promise<string[] | null> {
  const res = await invoke<{ sparks?: string[] }>({ action: 'reason_sparks', nome });
  return res?.sparks && res.sparks.length > 0 ? res.sparks : null;
}

/** One AI-written question of the day for the couple. Null on failure. */
export async function generateDailyQuestion(dia: number): Promise<string | null> {
  const res = await invoke<{ pergunta?: string }>({ action: 'daily_question', dia });
  return res?.pergunta?.trim() || null;
}

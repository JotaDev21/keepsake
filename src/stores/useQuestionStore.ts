import { create } from 'zustand';

import { questionRepo } from '@/db/repositories';
import { startOfDay } from '@/lib/mood';
import { questionForDay } from '@/lib/questions';
import { useSyncStore } from '@/stores/useSyncStore';

interface QuestionState {
  /** Today's question (shared when paired; curated fallback otherwise). */
  pergunta: string | null;
  /** This side's answer for today, if given. */
  minhaResposta: string | null;
  /**
   * Resolve today's question and any saved answer. Paired + online, the
   * question comes from the server (same on both devices); otherwise the
   * curated list keeps the ritual alive.
   */
  load: (personId: number) => Promise<void>;
  answer: (personId: number, texto: string) => Promise<void>;
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  pergunta: null,
  minhaResposta: null,

  load: async (personId) => {
    const dia = startOfDay();
    try {
      // What this device already knows about today.
      const saved = await questionRepo.get(personId, dia);
      if (saved) set({ pergunta: saved.pergunta, minhaResposta: saved.resposta });

      // Prefer the couple's shared question when we can get one.
      const shared = await useSyncStore.getState().ensureDailyQuestion();
      const pergunta = shared ?? saved?.pergunta ?? questionForDay(dia);
      await questionRepo.setQuestion(personId, dia, pergunta);
      const final = await questionRepo.get(personId, dia);
      set({ pergunta: final?.pergunta ?? pergunta, minhaResposta: final?.resposta ?? null });
    } catch (e) {
      console.warn('ev: pergunta do dia falhou', e);
      if (!get().pergunta) set({ pergunta: questionForDay(dia) });
    }
  },

  answer: async (personId, texto) => {
    const dia = startOfDay();
    const resposta = texto.trim();
    if (!resposta) return;
    await questionRepo.answer(personId, dia, resposta);
    set({ minhaResposta: resposta });
    // Her side learns you answered (content only revealed after she answers too).
    useSyncStore.getState().pushAnswer(dia, resposta).catch(() => {});
  },
}));

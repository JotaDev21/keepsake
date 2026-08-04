import { create } from 'zustand';

import { dateRepo, factRepo, personRepo, profileRepo } from '@/db/repositories';
import { deleteMedia } from '@/lib/media';
import type {
  Fact,
  FactDraft,
  ImportantDate,
  ImportantDateDraft,
  Person,
  PersonCore,
} from '@/types/models';

interface SaveProfileInput {
  core: PersonCore;
  facts: FactDraft[];
  dates: ImportantDateDraft[];
}

interface PersonState {
  hydrated: boolean;
  person: Person | null;
  facts: Fact[];
  dates: ImportantDate[];
  /** Load the person (and their facts/dates) from SQLite. Runs once at startup. */
  hydrate: () => Promise<void>;
  /** First-run: create the dedicated person. */
  createPerson: (core: PersonCore) => Promise<void>;
  /** Save the whole profile (person core + facts + dates) atomically-ish. */
  saveProfile: (input: SaveProfileInput) => Promise<void>;
  /** Change only the visual accent while preserving every profile detail. */
  setAccent: (accent: string) => Promise<void>;
}

export const usePersonStore = create<PersonState>((set, get) => ({
  hydrated: false,
  person: null,
  facts: [],
  dates: [],

  hydrate: async () => {
    try {
      const person = await personRepo.getActive();
      if (!person) {
        set({ person: null, facts: [], dates: [], hydrated: true });
        return;
      }
      const [facts, dates] = await Promise.all([
        factRepo.listByPerson(person.id),
        dateRepo.listByPerson(person.id),
      ]);
      set({ person, facts, dates, hydrated: true });
    } catch (e) {
      console.warn('ev: falha ao carregar dados locais', e);
      set({ hydrated: true });
    }
  },

  createPerson: async (core) => {
    await personRepo.create(core);
    const person = await personRepo.getActive();
    set({ person, facts: [], dates: [] });
  },

  saveProfile: async ({ core, facts, dates }) => {
    const person = get().person;
    if (!person) return;
    const oldCover = person.coverFile;
    const oldAvatar = person.avatarFile;

    await profileRepo.saveAll(person.id, core, facts, dates);

    // Drop the previous cover/avatar files now that the DB no longer references them.
    if (oldCover && oldCover !== core.coverFile) deleteMedia(oldCover);
    if (oldAvatar && oldAvatar !== core.avatarFile) deleteMedia(oldAvatar);

    const [newFacts, newDates] = await Promise.all([
      factRepo.listByPerson(person.id),
      dateRepo.listByPerson(person.id),
    ]);
    set({ person: { ...person, ...core }, facts: newFacts, dates: newDates });
  },

  setAccent: async (accent) => {
    const { person, facts, dates } = get();
    if (!person || person.accent === accent) return;
    const core: PersonCore = {
      nome: person.nome,
      apelido: person.apelido,
      bio: person.bio,
      comoSeConheceram: person.comoSeConheceram,
      coverFile: person.coverFile,
      avatarFile: person.avatarFile,
      accent,
    };
    await profileRepo.saveAll(
      person.id,
      core,
      facts.map(({ chave, valor }) => ({ chave, valor })),
      dates.map(({ titulo, data, recorrente, tipo }) => ({ titulo, data, recorrente, tipo })),
    );
    set({ person: { ...person, accent } });
  },
}));

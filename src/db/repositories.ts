import type {
  Fact,
  FactDraft,
  ImportantDate,
  ImportantDateDraft,
  Letter,
  LetterDraft,
  MediaCreate,
  MediaItem,
  MediaType,
  MoodEntry,
  MoodEntryDraft,
  Person,
  PersonCore,
} from '@/types/models';

import { getDb } from './index';

/* ------------------------------------------------------------------ rows */

interface PersonRow {
  id: number;
  nome: string;
  apelido: string | null;
  bio: string | null;
  como_se_conheceram: string | null;
  cover_file: string | null;
  avatar_file: string | null;
  accent: string;
  criado_em: number;
}

interface FactRow {
  id: number;
  person_id: number;
  chave: string;
  valor: string;
  ordem: number;
}

interface DateRow {
  id: number;
  person_id: number;
  titulo: string;
  data: number;
  recorrente: number;
  tipo: string;
}

interface MediaRow {
  id: number;
  person_id: number;
  tipo: string;
  file: string;
  thumb_file: string | null;
  legenda: string | null;
  data_memoria: number | null;
  local: string | null;
  criado_em: number;
}

const toPerson = (r: PersonRow): Person => ({
  id: r.id,
  nome: r.nome,
  apelido: r.apelido,
  bio: r.bio,
  comoSeConheceram: r.como_se_conheceram,
  coverFile: r.cover_file,
  avatarFile: r.avatar_file,
  accent: r.accent,
  criadoEm: r.criado_em,
});

const toFact = (r: FactRow): Fact => ({
  id: r.id,
  personId: r.person_id,
  chave: r.chave,
  valor: r.valor,
  ordem: r.ordem,
});

const toDate = (r: DateRow): ImportantDate => ({
  id: r.id,
  personId: r.person_id,
  titulo: r.titulo,
  data: r.data,
  recorrente: r.recorrente === 1,
  tipo: (r.tipo as ImportantDate['tipo']) ?? 'outro',
});

const toMedia = (r: MediaRow): MediaItem => ({
  id: r.id,
  personId: r.person_id,
  tipo: r.tipo as MediaType,
  file: r.file,
  thumbFile: r.thumb_file,
  legenda: r.legenda,
  dataMemoria: r.data_memoria,
  local: r.local,
  criadoEm: r.criado_em,
});

/* --------------------------------------------------------------- person */

export const personRepo = {
  /** The single dedicated person, if onboarding is done. */
  async getActive(): Promise<Person | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<PersonRow>('SELECT * FROM person ORDER BY id LIMIT 1;');
    return row ? toPerson(row) : null;
  },

  async create(core: PersonCore): Promise<number> {
    const db = await getDb();
    const res = await db.runAsync(
      `INSERT INTO person (nome, apelido, bio, como_se_conheceram, cover_file, avatar_file, accent, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      core.nome,
      core.apelido,
      core.bio,
      core.comoSeConheceram,
      core.coverFile,
      core.avatarFile,
      core.accent,
      Date.now(),
    );
    return res.lastInsertRowId;
  },
};

/* ----------------------------------------------------------------- facts */

export const factRepo = {
  async listByPerson(personId: number): Promise<Fact[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<FactRow>(
      'SELECT * FROM fact WHERE person_id = ? ORDER BY ordem, id;',
      personId,
    );
    return rows.map(toFact);
  },
};

/* ------------------------------------------------------------ important dates */

export const dateRepo = {
  async listByPerson(personId: number): Promise<ImportantDate[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<DateRow>(
      'SELECT * FROM important_date WHERE person_id = ? ORDER BY data;',
      personId,
    );
    return rows.map(toDate);
  },
};

/* --------------------------------------------------------------- profile */

export const profileRepo = {
  /**
   * Save the whole profile (person core + facts + dates) in ONE transaction, so
   * a kill mid-save can never leave the three tables out of sync.
   */
  async saveAll(
    personId: number,
    core: PersonCore,
    facts: FactDraft[],
    dates: ImportantDateDraft[],
  ): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE person
           SET nome = ?, apelido = ?, bio = ?, como_se_conheceram = ?, cover_file = ?, avatar_file = ?, accent = ?
         WHERE id = ?;`,
        core.nome,
        core.apelido,
        core.bio,
        core.comoSeConheceram,
        core.coverFile,
        core.avatarFile,
        core.accent,
        personId,
      );

      await db.runAsync('DELETE FROM fact WHERE person_id = ?;', personId);
      for (let i = 0; i < facts.length; i++) {
        const f = facts[i];
        await db.runAsync(
          'INSERT INTO fact (person_id, chave, valor, ordem) VALUES (?, ?, ?, ?);',
          personId,
          f.chave,
          f.valor,
          i,
        );
      }

      await db.runAsync('DELETE FROM important_date WHERE person_id = ?;', personId);
      for (const d of dates) {
        await db.runAsync(
          'INSERT INTO important_date (person_id, titulo, data, recorrente, tipo) VALUES (?, ?, ?, ?, ?);',
          personId,
          d.titulo,
          d.data,
          d.recorrente ? 1 : 0,
          d.tipo,
        );
      }
    });
  },
};

/* ----------------------------------------------------------------- media */

export const mediaRepo = {
  /** All media for a person, newest first. */
  async listByPerson(personId: number): Promise<MediaItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MediaRow>(
      'SELECT * FROM media_item WHERE person_id = ? ORDER BY criado_em DESC, id DESC;',
      personId,
    );
    return rows.map(toMedia);
  },

  async getById(id: number): Promise<MediaItem | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<MediaRow>('SELECT * FROM media_item WHERE id = ?;', id);
    return row ? toMedia(row) : null;
  },

  async create(input: MediaCreate): Promise<number> {
    const db = await getDb();
    const res = await db.runAsync(
      `INSERT INTO media_item (person_id, tipo, file, thumb_file, legenda, data_memoria, local, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      input.personId,
      input.tipo,
      input.file,
      input.thumbFile,
      input.legenda,
      input.dataMemoria,
      input.local,
      Date.now(),
    );
    return res.lastInsertRowId;
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM media_item WHERE id = ?;', id);
  },
};

/* ------------------------------------------------------------------ mood */

interface MoodRow {
  id: number;
  person_id: number;
  dia: number;
  humor: string;
  intensidade: number;
  nota: string | null;
  tags: string | null;
  criado_em: number;
}

const toMood = (r: MoodRow): MoodEntry => ({
  id: r.id,
  personId: r.person_id,
  dia: r.dia,
  humor: r.humor,
  intensidade: r.intensidade,
  nota: r.nota,
  tags: r.tags ? (JSON.parse(r.tags) as string[]) : [],
  criadoEm: r.criado_em,
});

export const moodRepo = {
  async getByDay(personId: number, dia: number): Promise<MoodEntry | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<MoodRow>(
      'SELECT * FROM mood_entry WHERE person_id = ? AND dia = ?;',
      personId,
      dia,
    );
    return row ? toMood(row) : null;
  },

  /** One entry per day — insert or update the day's mood. */
  async upsert(personId: number, draft: MoodEntryDraft): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO mood_entry (person_id, dia, humor, intensidade, nota, tags, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(person_id, dia)
       DO UPDATE SET humor = excluded.humor, intensidade = excluded.intensidade, nota = excluded.nota, tags = excluded.tags;`,
      personId,
      draft.dia,
      draft.humor,
      draft.intensidade,
      draft.nota,
      JSON.stringify(draft.tags),
      Date.now(),
    );
  },

  /** Entries within [fromDia, toDia], oldest first (for the history calendar). */
  async listRange(personId: number, fromDia: number, toDia: number): Promise<MoodEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MoodRow>(
      'SELECT * FROM mood_entry WHERE person_id = ? AND dia >= ? AND dia <= ? ORDER BY dia;',
      personId,
      fromDia,
      toDia,
    );
    return rows.map(toMood);
  },
};

/* ---------------------------------------------------------------- letters */

interface LetterRow {
  id: number;
  person_id: number;
  titulo: string;
  corpo: string;
  abrir_em: number | null;
  aberta: number;
  criado_em: number;
}

const toLetter = (r: LetterRow): Letter => ({
  id: r.id,
  personId: r.person_id,
  titulo: r.titulo,
  corpo: r.corpo,
  abrirEm: r.abrir_em,
  aberta: r.aberta === 1,
  criadoEm: r.criado_em,
});

export const letterRepo = {
  async listByPerson(personId: number): Promise<Letter[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<LetterRow>(
      'SELECT * FROM letter WHERE person_id = ? ORDER BY criado_em DESC;',
      personId,
    );
    return rows.map(toLetter);
  },

  async getById(id: number): Promise<Letter | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<LetterRow>('SELECT * FROM letter WHERE id = ?;', id);
    return row ? toLetter(row) : null;
  },

  async create(personId: number, draft: LetterDraft): Promise<number> {
    const db = await getDb();
    const res = await db.runAsync(
      'INSERT INTO letter (person_id, titulo, corpo, abrir_em, aberta, criado_em) VALUES (?, ?, ?, ?, 0, ?);',
      personId,
      draft.titulo,
      draft.corpo,
      draft.abrirEm,
      Date.now(),
    );
    return res.lastInsertRowId;
  },

  async markOpened(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE letter SET aberta = 1 WHERE id = ?;', id);
  },

  async delete(id: number): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM letter WHERE id = ?;', id);
  },
};

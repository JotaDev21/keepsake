/** Domain model for the local data. Stored in SQLite; media files on disk. */

export type MediaType = 'foto' | 'video' | 'audio';

export type ImportantDateType = 'aniversario' | 'primeiro_encontro' | 'outro';

export interface Person {
  id: number;
  nome: string;
  apelido: string | null;
  bio: string | null;
  comoSeConheceram: string | null;
  /** Filename within the app media dir (see lib/media). */
  coverFile: string | null;
  avatarFile: string | null;
  /** Accent hue (hex) — the person's color. */
  accent: string;
  criadoEm: number;
}

export interface Fact {
  id: number;
  personId: number;
  chave: string;
  valor: string;
  ordem: number;
}

export interface ImportantDate {
  id: number;
  personId: number;
  titulo: string;
  /** The date, as epoch milliseconds. */
  data: number;
  recorrente: boolean;
  tipo: ImportantDateType;
}

export interface MediaItem {
  id: number;
  personId: number;
  tipo: MediaType;
  file: string;
  thumbFile: string | null;
  legenda: string | null;
  dataMemoria: number | null;
  local: string | null;
  criadoEm: number;
}

/** Editable person fields (everything except identity/timestamps). */
export interface PersonCore {
  nome: string;
  apelido: string | null;
  bio: string | null;
  comoSeConheceram: string | null;
  coverFile: string | null;
  avatarFile: string | null;
  accent: string;
}

/** A fact without persistence identity (for editing/replace). */
export interface FactDraft {
  chave: string;
  valor: string;
}

/** An important date without persistence identity (for editing/replace). */
export interface ImportantDateDraft {
  titulo: string;
  data: number;
  recorrente: boolean;
  tipo: ImportantDateType;
}

/** A media item to create (already-stored filenames). */
export type MediaCreate = Omit<MediaItem, 'id' | 'criadoEm'>;

export interface MoodEntry {
  id: number;
  personId: number;
  /** Start-of-day epoch ms — one entry per day. */
  dia: number;
  /** Mood key (see lib/mood moodScale). */
  humor: string;
  /** 1–5. */
  intensidade: number;
  nota: string | null;
  /** Feeling tag keys. */
  tags: string[];
  criadoEm: number;
}

/** A mood entry to save (without persistence identity). */
export interface MoodEntryDraft {
  dia: number;
  humor: string;
  intensidade: number;
  nota: string | null;
  tags: string[];
}

export interface Letter {
  id: number;
  personId: number;
  titulo: string;
  corpo: string;
  /** null = open anytime; else a capsule locked until this date (epoch ms). */
  abrirEm: number | null;
  aberta: boolean;
  criadoEm: number;
}

export interface LetterDraft {
  titulo: string;
  corpo: string;
  abrirEm: number | null;
}

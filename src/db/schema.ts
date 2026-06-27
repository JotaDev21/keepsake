/**
 * SQLite schema + migrations. Bump SCHEMA_VERSION and add a numbered entry to
 * MIGRATIONS for every change; migrations run in order from the DB's current
 * user_version. Never edit a past migration — add a new one.
 */
export const SCHEMA_VERSION = 3;

export const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      apelido TEXT,
      bio TEXT,
      como_se_conheceram TEXT,
      cover_file TEXT,
      avatar_file TEXT,
      accent TEXT NOT NULL DEFAULT '#E2A86B',
      criado_em INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
      chave TEXT NOT NULL,
      valor TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS important_date (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      data INTEGER NOT NULL,
      recorrente INTEGER NOT NULL DEFAULT 0,
      tipo TEXT NOT NULL DEFAULT 'outro'
    );

    CREATE TABLE IF NOT EXISTS media_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      file TEXT NOT NULL,
      thumb_file TEXT,
      legenda TEXT,
      data_memoria INTEGER,
      local TEXT,
      criado_em INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fact_person ON fact(person_id, ordem);
    CREATE INDEX IF NOT EXISTS idx_date_person ON important_date(person_id);
    CREATE INDEX IF NOT EXISTS idx_media_person ON media_item(person_id, criado_em);
  `,

  2: `
    CREATE TABLE IF NOT EXISTS mood_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
      dia INTEGER NOT NULL,
      humor TEXT NOT NULL,
      intensidade INTEGER NOT NULL DEFAULT 3,
      nota TEXT,
      tags TEXT,
      criado_em INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_person_dia ON mood_entry(person_id, dia);
  `,

  3: `
    CREATE TABLE IF NOT EXISTS letter (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      corpo TEXT NOT NULL,
      abrir_em INTEGER,
      aberta INTEGER NOT NULL DEFAULT 0,
      criado_em INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_letter_person ON letter(person_id, criado_em);
  `,
};

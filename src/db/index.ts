import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS, SCHEMA_VERSION } from './schema';

const DB_NAME = 'ev.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function init(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (!sql) continue;
    // The version bump rides in the same transaction as the migration, so an
    // interrupted upgrade can never leave the DB claiming a version it isn't.
    // (PRAGMA can't be parameterized; v is a trusted integer constant.)
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${v};`);
    });
  }

  return db;
}

/** The shared database handle (opened + migrated once, lazily). */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    // Don't cache a rejected promise — a transient init failure must not poison
    // every later write for the whole session.
    dbPromise = init().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

import * as SQLite from "expo-sqlite";

import { DATABASE_NAME, DATABASE_VERSION, MIGRATION_V1 } from "./schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

const migrate = async (db: SQLite.SQLiteDatabase) => {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(MIGRATION_V1);
  }

  // Future migrations append here as `if (currentVersion === 1) { … }` blocks
  // and bump DATABASE_VERSION in schema.ts.

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
};

/**
 * Opens (once) and migrates the database. Deliberately a module singleton
 * rather than a React context so the repository layer stays independent of the
 * component tree — the Supabase implementation won't need a provider either.
 */
export const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync("PRAGMA journal_mode = WAL");
      await migrate(db);
      return db;
    })().catch((error) => {
      // Don't cache a rejected promise, otherwise every later call fails too.
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
};

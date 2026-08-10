import { getDatabase } from "./client";

/** Small key/value side table for app-level flags (for example seed markers). */
export const getMeta = async (key: string): Promise<string | undefined> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    key,
  );
  return row?.value;
};

export const setMeta = async (key: string, value: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
};

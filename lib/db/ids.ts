/**
 * RFC 4122 v4 UUID.
 *
 * Math.random is not a cryptographic source, but these ids only need to be
 * unique on one device and shaped like a Postgres `uuid` so rows can be pushed
 * to Supabase unchanged. Once the backend owns creation, drop this and let
 * Postgres default to gen_random_uuid().
 */
export const createId = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

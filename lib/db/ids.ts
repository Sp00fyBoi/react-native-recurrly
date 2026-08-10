import * as Crypto from "expo-crypto";

/**
 * RFC 4122 v4 UUID, shaped like a Postgres `uuid` so rows can be pushed to
 * Supabase unchanged. Once the backend owns creation, drop this and let
 * Postgres default to gen_random_uuid().
 */
export const createId = (): string => Crypto.randomUUID();

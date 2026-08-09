import { createSqliteSubscriptionRepository } from "./sqlite-subscriptions";
import type { SubscriptionRepository } from "./types";

/**
 * The single place storage is chosen. To move to Supabase, add
 * `createSupabaseSubscriptionRepository()` and swap it in here — every caller
 * already talks to the interface, not the driver.
 */
export const subscriptionRepository: SubscriptionRepository =
  createSqliteSubscriptionRepository();

export type { SubscriptionRepository };

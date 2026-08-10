import { DEMO_SUBSCRIPTIONS } from "@/constants/data";
import { getMeta, setMeta } from "@/lib/db/meta";

import type { SubscriptionRepository } from "./types";

/**
 * Populates a brand-new account with the sample subscriptions so the app
 * doesn't open on an empty dashboard. Flip to `false` (or delete this module
 * and its call in the store) when real data is expected.
 */
export const SEED_DEMO_DATA_ON_FIRST_RUN = true;

const seedKey = (userId: string) => `demo_seeded:${userId}`;

/**
 * De-dupes concurrent callers. Without this, React's double-invoked effects in
 * development run two loads at once, both read "not seeded", and the account
 * ends up with the demo rows twice.
 */
const inFlight = new Map<string, Promise<boolean>>();

const runSeed = async (
  repository: SubscriptionRepository,
  userId: string,
): Promise<boolean> => {
  const alreadySeeded = await getMeta(seedKey(userId));
  if (alreadySeeded) return false;

  // Marked before inserting, not after: if a create throws part-way through,
  // the next launch would otherwise re-run the whole loop and duplicate every
  // row that did land. A short demo list is the better thing to lose.
  await setMeta(seedKey(userId), new Date().toISOString());

  for (const subscription of DEMO_SUBSCRIPTIONS) {
    await repository.create(userId, subscription);
  }

  return true;
};

/**
 * Runs at most once per user. The marker lives in `app_meta` rather than being
 * inferred from an empty table, so a user who deletes everything doesn't get
 * the demo rows resurrected on next launch.
 */
export const seedDemoDataIfNeeded = (
  repository: SubscriptionRepository,
  userId: string,
): Promise<boolean> => {
  if (!SEED_DEMO_DATA_ON_FIRST_RUN) return Promise.resolve(false);

  const existing = inFlight.get(userId);
  if (existing) return existing;

  const pending = runSeed(repository, userId).finally(() => {
    inFlight.delete(userId);
  });

  inFlight.set(userId, pending);
  return pending;
};

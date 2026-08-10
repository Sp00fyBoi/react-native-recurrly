/**
 * The contract every storage backend implements. Today it's backed by
 * expo-sqlite; swapping to Supabase means writing one more implementation of
 * this interface and changing the export in `./index.ts` — nothing above the
 * repository layer imports a driver directly.
 *
 * Every method is user-scoped and async so the Supabase version is a drop-in.
 */
export interface SubscriptionRepository {
  list(userId: string): Promise<Subscription[]>;
  create(
    userId: string,
    input: CreateSubscriptionInput,
  ): Promise<Subscription>;
  /**
   * Returns the row as it now stands, or `undefined` if no row matches.
   * A patch whose keys are all `undefined` writes nothing but still returns
   * the current row — callers can treat that as a successful no-op.
   */
  update(
    userId: string,
    id: string,
    patch: UpdateSubscriptionPatch,
  ): Promise<Subscription | undefined>;
  remove(userId: string, id: string): Promise<void>;
}

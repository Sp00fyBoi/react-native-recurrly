import { getDatabase } from "@/lib/db/client";
import { createId } from "@/lib/db/ids";
import { toSubscription, type SubscriptionRow } from "@/lib/db/schema";

import type { SubscriptionRepository } from "./types";

const SELECT_COLUMNS = `
  id, user_id, name, icon_key, plan, category, payment_method, status,
  start_date, price, currency, billing, renewal_date, color,
  created_at, updated_at
`;

/** Maps a domain patch onto `SET` fragments, skipping keys that weren't sent. */
const PATCHABLE_COLUMNS: Record<keyof UpdateSubscriptionPatch, string> = {
  name: "name",
  iconKey: "icon_key",
  plan: "plan",
  category: "category",
  paymentMethod: "payment_method",
  status: "status",
  startDate: "start_date",
  price: "price",
  currency: "currency",
  billing: "billing",
  renewalDate: "renewal_date",
  color: "color",
};

export const createSqliteSubscriptionRepository = (): SubscriptionRepository => ({
  async list(userId) {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SubscriptionRow>(
      // Ordered on the raw column, not datetime(created_at): the values are
      // ISO-8601 from toISOString(), which sorts correctly as text, and the
      // bare column keeps subsecond precision and stays index-usable.
      `SELECT ${SELECT_COLUMNS} FROM subscriptions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      userId,
    );
    return rows.map(toSubscription);
  },

  async create(userId, input) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = createId();

    // Transacted so a missing read-back rolls the insert back too, instead of
    // leaving an orphaned row the caller was told didn't get created.
    let row: SubscriptionRow | null = null;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO subscriptions (
           id, user_id, name, icon_key, plan, category, payment_method, status,
           start_date, price, currency, billing, renewal_date, color,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          input.name,
          input.iconKey,
          input.plan ?? null,
          input.category ?? null,
          input.paymentMethod ?? null,
          input.status ?? "active",
          input.startDate ?? null,
          input.price,
          input.currency,
          input.billing,
          input.renewalDate ?? null,
          input.color ?? null,
          now,
          now,
        ],
      );

      row = await db.getFirstAsync<SubscriptionRow>(
        `SELECT ${SELECT_COLUMNS} FROM subscriptions WHERE id = ? AND user_id = ?`,
        [id, userId],
      );

      if (!row) {
        throw new Error("Subscription was inserted but could not be read back");
      }
    });

    return toSubscription(row!);
  },

  async update(userId, id, patch) {
    const db = await getDatabase();

    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, column] of Object.entries(PATCHABLE_COLUMNS)) {
      const value = patch[key as keyof UpdateSubscriptionPatch];
      if (value === undefined) continue;
      assignments.push(`${column} = ?`);
      values.push(value);
    }

    if (assignments.length > 0) {
      assignments.push("updated_at = ?");
      values.push(new Date().toISOString());

      await db.runAsync(
        `UPDATE subscriptions SET ${assignments.join(", ")} WHERE id = ? AND user_id = ?`,
        [...values, id, userId],
      );
    }

    const row = await db.getFirstAsync<SubscriptionRow>(
      `SELECT ${SELECT_COLUMNS} FROM subscriptions WHERE id = ? AND user_id = ?`,
      [id, userId],
    );

    return row ? toSubscription(row) : undefined;
  },

  async remove(userId, id) {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM subscriptions WHERE id = ? AND user_id = ?",
      [id, userId],
    );
  },
});

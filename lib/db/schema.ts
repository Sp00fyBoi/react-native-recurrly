import { icons, type IconKey } from "@/constants/icons";

export const DATABASE_NAME = "recurrly.db";
export const DATABASE_VERSION = 1;

/**
 * Columns are snake_case and nullability mirrors the Postgres table this
 * becomes under Supabase/Prisma, so the migration is a driver swap rather than
 * a reshape. The mappers at the bottom are the only place the DB row shape and
 * the app's domain shape are translated.
 */
export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  plan TEXT,
  category TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing TEXT NOT NULL,
  renewal_date TEXT,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  icon_key: string;
  plan: string | null;
  category: string | null;
  payment_method: string | null;
  status: string;
  start_date: string | null;
  price: number;
  currency: string;
  billing: string;
  renewal_date: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

const FALLBACK_ICON_KEY: IconKey = "wallet";

const isIconKey = (value: string): value is IconKey => value in icons;

/** Rows store an icon *key*; the bundled asset is resolved on the way out. */
export const toSubscription = (row: SubscriptionRow): Subscription => {
  const iconKey = isIconKey(row.icon_key) ? row.icon_key : FALLBACK_ICON_KEY;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    iconKey,
    icon: icons[iconKey],
    plan: row.plan ?? undefined,
    category: row.category ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    status: toSubscriptionStatus(row.status),
    startDate: row.start_date ?? undefined,
    price: row.price,
    currency: row.currency,
    billing: row.billing,
    renewalDate: row.renewal_date ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const STATUSES: SubscriptionStatus[] = ["active", "paused", "cancelled"];

export const toSubscriptionStatus = (value: string): SubscriptionStatus =>
  STATUSES.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "active";

import { toDefaultCurrency } from "@/lib/currency";
import dayjs from "dayjs";

/** Only active subscriptions count toward spend and upcoming renewals. */
const isBilling = (subscription: Subscription) => subscription.status === "active";

/**
 * Yearly plans are spread across 12 months, and the result is converted into
 * the app's reporting currency. Both steps are needed before two rows can be
 * added together or ranked against each other, so every aggregate below — and
 * the cost sort on the subscriptions screen — goes through here.
 */
export const monthlyEquivalent = (subscription: Subscription): number => {
  const perMonth =
    subscription.billing.toLowerCase() === "yearly"
      ? subscription.price / 12
      : subscription.price;

  return toDefaultCurrency(perMonth, subscription.currency);
};

/** Total recurring monthly spend across active subscriptions. */
export const calculateMonthlyTotal = (subscriptions: Subscription[]): number =>
  subscriptions
    .filter(isBilling)
    .reduce((total, subscription) => total + monthlyEquivalent(subscription), 0);

/** Soonest future renewal date across active subscriptions, if any. */
export const findNextRenewalDate = (
  subscriptions: Subscription[],
): string | undefined => {
  const today = dayjs().startOf("day");

  return subscriptions
    .filter(isBilling)
    .map((subscription) => subscription.renewalDate)
    .filter((date): date is string => Boolean(date))
    .filter((date) => {
      const parsed = dayjs(date);
      return parsed.isValid() && !parsed.startOf("day").isBefore(today);
    })
    .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf())[0];
};

/** Twelve months of the current recurring spend. */
export const calculateYearlyTotal = (subscriptions: Subscription[]): number =>
  calculateMonthlyTotal(subscriptions) * 12;

export type CategorySpend = {
  category: string;
  monthly: number;
  count: number;
  /** Fraction of total monthly spend, 0–1. Zero when the total is zero. */
  share: number;
  color?: string;
};

const UNCATEGORISED = "Uncategorised";

/**
 * Active spend grouped by category, largest first. Category colour is borrowed
 * from the first subscription in the group so the bars match the cards.
 */
export const groupSpendByCategory = (
  subscriptions: Subscription[],
): CategorySpend[] => {
  const active = subscriptions.filter(isBilling);
  const total = active.reduce(
    (sum, subscription) => sum + monthlyEquivalent(subscription),
    0,
  );

  const groups = new Map<string, CategorySpend>();

  for (const subscription of active) {
    const category = subscription.category?.trim() || UNCATEGORISED;
    const existing = groups.get(category);

    if (existing) {
      existing.monthly += monthlyEquivalent(subscription);
      existing.count += 1;
      existing.color = existing.color ?? subscription.color;
    } else {
      groups.set(category, {
        category,
        monthly: monthlyEquivalent(subscription),
        count: 1,
        share: 0,
        color: subscription.color,
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      share: total > 0 ? group.monthly / total : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly);
};

export type StatusCounts = {
  active: number;
  paused: number;
  cancelled: number;
  total: number;
};

export const countByStatus = (subscriptions: Subscription[]): StatusCounts =>
  subscriptions.reduce<StatusCounts>(
    (counts, subscription) => {
      counts[subscription.status] += 1;
      counts.total += 1;
      return counts;
    },
    { active: 0, paused: 0, cancelled: 0, total: 0 },
  );

/**
 * Renewal spend bucketed into the next seven days starting today, for the
 * weekly chart. Days with no renewals are kept so the week stays continuous.
 */
export const selectDailySpend = (
  subscriptions: Subscription[],
  days = 7,
): DailySpend[] => {
  const today = dayjs().startOf("day");

  return Array.from({ length: days }, (_, offset) => {
    const day = today.add(offset, "day");

    const total = subscriptions.filter(isBilling).reduce((sum, subscription) => {
      if (!subscription.renewalDate) return sum;
      const renewal = dayjs(subscription.renewalDate);
      if (!renewal.isValid()) return sum;
      // The charge itself, not its monthly equivalent — but still converted,
      // since the chart's axis is a single currency.
      return renewal.startOf("day").isSame(day)
        ? sum + toDefaultCurrency(subscription.price, subscription.currency)
        : sum;
    }, 0);

    return { label: day.format("ddd"), total };
  });
};

/** Most expensive active subscription by monthly-equivalent cost. */
export const findLargestSubscription = (
  subscriptions: Subscription[],
): Subscription | undefined =>
  subscriptions
    .filter(isBilling)
    .sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a))[0];

export const UPCOMING_WINDOW_DAYS = 30;

/**
 * Active subscriptions renewing within the next `withinDays`, soonest first,
 * with `daysLeft` derived from the renewal date rather than stored.
 */
export const selectUpcomingSubscriptions = (
  subscriptions: Subscription[],
  withinDays = UPCOMING_WINDOW_DAYS,
): UpcomingSubscription[] => {
  const today = dayjs().startOf("day");

  return subscriptions
    .filter(isBilling)
    .flatMap((subscription) => {
      if (!subscription.renewalDate) return [];

      const renewal = dayjs(subscription.renewalDate);
      if (!renewal.isValid()) return [];

      const daysLeft = renewal.startOf("day").diff(today, "day");
      if (daysLeft < 0 || daysLeft > withinDays) return [];

      return [
        {
          id: subscription.id,
          icon: subscription.icon,
          name: subscription.name,
          price: subscription.price,
          currency: subscription.currency,
          daysLeft,
        },
      ];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

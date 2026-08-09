import dayjs from "dayjs";

/** Only active subscriptions count toward spend and upcoming renewals. */
const isBilling = (subscription: Subscription) => subscription.status === "active";

/** Yearly plans are spread across 12 months so totals are comparable. */
export const monthlyEquivalent = (subscription: Subscription): number =>
  subscription.billing.toLowerCase() === "yearly"
    ? subscription.price / 12
    : subscription.price;

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

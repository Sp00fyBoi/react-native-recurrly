/**
 * The app's reporting currency. Individual subscriptions keep whatever currency
 * they were entered in, but every aggregate — the home balance, the insights
 * totals, the weekly chart — is expressed in this one, so mixed-currency rows
 * have to be converted before they can be summed or ranked.
 */
export const DEFAULT_CURRENCY = "INR";

/**
 * Units of INR per 1 unit of the key.
 *
 * These are static approximations, not live rates: the app makes no network
 * calls, so there is nowhere to fetch a quote from. Totals are therefore
 * indicative. Replace this with a rates endpoint when the backend lands.
 */
const INR_PER_UNIT: Record<string, number> = {
  INR: 1,
  USD: 88,
  EUR: 96,
  GBP: 112,
  JPY: 0.58,
  AUD: 57,
  CAD: 63,
};

/** Symbols for the fallback path below, where `Intl` gives us nothing. */
const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
};

const normalize = (currency?: string): string =>
  currency?.trim().toUpperCase() || DEFAULT_CURRENCY;

/**
 * Converts `amount` into {@link DEFAULT_CURRENCY}.
 *
 * An unrecognised code is treated as already being in the default currency
 * rather than dropped — an unknown currency then misstates a total by its own
 * rate instead of disappearing from it entirely.
 */
export const toDefaultCurrency = (amount: number, currency?: string): number =>
  amount * (INR_PER_UNIT[normalize(currency)] ?? 1);

export const currencySymbol = (currency?: string): string =>
  SYMBOLS[normalize(currency)] ?? "";

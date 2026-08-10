import { currencySymbol, DEFAULT_CURRENCY, normalize } from "@/lib/currency";
import dayjs from "dayjs";

export const formatCurrency = (value: number, currency?: string): string => {
  const normalized = normalize(currency);
  try {
    // `en-IN` only for the reporting currency, so INR gets Indian digit
    // grouping (₹1,23,456.00). Other codes use the runtime's default locale
    // rather than inheriting Indian grouping they were never meant to have.
    const locale = normalized === DEFAULT_CURRENCY ? "en-IN" : undefined;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Some Hermes builds ship without full ICU. A bare number reads as the
    // wrong currency entirely, so keep at least the symbol — falling back to
    // the code itself for anything we have no symbol for.
    const symbol = currencySymbol(normalized);
    const amount = value.toFixed(2);
    return symbol ? `${symbol}${amount}` : `${amount} ${normalized}`;
  }
};

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate.format("MM/DD/YYYY") : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatAccountId = (id: string, visibleChars = 20): string =>
  id.length > visibleChars ? `${id.slice(0, visibleChars)}…` : id;

export const formatJoinedDate = (value?: Date | string | null): string => {
  if (!value) return "Not available";
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate.format("DD.MM.YYYY") : "Not available";
};
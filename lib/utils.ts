import { currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";
import dayjs from "dayjs";

export const formatCurrency = (
  value: number,
  currency = DEFAULT_CURRENCY,
): string => {
  try {
    // `en-IN` so the default currency gets Indian digit grouping (₹1,23,456.00);
    // other codes still render with their own symbol.
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Some Hermes builds ship without full ICU. A bare number reads as the
    // wrong currency entirely, so keep at least the symbol.
    return `${currencySymbol(currency)}${value.toFixed(2)}`;
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
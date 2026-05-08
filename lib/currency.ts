import {
  PLATFORM_DEFAULT_CURRENCY,
  PLATFORM_DEFAULT_LOCALE,
  getCountryOption,
} from "@/lib/request-options";

export function normalizeCurrency(currency?: string) {
  return (currency || PLATFORM_DEFAULT_CURRENCY).toUpperCase();
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = PLATFORM_DEFAULT_CURRENCY,
  locale = PLATFORM_DEFAULT_LOCALE
) {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function getCurrencyConfig(countryCode?: string) {
  const option = getCountryOption(countryCode);
  return {
    countryCode: option.value,
    currency: option.currency,
    locale: option.locale,
  };
}

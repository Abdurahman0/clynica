export const DEFAULT_CURRENCY_CODE = 'UZS';
export const DEFAULT_CURRENCY_LABEL = "so'm";

export function formatCurrencyAmount(value: number, locale: string): string {
  const normalized = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(normalized);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);

  return `${formatted} ${DEFAULT_CURRENCY_LABEL}`;
}

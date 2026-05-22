const UZ_MONTH_NAMES_SHORT = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
] as const;

const UZ_MONTH_NAMES_FULL = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

interface LocalizedDateOptions {
  locale: string;
  withYear?: boolean;
  withTime?: boolean;
  shortMonth?: boolean;
  fallback?: string;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function isUzbekLanguage(language: string): boolean {
  return language.toLowerCase().startsWith('uz');
}

export function formatUzMonthYear(date: Date, shortMonth = false): string {
  const monthList = shortMonth ? UZ_MONTH_NAMES_SHORT : UZ_MONTH_NAMES_FULL;
  const month = monthList[date.getMonth()] ?? UZ_MONTH_NAMES_FULL[0];
  return `${month} ${date.getFullYear()}`;
}

export function formatLocalizedDate(
  value: Date | string | null | undefined,
  language: string,
  options: LocalizedDateOptions,
): string {
  const date = toDate(value);
  if (!date) {
    return options.fallback ?? '';
  }

  const withYear = options.withYear ?? true;
  const withTime = options.withTime ?? false;
  const shortMonth = options.shortMonth ?? true;

  if (isUzbekLanguage(language)) {
    const month = shortMonth
      ? UZ_MONTH_NAMES_SHORT[date.getMonth()]
      : UZ_MONTH_NAMES_FULL[date.getMonth()];
    const day = formatTwoDigits(date.getDate());
    const year = date.getFullYear();
    const time = `${formatTwoDigits(date.getHours())}:${formatTwoDigits(date.getMinutes())}`;

    const dateLabel = withYear ? `${day} ${month} ${year}` : `${day} ${month}`;
    return withTime ? `${dateLabel}, ${time}` : dateLabel;
  }

  if (withTime) {
    return new Intl.DateTimeFormat(options.locale, {
      day: '2-digit',
      month: shortMonth ? 'short' : 'long',
      ...(withYear ? { year: 'numeric' } : {}),
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat(options.locale, {
    day: '2-digit',
    month: shortMonth ? 'short' : 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatUzbekShortDate(
  value: Date | string | null | undefined,
  fallback = '',
): string {
  return formatLocalizedDate(value, 'uz', {
    locale: 'uz-UZ',
    withYear: true,
    withTime: false,
    shortMonth: true,
    fallback,
  });
}

export function formatUzbekShortDateTime(
  value: Date | string | null | undefined,
  fallback = '',
): string {
  return formatLocalizedDate(value, 'uz', {
    locale: 'uz-UZ',
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback,
  });
}

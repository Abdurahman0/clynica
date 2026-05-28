import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import AppIcon from '../../../components/shared/icons/AppIcon';
import { FilterSelect } from '../../../components/shared/data';
import type { SelectOption } from '../../../types/common';

interface HandmadeDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: string;
  disabled?: boolean;
}

interface HandmadeDateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: string;
  disabled?: boolean;
}

const triggerClassName =
  'inline-flex min-h-[44px] w-full items-center justify-between gap-3 overflow-hidden rounded-lg border border-border-soft/60 bg-surface-card px-3.5 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm outline-none transition duration-fast hover:bg-surface-subtle/90 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const HANDMADE_MONTHS: Record<'uz' | 'ru' | 'en', string[]> = {
  uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function resolveMonthLocale(locale: string): 'uz' | 'ru' | 'en' {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('ru')) {
    return 'ru';
  }
  if (normalized.startsWith('uz')) {
    return 'uz';
  }
  return 'en';
}

function formatDateWithHandmadeMonth(date: Date, locale: string): string {
  const monthLocale = resolveMonthLocale(locale);
  const monthName = HANDMADE_MONTHS[monthLocale][date.getMonth()] ?? HANDMADE_MONTHS.en[date.getMonth()];
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${day} ${monthName} ${year}`;
}

function formatDateLabel(value: string | undefined, locale: string): string {
  const date = parseDateOnly(value);
  if (!date) {
    return '';
  }

  return formatDateWithHandmadeMonth(date, locale);
}

function parseDateTime(value: string | undefined): { date: string; hour: string; minute: string } {
  if (!value) {
    return { date: '', hour: '09', minute: '00' };
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) {
    return { date: '', hour: '09', minute: '00' };
  }

  return {
    date: match[1] ?? '',
    hour: match[2] ?? '09',
    minute: match[3] ?? '00',
  };
}

function toDateTimeLabel(value: string | undefined, locale: string): string {
  const parsed = parseDateTime(value);
  const date = parseDateOnly(parsed.date);
  if (!date) {
    return '';
  }

  return `${formatDateWithHandmadeMonth(date, locale)} ${parsed.hour}:${parsed.minute}`;
}

function toLocalDateTimeOrNull(date: string, hour: string, minute: string): Date | null {
  if (!date) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function HandmadeDatePicker({
  value,
  onChange,
  placeholder,
  locale,
  disabled,
}: HandmadeDatePickerProps) {
  const { t } = useTranslation();
  const selectedDate = useMemo(() => parseDateOnly(value), [value]);
  const label = formatDateLabel(value, locale);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName} disabled={disabled}>
          <span className={label ? 'text-text-primary' : 'text-text-muted'}>{label || placeholder}</span>
          <AppIcon name="calendar" className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-3" data-follow-up-panel="true">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            onChange(toDateOnly(date));
          }}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary transition duration-fast hover:bg-surface-subtle hover:text-text-primary"
            onClick={() => onChange('')}
          >{t('common.clear')}</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HandmadeDateTimePicker({
  value,
  onChange,
  placeholder,
  locale,
  disabled,
}: HandmadeDateTimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [draftHour, setDraftHour] = useState('09');
  const [draftMinute, setDraftMinute] = useState('00');

  useEffect(() => {
    const parsed = parseDateTime(value);
    setDraftDate(parsed.date);
    setDraftHour(parsed.hour);
    setDraftMinute(parsed.minute);
  }, [value]);

  const selectedDate = useMemo(() => parseDateOnly(draftDate), [draftDate]);
  const now = new Date();
  const selectedDateMidnight = selectedDate
    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    : null;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isPastDate = Boolean(selectedDateMidnight && selectedDateMidnight < todayMidnight);
  const isToday = Boolean(
    selectedDateMidnight &&
      selectedDateMidnight.getTime() === todayMidnight.getTime(),
  );
  const isCurrentHourToday = isToday && draftHour === `${now.getHours()}`.padStart(2, '0');
  const selectedDateTime = toLocalDateTimeOrNull(draftDate, draftHour, draftMinute);
  const canSave = Boolean(
    selectedDateTime && selectedDateTime.getTime() > now.getTime(),
  );

  const hourOptions = useMemo<SelectOption[]>(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const value = `${index}`.padStart(2, '0');
        const disabled = isPastDate || (isToday && index < now.getHours());
        return { value, label: value, disabled };
      }),
    [isPastDate, isToday, now],
  );

  const minuteOptions = useMemo<SelectOption[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const minuteValue = index * 5;
        const minute = `${minuteValue}`.padStart(2, '0');
        const disabled =
          isPastDate ||
          (isCurrentHourToday && minuteValue < now.getMinutes());
        return { value: minute, label: minute, disabled };
      }),
    [isPastDate, isCurrentHourToday, now],
  );

  const hasDate = draftDate.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName} disabled={disabled}>
          <span className={value ? 'text-text-primary' : 'text-text-muted'}>{toDateTimeLabel(value, locale) || placeholder}</span>
          <AppIcon name="calendar" className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3" data-follow-up-panel="true">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <FilterSelect value={draftHour} options={hourOptions} onChange={setDraftHour} disabled={!hasDate || isPastDate} size="compact" />
          <FilterSelect value={draftMinute} options={minuteOptions} onChange={setDraftMinute} disabled={!hasDate || isPastDate} size="compact" />
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            setDraftDate(toDateOnly(date));
          }}
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary transition duration-fast hover:bg-surface-subtle hover:text-text-primary"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >{t('common.clear')}</button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition duration-fast hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) {
                return;
              }
              onChange(`${draftDate}T${draftHour}:${draftMinute}`);
              setOpen(false);
            }}
          >{t('common.save')}</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


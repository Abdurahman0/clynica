import { DayPicker, type DayPickerProps } from 'react-day-picker';

type CalendarProps = DayPickerProps & {
  className?: string;
};

function joinClassNames(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={joinClassNames('p-0', className)}
      classNames={{
        root: 'rdp text-text-primary',
        months: 'flex flex-col gap-2',
        month: 'space-y-2',
        month_caption: 'flex items-center justify-center py-1',
        caption_label: 'text-sm font-semibold text-text-primary',
        nav: 'flex items-center gap-1',
        button_previous:
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-soft/60 bg-surface-subtle text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary',
        button_next:
          'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-soft/60 bg-surface-subtle text-text-secondary transition duration-fast hover:bg-surface-muted hover:text-text-primary',
        weekdays: 'grid grid-cols-7 gap-1',
        weekday:
          'h-8 w-8 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted',
        weeks: 'grid gap-1',
        week: 'grid grid-cols-7 gap-1',
        day: 'h-8 w-8 text-center text-sm',
        day_button:
          'h-8 w-8 rounded-md text-sm font-medium transition duration-fast hover:bg-primary/10 hover:text-text-primary aria-selected:opacity-100',
        selected: 'bg-primary text-primary-foreground hover:bg-primary',
        range_start: 'bg-primary text-primary-foreground hover:bg-primary',
        range_end: 'bg-primary text-primary-foreground hover:bg-primary',
        range_middle: 'bg-primary/14 text-text-primary',
        today: 'font-semibold text-primary',
        outside: 'text-text-muted/45',
        disabled: 'cursor-not-allowed text-text-muted/40',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };

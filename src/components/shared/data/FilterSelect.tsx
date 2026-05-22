import { useEffect, useMemo, useRef, useState } from 'react';
import type { SelectOption } from '../../../types/common';
import AppIcon from '../icons/AppIcon';
import { useTranslation } from 'react-i18next';

interface FilterSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'default' | 'compact';
}

function FilterSelect({
  value,
  options,
  onChange,
  disabled = false,
  size = 'default',
}: FilterSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updatePlacement() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const expectedMenuHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      setOpenAbove(
        spaceBelow < expectedMenuHeight && spaceAbove > spaceBelow,
      );
    }

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={['relative min-w-0', isOpen ? 'z-[140]' : 'z-10'].join(' ')}
    >
      <button
        type="button"
        className={[
          'inline-flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg border-0 bg-surface-card px-4 text-left',
          size === 'compact' ? 'h-10 min-h-10' : 'min-h-[44px]',
          'text-sm font-medium text-text-primary shadow-sm outline-none transition duration-fast',
          'hover:bg-surface-subtle/90 focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block min-w-0 flex-1 truncate pr-1">
          {selectedOption?.label ?? t('shared.filterSelect.select')}
        </span>
        <AppIcon
          name="chevron-down"
          className={[
            'h-4 w-4 shrink-0 text-text-muted transition duration-fast',
            isOpen ? 'rotate-180 text-text-secondary' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className={[
            'absolute left-0 z-[150] w-full overflow-hidden rounded-lg bg-surface-card p-1.5 shadow-[0_22px_44px_-30px_rgba(25,28,30,0.38)] ring-1 ring-border-soft/30',
            openAbove ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]',
          ].join(' ')}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              const isDisabled = Boolean(option.disabled);

              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition duration-fast',
                    isSelected
                      ? 'bg-primary/12 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                    isDisabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-text-secondary' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                >
                  <span className="block min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? (
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FilterSelect;

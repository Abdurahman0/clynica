import { useEffect, useRef } from 'react';
import AppIcon from '../icons/AppIcon';
import { useTranslation } from 'react-i18next';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SearchInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: SearchInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (disabled) {
      if (document.activeElement === inputRef.current) {
        shouldRestoreFocusRef.current = true;
      }
      return;
    }

    if (!shouldRestoreFocusRef.current || !inputRef.current) {
      return;
    }

    inputRef.current.focus({ preventScroll: true });
    const cursorPosition = inputRef.current.value.length;
    inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    shouldRestoreFocusRef.current = false;
  }, [disabled]);

  return (
    <div className="search-input relative max-w-full flex-1 basis-full min-[640px]:basis-[320px] min-[640px]:max-w-[420px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        <AppIcon name="search" className="h-4 w-4" aria-hidden="true" />
      </span>
      <input
        ref={inputRef}
        type="search"
        className={[
          'search-input__field min-h-[44px] w-full appearance-none rounded-lg border-0 bg-surface-subtle/90 pl-10 pr-4',
          '[-webkit-appearance:none] text-sm text-text-primary shadow-sm outline-none transition',
          'duration-fast placeholder:text-text-muted focus:bg-surface-card focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t('shared.searchInput.placeholder')}
        disabled={disabled}
      />
    </div>
  );
}

export default SearchInput;

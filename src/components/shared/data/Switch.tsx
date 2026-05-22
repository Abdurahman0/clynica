interface SwitchProps {
  checked: boolean;
  onChange: (nextValue: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  stopPropagation?: boolean;
}

function Switch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  stopPropagation = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={[
        'relative inline-flex h-8 w-[4rem] shrink-0 items-center rounded-full p-1 transition-[background-color,box-shadow] duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        checked
          ? 'bg-primary shadow-[inset_0_0_0_1px_rgb(255_255_255_/0.12)]'
          : 'bg-border-soft/85 shadow-[inset_0_0_0_1px_rgb(0_0_0_/0.08)]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }

        if (disabled) {
          return;
        }

        onChange(!checked);
      }}
      disabled={disabled}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0_/0.22),0_2px_3px_rgb(0_0_0_/0.12)] transition-transform duration-200 ease-out',
          checked ? 'translate-x-[2rem]' : 'translate-x-[0.3rem]',
        ].join(' ')}
      />
    </button>
  );
}

export default Switch;

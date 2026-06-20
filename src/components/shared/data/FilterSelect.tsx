import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import type { SelectOption } from '../../../types/common'
import AppIcon from '../icons/AppIcon'
import { useTranslation } from 'react-i18next'

interface FilterSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  size?: 'default' | 'compact'
}

interface MenuPosition {
  top: number
  left: number
  width: number
}

function FilterSelect({
  value,
  options,
  onChange,
  disabled = false,
  size = 'default',
}: FilterSelectProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [value])

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }

    function updatePlacement() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const expectedMenuHeight = 260
      const gap = 8
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const shouldOpenAbove =
        spaceBelow < expectedMenuHeight && spaceAbove > spaceBelow

      setOpenAbove(shouldOpenAbove)
      setMenuPosition({
        top: shouldOpenAbove
          ? Math.max(gap, rect.top - gap)
          : Math.min(window.innerHeight - gap, rect.bottom + gap),
        left: Math.max(gap, rect.left),
        width: Math.max(180, rect.width),
      })
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)

    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [isOpen])

  const menuStyle = useMemo<CSSProperties | undefined>(() => {
    if (!menuPosition) {
      return undefined
    }

    return {
      left: `${menuPosition.left}px`,
      maxHeight: 'min(16rem, calc(100dvh - 1rem))',
      position: 'fixed',
      top: openAbove ? 'auto' : `${menuPosition.top}px`,
      bottom: openAbove
        ? `${Math.max(8, window.innerHeight - menuPosition.top)}px`
        : 'auto',
      width: `${Math.min(menuPosition.width, window.innerWidth - 16)}px`,
    }
  }, [menuPosition, openAbove])

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
        aria-controls={isOpen ? 'filter-select-menu' : undefined}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 pr-1">
          {selectedOption?.color ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-border-soft/60"
              style={{ backgroundColor: selectedOption.color }}
              aria-hidden="true"
            />
          ) : null}
          <span className="block min-w-0 flex-1 truncate">
            {selectedOption?.label ?? t('shared.filterSelect.select')}
          </span>
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

      {isOpen && menuStyle && typeof document !== 'undefined'
        ? createPortal(
        <div
          id="filter-select-menu"
          ref={menuRef}
          className={[
            'z-[1310] overflow-hidden rounded-lg bg-surface-card p-1.5 shadow-[0_22px_44px_-30px_rgba(25,28,30,0.38)] ring-1 ring-border-soft/30',
          ].join(' ')}
          style={menuStyle}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value
              const isDisabled = Boolean(option.disabled)

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
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {option.color ? (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-border-soft/60"
                        style={{ backgroundColor: option.color }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="block min-w-0 flex-1 truncate">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}

export default FilterSelect

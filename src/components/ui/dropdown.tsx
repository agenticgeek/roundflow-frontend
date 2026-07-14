import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { cn } from '@/lib/utils'

export interface DropdownOption {
  value: string
  label: string
}

const dropdownSizeClass = {
  default: 'px-4 py-2.5 text-[15px]',
  sm: 'px-3.5 py-2 text-sm',
} as const

export type DropdownSize = keyof typeof dropdownSizeClass

export const dropdownTriggerClass =
  'flex w-full items-center justify-between gap-3 rounded-lg border border-foreground/90 bg-card text-left font-medium text-foreground shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60'

export const dropdownMenuClass =
  'overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg'

function DropdownCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-foreground/80 bg-card',
        checked && 'border-foreground bg-foreground text-background',
      )}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  )
}

function useDropdownDismiss(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, menuRef, onClose, open])
}

function DropdownItem({
  label,
  checked,
  onSelect,
  divider = true,
}: {
  label: string
  checked: boolean
  onSelect: () => void
  divider?: boolean
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent-surface/70',
        divider && 'border-b border-border/70 last:border-b-0',
      )}
    >
      <DropdownCheckbox checked={checked} />
      <span>{label}</span>
    </button>
  )
}

interface DropdownMenuPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

function DropdownMenuPortal({
  open,
  triggerRef,
  menuRef,
  labelledBy,
  children,
}: {
  open: boolean
  triggerRef: React.RefObject<HTMLElement | null>
  menuRef: React.RefObject<HTMLDivElement | null>
  labelledBy?: string
  children: ReactNode
}) {
  const [position, setPosition] = useState<DropdownMenuPosition>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
  })

  useLayoutEffect(() => {
    if (!open) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menuHeight = menuRef.current?.offsetHeight ?? 200
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow
      const maxHeight = Math.min(240, openUpward ? spaceAbove - 6 : spaceBelow - 6)

      setPosition({
        top: openUpward ? rect.top - Math.min(menuHeight, maxHeight) - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(maxHeight, 120),
      })
    }

    updatePosition()

    const observer = new ResizeObserver(updatePosition)
    if (triggerRef.current) observer.observe(triggerRef.current)
    if (menuRef.current) observer.observe(menuRef.current)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [menuRef, open, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      aria-labelledby={labelledBy}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
      className={cn(dropdownMenuClass, 'fixed z-[100] overflow-y-auto')}
    >
      {children}
    </div>,
    document.body,
  )
}

export interface SelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange' | 'value'> {
  options: DropdownOption[]
  value?: string
  onChange?: (event: { target: { value: string } }) => void
  inputSize?: DropdownSize
}

/** Custom single-select dropdown — replaces native `<select>` across the app. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { options, value = '', onChange, className, inputSize = 'default', disabled, 'aria-label': ariaLabel, ...props },
  ref,
) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerId = useId()
  useDropdownDismiss(open, () => setOpen(false), containerRef, menuRef)

  const selected = options.find((option) => option.value === value)
  const triggerLabel = selected?.label ?? options[0]?.label ?? 'Select'

  function handleSelect(nextValue: string) {
    onChange?.({ target: { value: nextValue } })
    setOpen(false)
  }

  function setRefs(node: HTMLButtonElement | null) {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={setRefs}
        id={triggerId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(dropdownTriggerClass, dropdownSizeClass[inputSize], className, 'rounded-lg')}
        {...props}
      >
        <span className="truncate">{triggerLabel}</span>
        <DashboardIcon
          name="chevron-down"
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      <DropdownMenuPortal open={open} triggerRef={triggerRef} menuRef={menuRef} labelledBy={triggerId}>
        {options.map((option) => (
          <DropdownItem
            key={option.value || '__empty__'}
            label={option.label}
            checked={option.value === value}
            onSelect={() => handleSelect(option.value)}
          />
        ))}
      </DropdownMenuPortal>
    </div>
  )
})

export interface MultiSelectProps {
  options: DropdownOption[]
  value: string[]
  onChange: (next: string[]) => void
  label: string
  allLabel?: string
  className?: string
  inputSize?: DropdownSize
  disabled?: boolean
  'aria-label'?: string
}

/** Checkbox multi-select dropdown — used for Customers status filter. */
export function MultiSelect({
  options,
  value,
  onChange,
  label,
  allLabel = 'All',
  className,
  inputSize = 'default',
  disabled,
  'aria-label': ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerId = useId()
  useDropdownDismiss(open, () => setOpen(false), containerRef, menuRef)

  const optionValues = options.map((option) => option.value)
  const allSelected = optionValues.length > 0 && optionValues.every((optionValue) => value.includes(optionValue))
  const triggerLabel =
    allSelected || value.length === 0
      ? label
      : value.length === 1
        ? (options.find((option) => option.value === value[0])?.label ?? label)
        : `${label} (${value.length})`

  function toggleAll() {
    onChange(allSelected ? [] : [...optionValues])
  }

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((current) => current !== optionValue))
      return
    }
    onChange([...value, optionValue])
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={ariaLabel ?? label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(dropdownTriggerClass, dropdownSizeClass[inputSize], className, 'rounded-lg')}
      >
        <span className="truncate">{triggerLabel}</span>
        <DashboardIcon
          name="chevron-down"
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      <DropdownMenuPortal open={open} triggerRef={triggerRef} menuRef={menuRef} labelledBy={triggerId}>
        <DropdownItem label={allLabel} checked={allSelected || value.length === 0} onSelect={toggleAll} />
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onSelect={() => toggleOption(option.value)}
          />
        ))}
      </DropdownMenuPortal>
    </div>
  )
}

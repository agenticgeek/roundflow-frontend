import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Step title row — tinted icon tile, heading and one-line description. */
export function WizardStepTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** White card used for each block of a step. */
export function WizardCard({
  heading,
  description,
  action,
  tone = 'default',
  className,
  children,
}: {
  heading?: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** `accent` — teal border, for the thing that needs attention (e.g. a connected provider). */
  tone?: 'default' | 'accent'
  className?: string
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border bg-card p-5 sm:p-6',
        tone === 'accent' ? 'border-primary/30' : 'border-border',
        className,
      )}
    >
      {heading || action ? (
        <div className={cn('flex flex-wrap items-start justify-between gap-3', children ? 'mb-5' : undefined)}>
          <div className="min-w-0">
            {heading ? <h3 className="text-base font-semibold text-foreground sm:text-lg">{heading}</h3> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5M10 6.5v.01" strokeLinecap="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M10 3 2.5 16.5h15L10 3Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.5v.01" strokeLinecap="round" />
    </svg>
  )
}

/** Teal info strip. */
export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground sm:text-[15px]', className)}>
      <span className="text-primary">
        <InfoIcon />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Yellow warning strip. */
export function WarningNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground sm:text-[15px]', className)}>
      <WarningIcon />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Pill chip — toggleable when `onClick` is given, with a tick when selected. */
export function ChoiceChip({
  label,
  selected = false,
  onClick,
  disabled,
}: {
  label: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
    selected ? 'border-primary/25 bg-primary/10 text-foreground' : 'border-border bg-card text-foreground',
  )
  if (!onClick) return <span className={className}>{label}</span>
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(className, !selected && 'hover:bg-surface', 'disabled:cursor-not-allowed disabled:opacity-50')}
    >
      {selected ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      {label}
    </button>
  )
}

/** Radio-style option card — teal border when selected. */
export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  aside,
  className,
}: {
  selected: boolean
  onSelect: () => void
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors duration-150 sm:px-5',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-surface',
        className,
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-primary' : 'border-muted/50',
          )}
        >
          {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground sm:text-[15px]">{title}</span>
          {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
        </span>
      </button>
      {aside}
    </div>
  )
}

/** Small rounded status pill. */
export function StatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'neutral' | 'primary'
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm whitespace-nowrap',
        tone === 'success' && 'bg-success/10 text-success',
        tone === 'warning' && 'bg-warning-surface text-warning-foreground',
        tone === 'neutral' && 'bg-foreground/[0.05] text-muted',
        tone === 'primary' && 'bg-primary/10 text-primary',
      )}
    >
      {children}
    </span>
  )
}

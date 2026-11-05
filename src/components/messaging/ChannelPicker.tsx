import { Link } from 'react-router-dom'
import type { SendChannel } from '@/api/invoices.api'
import { sharedActionsContent } from '@/content/shared-actions'
import { describeMessagingError } from '@/features/messaging/lib/messaging-errors'
import { cn } from '@/lib/utils'

/** Auto / SMS / Email / WhatsApp segmented picker for send, remind and payment-link actions (GAP-034). */
export function ChannelPicker({
  value,
  onChange,
  disabled = false,
  label = sharedActionsContent.channel.label,
  className,
}: {
  value: SendChannel
  onChange: (channel: SendChannel) => void
  disabled?: boolean
  label?: string
  className?: string
}) {
  const copy = sharedActionsContent.channel
  return (
    <section className={className}>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-2 grid grid-cols-4 gap-2">
        {copy.options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {value === 'AUTO' ? <p className="mt-1.5 text-xs text-muted">{copy.autoHint}</p> : null}
    </section>
  )
}

/**
 * The server's error for a failed send, with a specific fix: "Connect Stripe" /
 * "Connect messaging" link to Settings › Integrations, or a hint for a missing contact.
 */
export function MessagingErrorNotice({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null
  const view = describeMessagingError(error)
  return (
    <div
      role="alert"
      className={cn('rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger', className)}
    >
      <p className="font-semibold">{view.message}</p>
      {view.hint ? <p className="mt-1 text-foreground">{view.hint}</p> : null}
      {view.cta ? (
        <Link to={view.cta.to} className="mt-2 inline-block font-semibold text-primary underline underline-offset-2">
          {view.cta.label}
        </Link>
      ) : null}
    </div>
  )
}

import type { MessageBulkResult } from '@/api/messages.api'
import {
  RECIPIENT_STATUS_LABELS,
  summariseBroadcast,
  unmessagedRecipients,
} from '@/features/messages/lib/broadcast-summary'

/**
 * What the server did for each recipient: the counts line, then who was not messaged and why.
 * Shared by the round message composers and the weather hold result.
 */
export function BroadcastResultPanel({
  result,
  notMessagedTitle,
}: {
  result: MessageBulkResult
  notMessagedTitle: string
}) {
  const notMessaged = unmessagedRecipients(result)

  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-accent/20 bg-accent-surface px-4 py-3 text-sm font-medium text-accent">
        {summariseBroadcast(result)}
      </p>
      {notMessaged.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-foreground">{notMessagedTitle}</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted">
            {notMessaged.map((recipient) => (
              <li key={recipient.customerId} className="flex justify-between gap-3">
                <span className="text-foreground">{recipient.customerName}</span>
                <span>{RECIPIENT_STATUS_LABELS[recipient.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

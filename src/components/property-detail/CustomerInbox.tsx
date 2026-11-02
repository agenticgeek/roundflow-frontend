import { chatContent } from '@/content/chat'
import { useCustomerInbox, useMarkInboxRead } from '@/features/chat/hooks/useChat'
import { errorMessage } from '@/lib/errors'

/** Inbound replies from the customer (GET /messages/inbox?customerId=), newest first. */
export function CustomerInbox({ customerId }: { customerId: string }) {
  const copy = chatContent.inbox
  const query = useCustomerInbox(customerId)
  const markRead = useMarkInboxRead(customerId)
  const unreadCount = query.data?.unreadCount ?? 0

  return (
    <section aria-label={copy.title} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">
          {copy.title}
          {unreadCount > 0 ? (
            <span className="ml-2 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </h3>
        {unreadCount > 0 ? (
          <button
            type="button"
            disabled={markRead.isPending}
            onClick={() => markRead.mutate()}
            className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
          >
            {copy.markRead}
          </button>
        ) : null}
      </div>
      {query.isPending ? (
        <p className="mt-3 text-sm text-muted">{copy.loading}</p>
      ) : query.isError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorMessage(query.error)}
        </p>
      ) : query.data.rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{copy.empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {query.data.rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-surface px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap break-words text-foreground">{row.body}</p>
              <p className="mt-1 text-[11px] text-muted">
                {new Date(row.receivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {row.channel}
                {row.unread ? <span className="ml-2 font-semibold text-primary">{copy.unread}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

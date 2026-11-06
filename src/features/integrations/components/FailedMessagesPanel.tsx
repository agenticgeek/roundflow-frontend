import { useId, useState } from 'react'
import type { OutboxRow, OutboxStatus } from '@/api/integrations.api'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pager } from '@/components/ui/pager'
import { useToast } from '@/components/ui/toast'
import { failedMessagesContent as copy } from '@/content/integrations'
import { useOutbox, useReplayOutbox } from '@/features/integrations/hooks/useOutbox'
import { eventLabel, formatFailedAt, replayErrorMessage } from '@/features/integrations/lib/format'
import { errorMessage } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

const buttonClass =
  'rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/**
 * Settings > Failed integration messages (ADMIN only). Dead and failed outbox rows with a Retry per row.
 * Accessibility: a real table with a caption and column headers, status in words (not colour), a
 * focusable scroll region on narrow screens, an `alertdialog` confirm before a retry, and errors in
 * `role="alert"`.
 */
export function FailedMessagesPanel() {
  const { showToast } = useToast()
  const filterId = useId()
  const [status, setStatus] = useState<OutboxStatus>('dead')
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<OutboxRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const query = useOutbox(status, page)
  const replay = useReplayOutbox()

  function closeDialog() {
    setPending(null)
    setError(null)
  }

  async function confirmReplay() {
    setError(null)
    try {
      // The dialog (and so this handler) only exists while a row is pending.
      await replay.mutateAsync(pending!.id)
      closeDialog()
      showToast(copy.queued)
    } catch (caught) {
      setError(replayErrorMessage(caught))
    }
  }

  const data = query.data

  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{copy.heading}</h2>
      <p className="mt-0.5 text-sm text-muted">{copy.subheading}</p>

      <div className="mt-5 flex items-center gap-3">
        <label htmlFor={filterId} className="text-sm font-medium text-foreground">
          {copy.filterLabel}
        </label>
        <select
          id={filterId}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OutboxStatus)
            setPage(1)
          }}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          {copy.statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        {query.isError ? (
          <div role="alert" className="text-sm">
            <p className="font-semibold text-foreground">{copy.loadFailed}</p>
            <p className="mt-1 text-muted">{errorMessage(query.error)}</p>
            <button type="button" onClick={() => void query.refetch()} className={`${buttonClass} mt-3`}>
              {copy.retryLoading}
            </button>
          </div>
        ) : !data ? (
          <p role="status" className="text-sm text-muted">
            {copy.loading}
          </p>
        ) : data.pagination.total === 0 ? (
          <p role="status" className="text-sm text-muted">
            {copy.empty}
          </p>
        ) : (
          <>
            <div role="region" aria-label={copy.table.scrollRegion} tabIndex={0} className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <caption className="sr-only">{copy.table.caption}</caption>
                <thead className="border-b border-border text-muted">
                  <tr>
                    {[copy.table.event, copy.table.status, copy.table.attempts, copy.table.lastError, copy.table.failedAt, copy.table.action].map((heading) => (
                      <th key={heading} scope="col" className="px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.rows.map((row) => {
                    const when = formatFailedAt(row.createdAt)
                    return (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-medium text-foreground">{eventLabel(row.eventType)}</td>
                        <td className="px-3 py-2 text-foreground">{copy.statuses[row.status]}</td>
                        <td className="px-3 py-2 text-foreground">{row.attempts}</td>
                        <td className="max-w-xs px-3 py-2 text-muted">{row.lastError ?? copy.table.noError}</td>
                        <td className="px-3 py-2 text-muted">
                          <time dateTime={row.createdAt}>{when}</time>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className={buttonClass}
                            aria-label={fillCopy(copy.retryRowLabel, { event: eventLabel(row.eventType).toLowerCase(), time: when })}
                            onClick={() => setPending(row)}
                          >
                            {copy.retry}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager pagination={data.pagination} loading={query.isFetching} onPage={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={copy.confirm.title}
        description={copy.confirm.description}
        confirmLabel={copy.confirm.confirm}
        tone="primary"
        pending={replay.isPending}
        error={error}
        onConfirm={() => void confirmReplay()}
        onClose={closeDialog}
      />
    </article>
  )
}

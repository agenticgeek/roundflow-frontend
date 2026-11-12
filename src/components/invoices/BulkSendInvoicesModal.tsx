import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { BulkSendFilters, BulkSendTarget } from '@/api/invoice-bulk-send.api'
import { describeMessagingError } from '@/features/messaging/lib/messaging-errors'
import { ChannelPicker } from '@/components/messaging/ChannelPicker'
import { useChannelChoice } from '@/features/messaging/hooks/useChannels'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { invoicesContent } from '@/content/invoices'
import { useBulkSendBatch, useBulkSendPreview, useStartBulkSend } from '@/features/invoices/hooks/useBulkSend'
import {
  batchSummary,
  channelRows,
  failedResults,
  skipRows,
  type BulkSendResult,
  type CountRow,
} from '@/features/invoices/lib/bulk-send'
import type { ApiError } from '@/lib/errors'

const copy = invoicesContent.bulkSend

function CountList({ heading, rows }: { heading: string; rows: CountRow[] }) {
  if (rows.length === 0) return null
  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
      <ul className="mt-1 space-y-1 text-sm text-foreground">
        {rows.map((row) => (
          <li key={row.key} className="flex justify-between gap-3">
            <span>{row.label}</span>
            <span className="font-semibold">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StartError({ error }: { error: unknown }) {
  const code = (error as ApiError).code
  // 409 CHANNEL_UNAVAILABLE says why by `reason`; INVALID_BATCH_SIZE and anything else get fixed copy.
  const view = code === 'CHANNEL_UNAVAILABLE' ? describeMessagingError(error) : null
  const message = view
    ? view.message
    : code === 'INVALID_BATCH_SIZE'
      ? copy.invalidBatchSize.replace('{max}', String(copy.maxPerBatch))
      : copy.startError
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      <p className="font-semibold">{message}</p>
      {view?.hint ? <p className="mt-1 font-normal text-foreground">{view.hint}</p> : null}
      {view?.cta ? (
        <Link to={view.cta.to} className="mt-2 inline-block font-semibold text-primary underline underline-offset-2">
          {view.cta.label}
        </Link>
      ) : null}
    </div>
  )
}

function ResultsPanel({
  results,
  queued,
  skippedEarly,
  labels,
}: {
  results: BulkSendResult[]
  /** How many invoices the server queued, shown until the first poll answers. */
  queued: number
  skippedEarly: number
  labels: Record<string, string>
}) {
  const summary = batchSummary(results)
  const failed = failedResults(results)
  const text =
    summary.queued > 0 || summary.total === 0
      ? copy.progress.replace('{done}', String(summary.done)).replace('{total}', String(summary.total || queued))
      : copy.finished
          .replace('{sent}', String(summary.sent))
          .replace('{failed}', String(summary.failed))
          .replace('{skipped}', String(summary.skipped))
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm font-semibold text-foreground">
        {text}
      </p>
      {skippedEarly > 0 ? <p className="text-sm text-muted">{copy.queuedSkipped.replace('{count}', String(skippedEarly))}</p> : null}
      {failed.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-danger">{copy.failuresHeading}</h3>
          <ul className="mt-1 space-y-1 text-sm text-foreground">
            {failed.map((result) => (
              <li key={result.id}>
                {labels[result.id] ?? result.id}: {result.error ?? copy.unknownError}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/**
 * ACT-01: send every draft invoice (or the selected ones) in one batch. Step 1 asks the server for a
 * preview (counts by channel and skip reasons); step 2 queues the batch and polls it, announcing
 * progress in a `role="status"` line; failures can be retried. Mount only while open.
 */
export function BulkSendInvoicesModal({
  ids,
  filters,
  onClose,
}: {
  /** The ticked invoices; omit to send every DRAFT in the current view. */
  ids?: string[]
  /** Search and date filters of the current view (ignored when `ids` is given). */
  filters?: BulkSendFilters
  onClose: () => void
}) {
  const [channel, setChannel] = useChannelChoice()
  const [batchId, setBatchId] = useState<string | null>(null)
  const [queued, setQueued] = useState({ count: 0, skipped: 0 })
  const target: BulkSendTarget = { ...(ids ? { ids } : { status: 'DRAFT', filters }), channel }
  const preview = useBulkSendPreview(target)
  const start = useStartBulkSend()
  const batch = useBulkSendBatch(batchId)
  const results = batch.data?.results ?? []
  const failed = failedResults(results)
  const started = batchId !== null

  async function run(input: BulkSendTarget) {
    try {
      const result = await start.mutateAsync(input)
      setQueued({ count: result.queued, skipped: result.skipped.length })
      setBatchId(result.batchId)
    } catch {
      // Shown inline by StartError.
    }
  }

  const eligible = preview.data?.willSend ?? 0
  const labels = Object.fromEntries(
    (preview.data?.invoices ?? []).map((invoice) => [invoice.id, `${invoice.invoiceNumber} · ${invoice.customerName}`]),
  )
  const sendLabel = eligible === 1 ? copy.sendOne : copy.send.replace('{count}', String(eligible))

  return (
    <Modal
      open
      onClose={start.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={ids ? copy.subtitleSelected : copy.subtitleAll}
      size="compact"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={start.isPending}>
            {started ? copy.close : copy.cancel}
          </ModalButton>
          {started && failed.length > 0 ? (
            <ModalButton
              compact
              variant="primary"
              loading={start.isPending}
              onClick={() => void run({ ids: failed.map((result) => result.id), channel })}
            >
              {start.isPending ? copy.retrying : copy.retryFailed.replace('{count}', String(failed.length))}
            </ModalButton>
          ) : null}
          {started ? null : (
            <ModalButton
              compact
              variant="primary"
              loading={start.isPending}
              disabled={eligible === 0}
              onClick={() => void run(target)}
            >
              {start.isPending ? copy.sending : sendLabel}
            </ModalButton>
          )}
        </ModalFooter>
      }
    >
      {started ? (
        <>
          <ResultsPanel results={results} queued={queued.count} skippedEarly={queued.skipped} labels={labels} />
          {batch.isError ? (
            <p role="alert" className="text-sm text-danger">
              {copy.pollError}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <ChannelPicker value={channel} onChange={setChannel} disabled={start.isPending} />
          {preview.isPending ? <p className="text-sm text-muted">{copy.previewLoading}</p> : null}
          {preview.isError ? (
            <p role="alert" className="text-sm text-danger">
              {copy.previewError}
            </p>
          ) : null}
          {preview.data ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {eligible === 0 ? copy.nothingToSend : copy.willSend.replace('{count}', String(eligible))}
              </p>
              {preview.data.truncated ? (
                <p className="text-sm text-muted">{copy.truncatedNote.replaceAll('{max}', String(copy.maxPerBatch))}</p>
              ) : null}
              <CountList heading={copy.byChannelHeading} rows={channelRows(preview.data.byChannel)} />
              <CountList heading={copy.skippedHeading} rows={skipRows(preview.data.skipped)} />
            </div>
          ) : null}
        </>
      )}
      {start.isError ? <StartError error={start.error} /> : null}
    </Modal>
  )
}

import { useState } from 'react'
import type { InvoiceBulkResult, SendChannel } from '@/api/invoices.api'
import { ChannelPicker, MessagingErrorNotice } from '@/components/messaging/ChannelPicker'
import { Modal, ModalButton, ModalFooter, ModalToggleRow, modalInfoPanelClass } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { todaysWorkContent } from '@/content/todays-work'
import { useBulkInvoicePreview, useCreateBulkInvoices } from '@/features/today/hooks/useBulkInvoices'
import {
  formatPounds,
  selectedTotals,
  skipReasonLabel,
  summarizeBulkResult,
} from '@/features/today/lib/bulk-invoices'
import { errorMessage } from '@/lib/errors'

const copy = todaysWorkContent.bulkInvoices

type Step = 'preview' | 'confirm' | 'result'

/**
 * "Create invoices for today" (GAP-014): preview the day's invoices (untick to leave one
 * out, live totals) → confirm with an optional "Send now" + channel → result summary.
 * Mount it only while open so each run starts fresh.
 */
export function BulkInvoicesModal({ date, onClose }: { date: string; onClose: () => void }) {
  const preview = useBulkInvoicePreview(date, true)
  const create = useCreateBulkInvoices()
  const [step, setStep] = useState<Step>('preview')
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const [sendNow, setSendNow] = useState(false)
  const [channel, setChannel] = useState<SendChannel>('AUTO')
  const [result, setResult] = useState<InvoiceBulkResult | null>(null)

  const items = preview.data?.items ?? []
  const skipped = preview.data?.skipped ?? []
  const totals = selectedTotals(items, excluded)
  const totalsLabel = copy.totals.replace('{count}', String(totals.count)).replace('{amount}', formatPounds(totals.amount))

  function toggle(visitId: string) {
    setExcluded((current) => {
      const next = new Set(current)
      if (next.has(visitId)) next.delete(visitId)
      else next.add(visitId)
      return next
    })
  }

  async function submit() {
    try {
      const created = await create.mutateAsync({
        date,
        excludeVisitIds: [...excluded],
        sendNow,
        ...(sendNow ? { channel } : {}),
      })
      setResult(created)
      setStep('result')
    } catch {
      // Shown inline by MessagingErrorNotice (server message + CTA).
    }
  }

  const summary = result ? summarizeBulkResult(result, items) : null

  const footer =
    step === 'preview' ? (
      <ModalFooter compact>
        <ModalButton compact onClick={onClose}>
          {copy.actions.cancel}
        </ModalButton>
        <ModalButton compact variant="primary" disabled={totals.count === 0} onClick={() => setStep('confirm')}>
          {copy.actions.continue}
        </ModalButton>
      </ModalFooter>
    ) : step === 'confirm' ? (
      <ModalFooter compact>
        <ModalButton compact disabled={create.isPending} onClick={() => setStep('preview')}>
          {copy.actions.back}
        </ModalButton>
        <ModalButton compact variant="primary" loading={create.isPending} onClick={() => void submit()}>
          {create.isPending ? copy.actions.creating : copy.actions.create}
        </ModalButton>
      </ModalFooter>
    ) : (
      <ModalFooter compact>
        <ModalButton compact variant="primary" onClick={onClose}>
          {copy.actions.done}
        </ModalButton>
      </ModalFooter>
    )

  return (
    <Modal
      open
      onClose={create.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={step === 'preview' ? copy.subtitle : undefined}
      size="compact"
      maxWidthClass="max-w-2xl"
      stacked
      bodyClassName="space-y-4"
      footer={footer}
    >
      {step === 'preview' ? (
        preview.isPending ? (
          <div aria-busy="true" className="space-y-2">
            <p className="text-sm text-muted">{copy.loading}</p>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : preview.isError ? (
          <div role="alert" className="text-sm">
            <p className="font-semibold text-foreground">{copy.loadError}</p>
            <p className="mt-1 text-muted">{errorMessage(preview.error)}</p>
            <button type="button" onClick={() => void preview.refetch()} className="mt-2 font-semibold text-primary underline">
              {copy.retry}
            </button>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-sm font-semibold text-foreground">{copy.itemsTitle}</h3>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{copy.noItems}</p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {items.map((item) => {
                    const visitId = item.visitId ?? ''
                    const name = item.customerName ?? copy.unknownCustomer
                    return (
                      <li key={visitId} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          aria-label={copy.include.replace('{customer}', name)}
                          checked={!excluded.has(visitId)}
                          onChange={() => toggle(visitId)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-foreground">{name}</span>
                          {item.address ? <span className="block truncate text-xs text-muted">{item.address}</span> : null}
                        </span>
                        <span className="font-semibold text-foreground">{formatPounds(item.total ?? item.amount)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="mt-2 text-sm font-semibold text-foreground">{totalsLabel}</p>
            </section>
            {skipped.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-foreground">{copy.skippedTitle}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {skipped.map((row, index) => (
                    <li key={row.visitId ?? index} className="flex justify-between gap-3">
                      <span>{row.customerName ?? copy.unknownCustomer}</span>
                      <span className="text-muted">{skipReasonLabel(row.reason)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )
      ) : null}

      {step === 'confirm' ? (
        <>
          <p className={modalInfoPanelClass}>
            {copy.confirmSummary.replace('{count}', String(totals.count)).replace('{amount}', formatPounds(totals.amount))}
          </p>
          <ModalToggleRow
            compact
            label={copy.sendNow}
            description={copy.sendNowDescription}
            ariaLabel={copy.sendNow}
            checked={sendNow}
            onChange={setSendNow}
          />
          {sendNow ? <ChannelPicker value={channel} onChange={setChannel} disabled={create.isPending} /> : null}
          {create.isError ? <MessagingErrorNotice error={create.error} /> : null}
        </>
      ) : null}

      {summary ? (
        <>
          <p className="text-base font-semibold text-foreground">{summary.headline}</p>
          {summary.failures.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {summary.failures.map((failure, index) => (
                <li key={failure.visitId || index} className="text-danger">
                  <span className="font-semibold">{failure.customerName}</span>
                  {failure.message ? ` — ${failure.message}` : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </Modal>
  )
}

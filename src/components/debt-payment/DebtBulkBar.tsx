import { useState } from 'react'
import type { DebtBulkAction, DebtBulkResult } from '@/api/debt.api'
import { Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { debtPaymentContent } from '@/content/debt-payment'
import { useDebtBulk } from '@/features/debt/hooks/useDebt'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface DebtBulkBarProps {
  /** Selected board rows: the invoice id sent to the API, plus a label for the result list. */
  selected: { invoiceId: string; label: string }[]
  onClear: () => void
}

/** Bulk reminder / hold / bad-debt for the ticked board rows; anything that sends is confirmed first. */
export function DebtBulkBar({ selected, onClear }: DebtBulkBarProps) {
  const copy = debtPaymentContent.bulk
  const bulk = useDebtBulk()
  const [pending, setPending] = useState<DebtBulkAction | null>(null)
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DebtBulkResult | null>(null)

  if (selected.length === 0 && !result) return null

  const labelById = new Map(selected.map((row) => [row.invoiceId, row.label]))
  const count = String(selected.length)
  const confirmText =
    pending === 'remind'
      ? copy.confirmRemind
      : pending === 'hold'
        ? copy.confirmHold
        : copy.confirmBadDebt

  function open(action: DebtBulkAction) {
    setPending(action)
    setReason('')
    setNotify(false)
    setError(null)
  }

  async function run() {
    if (!pending || bulk.isPending) return
    try {
      const outcome = await bulk.mutateAsync({
        ids: selected.map((row) => row.invoiceId),
        action: pending,
        ...(pending === 'remind' ? { channel: 'AUTO' as const } : {}),
        ...(pending === 'hold' ? { reason: reason.trim() || undefined, notify } : {}),
      })
      setPending(null)
      setResult(outcome)
      // Rows that went through leave the selection; failed ones stay ticked to retry.
      if (outcome.failed === 0) onClear()
    } catch (caught) {
      setError(errorMessage(caught) || copy.requestFailed)
    }
  }

  return (
    <>
      {selected.length > 0 ? (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent-surface px-4 py-3"
        >
          <span className="mr-2 text-sm font-semibold text-foreground">{copy.selected.replace('{count}', count)}</span>
          {(
            [
              ['remind', copy.remind],
              ['hold', copy.hold],
              ['bad-debt', copy.badDebt],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              onClick={() => open(action)}
              className="rounded-lg border border-primary/30 bg-card px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-surface"
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={onClear} className="ml-auto text-sm font-medium text-muted hover:text-foreground">
            {copy.clear}
          </button>
        </div>
      ) : null}

      <Modal
        open={pending !== null}
        onClose={bulk.isPending ? () => undefined : () => setPending(null)}
        title={pending === 'remind' ? copy.remind : pending === 'hold' ? copy.hold : copy.badDebt}
        size="compact"
        maxWidthClass="max-w-md"
        bodyClassName="space-y-4"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" disabled={bulk.isPending} onClick={() => setPending(null)}>
              {copy.cancel}
            </ModalButton>
            <ModalButton compact variant="primary" className="w-full" disabled={bulk.isPending} onClick={() => void run()}>
              {bulk.isPending ? copy.working : copy.confirm}
            </ModalButton>
          </div>
        }
      >
        <p className="text-sm text-foreground">{confirmText.replace('{count}', count)}</p>
        {pending === 'hold' ? (
          <>
            <label className="block text-sm font-medium text-foreground">
              {copy.reasonLabel}
              <Textarea inputSize="sm" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
              {copy.notifyLabel}
            </label>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title={copy.resultTitle}
        size="compact"
        maxWidthClass="max-w-md"
        footer={
          <ModalButton compact variant="primary" className="w-full" onClick={() => setResult(null)}>
            {copy.close}
          </ModalButton>
        }
      >
        {result ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {copy.resultSummary.replace('{succeeded}', String(result.succeeded)).replace('{failed}', String(result.failed))}
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {result.results.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="text-foreground">{labelById.get(row.id) ?? row.id}</span>
                  <span className={cn('text-right', row.ok ? 'text-success' : 'text-danger')}>
                    {row.ok ? copy.resultOk : row.error}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </>
  )
}

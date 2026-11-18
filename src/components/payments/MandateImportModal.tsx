import { useMemo, useState } from 'react'
import type { MandateImportCandidate, MandateImportResult } from '@/api/direct-debit.api'
import { Input } from '@/components/ui'
import { Modal, ModalButton, ModalFooter, modalWarningPanelClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { directDebitContent } from '@/content/direct-debit'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { useImportMandates, useMandateImportCandidates } from '@/features/direct-debit/hooks/useDirectDebit'
import { errorMessage } from '@/lib/errors'
import { initialChoices, type MandateChoice as Choice } from '@/features/direct-debit/lib/direct-debit'

/**
 * Review existing GoCardless mandates and link the confirmed ones to RoundFlow customers (ADMIN). Each row starts on
 * the suggested match (email, else mobile) and can be changed or left out. Mount only while open.
 */
export function MandateImportModal({ onClose }: { onClose: () => void }) {
  const copy = directDebitContent.import
  const { showToast } = useToast()
  const candidates = useMandateImportCandidates(true)
  const importMandates = useImportMandates()
  const rows = useMemo(() => candidates.data?.rows ?? [], [candidates.data])
  const [overrides, setOverrides] = useState<Record<string, Choice | null>>({})
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<MandateImportResult | null>(null)

  const choices = useMemo(() => ({ ...initialChoices(rows), ...overrides }), [rows, overrides])
  const selectable = rows.filter((row) => !row.linkedCustomerId && choices[row.mandateId])
  const selected = selectable.filter((row) => !deselected.has(row.mandateId))

  function toggle(mandateId: string) {
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(mandateId)) next.delete(mandateId)
      else next.add(mandateId)
      return next
    })
  }

  async function submit() {
    try {
      const res = await importMandates.mutateAsync(
        selected.map((row) => ({ mandateId: row.mandateId, customerId: choices[row.mandateId]!.customerId })),
      )
      setResult(res)
      setOverrides({})
      setDeselected(new Set())
      showToast(
        res.failed
          ? copy.doneWithFailures.replace('{linked}', String(res.linked)).replace('{failed}', String(res.failed))
          : copy.done.replace('{linked}', String(res.linked)),
      )
    } catch {
      // Shown inline below.
    }
  }

  const nameOf = (mandateId: string) => rows.find((row) => row.mandateId === mandateId)?.name ?? mandateId
  const failures = result?.results.filter((r) => r.status === 'failed') ?? []

  return (
    <Modal
      open
      onClose={importMandates.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      bodyClassName="space-y-4"
      footer={
        <ModalFooter>
          <span className="mr-auto text-sm text-muted">{copy.selectedCount.replace('{count}', String(selected.length))}</span>
          <ModalButton onClick={onClose} disabled={importMandates.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton
            variant="primary"
            loading={importMandates.isPending}
            disabled={selected.length === 0}
            onClick={() => void submit()}
          >
            {importMandates.isPending ? copy.linking : copy.link}
          </ModalButton>
        </ModalFooter>
      }
    >
      {candidates.isPending ? <p className="text-sm text-muted">{copy.loading}</p> : null}
      {candidates.isError ? (
        <p role="alert" className={modalWarningPanelClass}>
          {errorMessage(candidates.error)}
        </p>
      ) : null}
      {candidates.isSuccess && rows.length === 0 ? <p className="text-sm text-muted">{copy.empty}</p> : null}
      {importMandates.error ? (
        <p role="alert" className={modalWarningPanelClass}>
          {errorMessage(importMandates.error)}
        </p>
      ) : null}
      {failures.length ? (
        <div role="alert" className={modalWarningPanelClass}>
          <p className="font-semibold">{copy.failedTitle}</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((f) => (
              <li key={`${f.mandateId}-${f.customerId}`}>
                {nameOf(f.mandateId)}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rows.length ? (
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">{copy.headers.select}</th>
                <th className="px-3 py-2">{copy.headers.gocardless}</th>
                <th className="px-3 py-2">{copy.headers.status}</th>
                <th className="px-3 py-2">{copy.headers.customer}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <ImportRow
                  key={row.mandateId}
                  row={row}
                  choice={choices[row.mandateId] ?? null}
                  checked={!deselected.has(row.mandateId)}
                  onToggle={() => toggle(row.mandateId)}
                  onChoose={(choice) => setOverrides((prev) => ({ ...prev, [row.mandateId]: choice }))}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Modal>
  )
}

function ImportRow({
  row,
  choice,
  checked,
  onToggle,
  onChoose,
}: {
  row: MandateImportCandidate
  choice: Choice | null
  checked: boolean
  onToggle: () => void
  onChoose: (choice: Choice) => void
}) {
  const copy = directDebitContent.import
  const [picking, setPicking] = useState(false)
  const linked = Boolean(row.linkedCustomerId)
  const contact = [row.email, row.phone, row.postcode].filter(Boolean).join(' · ')

  return (
    <tr>
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          aria-label={`${copy.headers.select} ${row.name}`}
          className="h-4 w-4 accent-primary"
          disabled={linked || !choice}
          checked={!linked && Boolean(choice) && checked}
          onChange={onToggle}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <p className="font-semibold text-foreground">{row.name}</p>
        {contact ? <p className="text-xs text-muted">{contact}</p> : null}
      </td>
      <td className="px-3 py-2 align-top text-muted">{directDebitContent.panel.statuses[row.status] ?? row.status}</td>
      <td className="px-3 py-2 align-top">
        {linked ? (
          <span className="text-muted">{copy.alreadyLinked}</span>
        ) : (
          <div className="space-y-1">
            {choice ? (
              <p className="font-semibold text-foreground">
                {choice.customerName}
                {row.suggestion && row.suggestion.customerId === choice.customerId ? (
                  <span className="ml-1 text-xs font-normal text-muted">({copy.matchedBy[row.suggestion.matchedBy]})</span>
                ) : null}
              </p>
            ) : (
              <p className="text-xs text-warning">{row.ambiguous ? copy.ambiguous : copy.noMatch}</p>
            )}
            {picking ? (
              <CustomerSearch
                onPick={(picked) => {
                  onChoose(picked)
                  setPicking(false)
                }}
              />
            ) : (
              <button type="button" className="text-xs font-semibold text-primary underline underline-offset-2" onClick={() => setPicking(true)}>
                {copy.choose}
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

/** Type-ahead over customers (two letters or more); one entry per customer even with several properties. */
function CustomerSearch({ onPick }: { onPick: (choice: Choice) => void }) {
  const copy = directDebitContent.import
  const [search, setSearch] = useState('')
  const term = search.trim()
  const list = useCustomers({ search: term, page: 1, pageSize: 8 }, term.length >= 2)
  const options = useMemo(() => {
    const seen = new Map<string, Choice>()
    for (const c of list.data?.customers ?? []) {
      if (c.customerId && c.customerName && !seen.has(c.customerId)) seen.set(c.customerId, { customerId: c.customerId, customerName: c.customerName })
    }
    return [...seen.values()]
  }, [list.data])

  return (
    <div className="space-y-1">
      <Input
        inputSize="sm"
        autoFocus
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {term.length >= 2 && options.length ? (
        <ul className="rounded-lg border border-border bg-card">
          {options.map((option) => (
            <li key={option.customerId}>
              <button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-surface" onClick={() => onPick(option)}>
                {option.customerName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

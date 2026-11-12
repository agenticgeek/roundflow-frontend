import { useEffect, useState, type FormEvent } from 'react'
import type { EmailDomain } from '@/api/email-settings.api'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { emailSettingsContent } from '@/content/email-settings'
import { CopyButton } from '@/features/email/components/CopyButton'
import { DOMAIN_POLL_MS, useCheckDomain, useRemoveDomain, useStartDomain } from '@/features/email/hooks/useEmailSettings'
import { domainErrorMessage } from '@/features/email/lib/errors'
import { cn, fillCopy } from '@/lib/utils'

const copy = emailSettingsContent.domain
const buttonClass =
  'rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const STATUS_SYMBOL: Record<EmailDomain['status'], string> = { PENDING: '…', VERIFIED: '✓', FAILED: '✕', NONE: '–' }

/** The verification status as a chip: words plus a symbol, never colour alone. */
function StatusChip({ status }: { status: EmailDomain['status'] }) {
  const tone = status === 'VERIFIED' ? 'bg-success/10 text-success' : status === 'FAILED' ? 'bg-danger/10 text-danger' : 'bg-warning-surface text-warning-foreground'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', tone)}>
      <span aria-hidden="true">{STATUS_SYMBOL[status]}</span>
      {copy.statuses[status]}
    </span>
  )
}

/**
 * Own sending domain (tier 2): start verification, show the DKIM CNAME records with copy buttons, a
 * status chip, "Check now" (also every 30 s while PENDING) and remove. Edits are ADMIN only.
 */
export function DomainVerificationPanel({ domain, canEdit }: { domain: EmailDomain; canEdit: boolean }) {
  const { showToast } = useToast()
  const start = useStartDomain()
  const check = useCheckDomain()
  const remove = useRemoveDomain()
  const [name, setName] = useState('')
  const [localPart, setLocalPart] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const pending = domain.status === 'PENDING'
  const { mutate: pollDomain } = check

  useEffect(() => {
    if (!pending || !canEdit) return
    const timer = window.setInterval(() => pollDomain(), DOMAIN_POLL_MS)
    return () => window.clearInterval(timer)
  }, [pending, canEdit, pollDomain])

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      return true
    } catch (caught) {
      setError(domainErrorMessage(caught))
      return false
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = localPart.trim()
    await run(() => start.mutateAsync({ domain: name.trim(), ...(trimmed ? { localPart: trimmed } : {}) }))
  }

  async function confirmRemoval() {
    if (await run(() => remove.mutateAsync())) {
      setConfirmRemove(false)
      showToast(copy.removed)
    }
  }

  return (
    <section aria-labelledby="email-domain-heading" className="space-y-4 border-t border-border pt-5">
      <div>
        <h3 id="email-domain-heading" className="text-sm font-semibold text-foreground">
          {copy.heading}
        </h3>
        <p className="mt-1 text-sm text-muted">{copy.explainer}</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {domain.tier === 2 && domain.sendingAddress ? fillCopy(copy.tierOwn, { address: domain.sendingAddress }) : copy.tierShared}
        </p>
      </div>

      {domain.status === 'NONE' ? (
        canEdit ? (
          <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.domainLabel} labelWeight="medium">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="yourbusiness.co.uk" autoComplete="off" />
              <p className="mt-1 text-xs text-muted">{copy.domainHelp}</p>
            </Field>
            <Field label={copy.localPartLabel} labelWeight="medium">
              <Input value={localPart} onChange={(event) => setLocalPart(event.target.value)} placeholder="accounts" autoComplete="off" />
              <p className="mt-1 text-xs text-muted">{copy.localPartHelp}</p>
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={buttonClass} disabled={start.isPending || !name.trim()}>
                {start.isPending ? copy.starting : copy.start}
              </button>
            </div>
          </form>
        ) : null
      ) : (
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span className="font-semibold">{domain.domain}</span>
            <span className="sr-only">{copy.statusLabel}:</span>
            <StatusChip status={domain.status} />
          </p>
          <p className="text-sm text-muted">{copy.statusHints[domain.status]}</p>
          {domain.status !== 'VERIFIED' ? (
            <div className="overflow-x-auto" role="region" aria-label={copy.recordsCaption} tabIndex={0}>
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">{copy.recordsCaption}</caption>
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-medium">{copy.colType}</th>
                    <th scope="col" className="px-2 py-2 font-medium">{copy.colName}</th>
                    <th scope="col" className="px-2 py-2 font-medium">{copy.colValue}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {domain.records.map((record, index) => (
                    <tr key={record.name}>
                      <td className="px-2 py-2 align-top">{record.type}</td>
                      <td className="px-2 py-2 align-top">
                        <code className="break-all text-xs">{record.name}</code>
                        <div className="mt-1"><CopyButton text={record.name} label={fillCopy(copy.copyName, { n: index + 1 })} /></div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <code className="break-all text-xs">{record.value}</code>
                        <div className="mt-1"><CopyButton text={record.value} label={fillCopy(copy.copyValue, { n: index + 1 })} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonClass} disabled={check.isPending} onClick={() => void run(() => check.mutateAsync())}>
                {check.isPending ? copy.checking : copy.checkNow}
              </button>
              <button type="button" className={cn(buttonClass, 'text-danger')} onClick={() => setConfirmRemove(true)}>
                {copy.remove}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {error && !confirmRemove ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        title={copy.removeTitle}
        description={copy.removeBody}
        confirmLabel={copy.removeConfirm}
        pending={remove.isPending}
        error={confirmRemove ? error : null}
        onConfirm={() => void confirmRemoval()}
        onClose={() => {
          setConfirmRemove(false)
          setError(null)
        }}
      />
    </section>
  )
}

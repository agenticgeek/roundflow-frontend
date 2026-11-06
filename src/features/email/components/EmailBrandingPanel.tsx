import { useId, useState } from 'react'
import type { EmailDomain, EmailSettings, EmailSettingsPatch } from '@/api/email-settings.api'
import { AdminOnlyNote } from '@/components/settings/AdminOnlyNote'
import { Field, Input, Toggle } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { emailSettingsContent as copy } from '@/content/email-settings'
import { BrandColourField } from '@/features/email/components/BrandColourField'
import { DomainVerificationPanel } from '@/features/email/components/DomainVerificationPanel'
import { LogoField } from '@/features/email/components/LogoField'
import { useEmailSettings, useSendTestEmail, useUpdateEmailSettings } from '@/features/email/hooks/useEmailSettings'
import { emailSettingsErrorMessage } from '@/features/email/lib/errors'
import { normaliseHex } from '@/features/email/lib/colour'
import { useBusinessProfile } from '@/features/settings/hooks/useSettings'
import { useIsAdmin } from '@/hooks/use-is-admin'
import { errorMessage } from '@/lib/errors'
import { cn, fillCopy } from '@/lib/utils'

const cardClass = 'rounded-lg border border-border bg-card p-6 shadow-sm'
const buttonClass =
  'rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const NO_DOMAIN: EmailDomain = { domain: null, localPart: null, status: 'NONE', records: [], verifiedAt: null, tier: 1, sendingAddress: null }

type Draft = { senderName?: string; replyTo?: string; enabled?: boolean; brandColour?: string }

function statusLine(settings: EmailSettings): string {
  if (!settings.configured) return copy.status.notConfigured
  if (settings.paused) return copy.status.paused
  return settings.enabled ? copy.status.on : copy.status.off
}

/** Settings > Email and branding. Everyone office-side can read it; only an ADMIN can change it. */
export function EmailBrandingPanel() {
  const query = useEmailSettings()
  const profile = useBusinessProfile()

  if (query.isError) {
    return (
      <div role="alert" className={cn(cardClass, 'text-sm')}>
        <p className="font-semibold text-foreground">{copy.loadFailed}</p>
        <p className="mt-1 text-muted">{errorMessage(query.error)}</p>
        <button type="button" onClick={() => void query.refetch()} className={cn(buttonClass, 'mt-3')}>
          {copy.retry}
        </button>
      </div>
    )
  }
  if (!query.data) {
    return (
      <p role="status" className={cn(cardClass, 'text-sm text-muted')}>
        {copy.status.loading}
      </p>
    )
  }
  return <EmailBrandingForm settings={query.data} businessName={profile.data?.businessName ?? ''} />
}

function EmailBrandingForm({ settings, businessName }: { settings: EmailSettings; businessName: string }) {
  const isAdmin = useIsAdmin()
  const { showToast } = useToast()
  const update = useUpdateEmailSettings()
  const test = useSendTestEmail()
  const noteId = useId()
  const [draft, setDraft] = useState<Draft>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  const name = draft.senderName ?? settings.senderName ?? ''
  const reply = draft.replyTo ?? settings.replyTo ?? ''
  const enabled = draft.enabled ?? Boolean(settings.enabled)
  const colourText = draft.brandColour ?? settings.brandColour ?? ''
  const colour = normaliseHex(colourText)
  const colourInvalid = colourText.trim() !== '' && !colour

  const patch: EmailSettingsPatch = {}
  if (name.trim() !== (settings.senderName ?? '')) patch.emailSenderName = name.trim() || null
  if (reply.trim() !== (settings.replyTo ?? '')) patch.emailReplyTo = reply.trim() || null
  if (enabled !== Boolean(settings.enabled)) patch.emailEnabled = enabled
  if ((colour ?? '') !== (settings.brandColour ?? '').toUpperCase()) patch.brandColour = colour
  const changed = Object.keys(patch).length > 0
  const from = typeof settings.sender?.from === 'string' ? settings.sender.from : null
  const health = settings.health as { sampleSize?: number; delivered?: number; bounced?: number; complaints?: number } | undefined
  const readOnlyHint = isAdmin ? undefined : noteId

  async function save() {
    setFormError(null)
    try {
      await update.mutateAsync(patch)
      setDraft({})
      showToast(copy.saved)
    } catch (caught) {
      setFormError(emailSettingsErrorMessage(caught))
    }
  }

  async function resume() {
    setResumeError(null)
    try {
      await update.mutateAsync({ emailPaused: false })
      showToast(copy.status.resumed)
    } catch (caught) {
      setResumeError(emailSettingsErrorMessage(caught))
    }
  }

  async function sendTest() {
    setTestResult(null)
    try {
      const result = await test.mutateAsync()
      setTestResult({ ok: true, text: fillCopy(copy.test.sent, { from: result.from }) })
    } catch (caught) {
      setTestResult({ ok: false, text: emailSettingsErrorMessage(caught) })
    }
  }

  return (
    <article className={cn(cardClass, 'space-y-6')}>
      <div>
        <h2 className="text-base font-semibold text-foreground">{copy.heading}</h2>
        <p className="mt-0.5 text-sm text-muted">{copy.subheading}</p>
        {!isAdmin ? <AdminOnlyNote id={noteId} className="mt-3">{copy.adminOnlyNote}</AdminOnlyNote> : null}
      </div>

      <section aria-labelledby="email-status-heading" className="space-y-2">
        <h3 id="email-status-heading" className="text-sm font-semibold text-foreground">
          {copy.status.heading}
        </h3>
        <p className="text-sm font-medium text-foreground">{statusLine(settings)}</p>
        <p className="text-sm text-muted">
          {settings.dailyLimit
            ? fillCopy(copy.status.sentToday, { sent: settings.sentToday ?? 0, limit: settings.dailyLimit })
            : fillCopy(copy.status.sentTodayNoLimit, { sent: settings.sentToday ?? 0 })}
        </p>
        {health?.sampleSize ? (
          <p className="text-sm text-muted">
            {fillCopy(copy.status.health, {
              sample: health.sampleSize,
              delivered: health.delivered ?? 0,
              bounced: health.bounced ?? 0,
              complaints: health.complaints ?? 0,
            })}
          </p>
        ) : null}
        {settings.paused ? (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm">
            <p className="font-semibold text-danger">{copy.status.pausedBannerTitle}</p>
            <p className="mt-1 text-foreground">
              {settings.pausedReason ? fillCopy(copy.status.pausedCause, { reason: settings.pausedReason }) : copy.status.pausedNoReason}
            </p>
            {resumeError ? <p className="mt-1 text-danger">{resumeError}</p> : null}
            {isAdmin ? (
              <button type="button" className={cn(buttonClass, 'mt-3')} disabled={update.isPending} onClick={() => void resume()}>
                {update.isPending ? copy.status.resuming : copy.status.resume}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="email-sender-heading" className="space-y-4">
        <h3 id="email-sender-heading" className="text-sm font-semibold text-foreground">
          {copy.sender.heading}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={copy.sender.senderName} labelWeight="medium">
            <Input
              value={name}
              onChange={(event) => setDraft({ ...draft, senderName: event.target.value })}
              readOnly={!isAdmin}
              maxLength={70}
              aria-describedby={readOnlyHint}
            />
            <p className="mt-1 text-xs text-muted">{copy.sender.senderNameHelp}</p>
          </Field>
          <Field label={copy.sender.replyTo} labelWeight="medium">
            <Input
              type="email"
              value={reply}
              onChange={(event) => setDraft({ ...draft, replyTo: event.target.value })}
              readOnly={!isAdmin}
              aria-describedby={readOnlyHint}
            />
            <p className="mt-1 text-xs text-muted">{copy.sender.replyToHelp}</p>
          </Field>
        </div>
        <div className="flex items-start gap-3">
          <Toggle checked={enabled} onChange={(value) => setDraft({ ...draft, enabled: value })} ariaLabel={copy.sender.enabled} disabled={!isAdmin} />
          <div>
            <p className="text-sm font-medium text-foreground">{copy.sender.enabled}</p>
            <p className="text-xs text-muted">{copy.sender.enabledHelp}</p>
          </div>
        </div>
        {from ? <p className="text-sm text-muted">{fillCopy(copy.sender.preview, { from })}</p> : null}

        <BrandColourField
          value={colourText}
          onChange={(value) => setDraft({ ...draft, brandColour: value })}
          serverCheck={settings.warning ?? settings.brandColourCheck ?? null}
          disabled={!isAdmin}
        />

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={cn(buttonClass, 'bg-primary text-primary-foreground hover:bg-primary')}
              disabled={!changed || colourInvalid || update.isPending}
              onClick={() => void save()}
            >
              {update.isPending ? copy.saving : copy.save}
            </button>
            <button type="button" className={buttonClass} disabled={test.isPending} onClick={() => void sendTest()}>
              {test.isPending ? copy.test.sending : copy.test.action}
            </button>
          </div>
        ) : null}
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        {testResult ? (
          <p role={testResult.ok ? 'status' : 'alert'} className={cn('text-sm', testResult.ok ? 'text-success' : 'text-danger')}>
            {testResult.text}
          </p>
        ) : null}
      </section>

      <LogoField settings={settings} businessName={businessName} canEdit={isAdmin} />
      <DomainVerificationPanel domain={settings.domain ?? NO_DOMAIN} canEdit={isAdmin} />
    </article>
  )
}

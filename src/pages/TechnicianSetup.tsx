import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AcceptInviteSkeleton } from '@/components/auth/AcceptInviteSkeleton'
import { InviteSetupLayout } from '@/components/auth/InviteSetupLayout'
import { Field, FieldError, Input, PrimaryButton } from '@/components/ui'
import { ROUTES } from '@/config/routes'
import { technicianSetupContent as copy } from '@/content/technician-setup'
import { useAcceptInvite, useInvitePreview } from '@/features/invites/hooks/useInvites'
import { useAuth } from '@/lib/auth'
import { isInvitePreviewEnabled, technicianAppStoreLinks } from '@/lib/env'
import { ApiError, errorMessage } from '@/lib/errors'
import { stashPendingInvite } from '@/lib/pending-invite'
import { supabase } from '@/lib/supabase'
import { cn, fillCopy } from '@/lib/utils'

type Step = 'welcome' | 'credentials' | 'done' | 'thanks'

/** Problems with the email link itself (the invite may still be fine). */
type LinkState = 'ok' | 'expired' | 'needs-link' | 'link-sent' | 'confirm-email'

const PASSWORD_RULES = [
  { id: 'length', test: (value: string) => value.length >= 8 },
  { id: 'letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { id: 'number', test: (value: string) => /\d/.test(value) },
] as const

/**
 * Sign the person in from their email link before anything else. Supabase's admin invite
 * link returns `#access_token…&refresh_token…` (implicit), a fresh sign-in link returns
 * `?code=` (PKCE), and an expired link returns `#error=…`. The client doesn't read the URL
 * itself (`detectSessionInUrl: false`), so it's done here, then the URL is tidied.
 */
async function sessionFromLink(): Promise<'ok' | 'expired' | 'none'> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const cleanUrl = () => {
    query.delete('code')
    const search = query.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}`)
  }

  if (hash.get('error') || hash.get('error_code')) {
    cleanUrl()
    return 'expired'
  }
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    cleanUrl()
    return error ? 'expired' : 'ok'
  }
  const code = query.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    cleanUrl()
    return error ? 'expired' : 'ok'
  }
  return 'none'
}

/**
 * Preview (see `isInvitePreviewEnabled`): `/app-invite?token=preview` shows the flow with a sample
 * invite and no API calls. Add `&view=` to open a screen directly: credentials, done, thanks, used,
 * invalid, link-expired, needs-link, link-sent, confirm-email, wrong-account.
 */
const PREVIEW_TOKEN = 'preview'
const PREVIEW_INVITE = {
  email: 'sarah.johnson@supremeexteriorclean.co.uk',
  role: 'TECHNICIAN',
  tenantId: 'preview',
  expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

function inviteProblem(error: unknown): 'used' | 'invalid' {
  if (error instanceof ApiError && error.status === 410) return 'used'
  return 'invalid'
}

/**
 * `/app-invite?token=…` — where a technician's invite email lands. Three steps:
 * welcome → create login (name + password) → all set. The invite is accepted only after the
 * password is saved, so a technician can always sign in again later.
 */
export default function TechnicianSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const previewMode = isInvitePreviewEnabled() && token === PREVIEW_TOKEN
  const previewView = previewMode ? (searchParams.get('view') ?? '') : ''
  const { session, loading: authLoading } = useAuth()
  const previewQuery = useInvitePreview(token, Boolean(token) && !previewMode)
  const acceptInvite = useAcceptInvite()
  const invite = previewMode
    ? previewView === 'used' || previewView === 'invalid'
      ? undefined
      : PREVIEW_INVITE
    : previewQuery.data

  const [linkChecked, setLinkChecked] = useState(previewMode)
  const [linkState, setLinkState] = useState<LinkState>(() =>
    previewView === 'link-expired'
      ? 'expired'
      : previewView === 'needs-link' || previewView === 'link-sent' || previewView === 'confirm-email'
        ? previewView
        : 'ok',
  )
  const [step, setStep] = useState<Step>(() =>
    previewView === 'credentials' || previewView === 'done' || previewView === 'thanks' ? previewView : 'welcome',
  )
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (previewMode) return
    let active = true
    void sessionFromLink().then((result) => {
      if (!active) return
      if (result === 'expired') setLinkState('expired')
      setLinkChecked(true)
    })
    return () => {
      active = false
    }
  }, [previewMode])

  // Suggest a name from the email (sarah.johnson@… → "sarah johnson") until they type one.
  useEffect(() => {
    if (!invite?.email || fullName) return
    const local = invite.email.split('@')[0] ?? ''
    setFullName(local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
  }, [fullName, invite?.email])

  const sessionEmail = session?.user.email?.toLowerCase() ?? null
  const inviteEmail = invite?.email.toLowerCase() ?? null
  const wrongAccount =
    previewView === 'wrong-account' || Boolean(sessionEmail && inviteEmail && sessionEmail !== inviteEmail)
  const rulesPassed = PASSWORD_RULES.map((rule) => rule.test(password))

  async function sendFreshLink() {
    if (!invite || sendingLink) return
    if (previewMode) {
      setLinkState('link-sent')
      return
    }
    setSendingLink(true)
    setFormError(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: invite.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}${ROUTES.technicianSetup}?token=${encodeURIComponent(token)}`,
        },
      })
      if (error) throw error
      setLinkState('link-sent')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSendingLink(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setSigningOut(false)
    }
  }

  async function accept(accessToken: string, name: string) {
    await acceptInvite.mutateAsync({ token, input: { name }, accessToken })
    setStep('done')
  }

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!invite || submitting) return

    const name = fullName.trim()
    const next: typeof fieldErrors = {}
    if (!name) next.name = copy.credentials.errors.nameRequired
    if (!rulesPassed.every(Boolean)) next.password = copy.credentials.errors.passwordWeak
    else if (password !== confirm) next.confirm = copy.credentials.errors.mismatch
    setFieldErrors(next)
    setFormError(null)
    if (next.name || next.password || next.confirm) return

    if (previewMode) {
      setStep('done')
      return
    }

    setSubmitting(true)
    try {
      stashPendingInvite(token, name)

      // Signed in from the invite email: save the password on that account, then join.
      if (session?.access_token) {
        const { error } = await supabase.auth.updateUser({ password, data: { full_name: name } })
        if (error) throw error
        await accept(session.access_token, name)
        return
      }

      // No session (opened without the email link): try creating the account.
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: { full_name: name, invite_token: token },
          emailRedirectTo: `${window.location.origin}${ROUTES.technicianSetup}?token=${encodeURIComponent(token)}`,
        },
      })
      const alreadyExists =
        (error && /already registered|already been registered/i.test(error.message)) ||
        (Boolean(data?.user) && (data?.user?.identities?.length ?? 0) === 0)
      if (alreadyExists) {
        // The invite email created the account — it needs that email's link to sign in.
        setLinkState('needs-link')
        return
      }
      if (error) throw error
      if (data.session?.access_token) {
        await accept(data.session.access_token, name)
        return
      }
      setLinkState('confirm-email')
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setFormError(copy.states.used.title)
      } else {
        setFormError(errorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ---- states before the flow -------------------------------------------------

  if (!token) {
    return <SetupState title={copy.states.missingToken.title} body={copy.states.missingToken.body} />
  }

  if (!previewMode && (!linkChecked || previewQuery.isPending || authLoading)) {
    return (
      <InviteSetupLayout>
        <AcceptInviteSkeleton />
        <p className="sr-only" role="status">{copy.states.loading}</p>
      </InviteSetupLayout>
    )
  }

  if (previewQuery.isError || !invite) {
    // Already accepted or expired. Someone who finished setup can just sign in.
    const problem = previewMode ? (previewView === 'used' ? 'used' : 'invalid') : inviteProblem(previewQuery.error)
    if (step === 'done' || step === 'thanks') return null
    return problem === 'used' ? (
      <SetupState title={copy.states.used.title} body={copy.states.used.body} actionHref={ROUTES.login} actionLabel={copy.states.used.action} />
    ) : (
      <SetupState title={copy.states.invalid.title} body={copy.states.invalid.body} />
    )
  }

  if (wrongAccount && step !== 'done' && step !== 'thanks') {
    return (
      <SetupState
        title={copy.states.wrongAccount.title}
        body={fillCopy(copy.states.wrongAccount.body, {
          current: previewMode ? 'mark@gmail.com' : (session?.user.email ?? ''),
          invited: invite.email,
        })}
      >
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {signingOut ? copy.states.wrongAccount.signingOut : copy.states.wrongAccount.action}
        </button>
      </SetupState>
    )
  }

  if (linkState === 'link-sent' || linkState === 'confirm-email') {
    const state = linkState === 'link-sent' ? copy.states.linkSent : copy.states.confirmEmail
    return <SetupState icon="mail" title={state.title} body={fillCopy(state.body, { email: invite.email })} actionHref={ROUTES.login} actionLabel={copy.states.backToLogin} />
  }

  if ((linkState === 'expired' || linkState === 'needs-link') && (!session || previewMode)) {
    const state = linkState === 'expired' ? copy.states.linkExpired : copy.states.needsLink
    return (
      <SetupState icon="mail" title={state.title} body={fillCopy(state.body, { email: invite.email })}>
        <button
          type="button"
          onClick={() => void sendFreshLink()}
          disabled={sendingLink}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sendingLink ? copy.states.sendingLink : copy.states.sendLink}
        </button>
        {formError ? <FieldError message={formError} /> : null}
      </SetupState>
    )
  }

  // ---- the three steps --------------------------------------------------------

  const roleLabel = copy.roles[invite.role] ?? invite.role

  return (
    <InviteSetupLayout>
      <div className="space-y-7">
        {step === 'thanks' ? null : <StepDots current={step} />}

        {step === 'welcome' ? (
          <div key="welcome" className="animate-wizard-step space-y-6">
            <header className="space-y-3">
              <div className="flex items-center gap-3">
                <InviteBadge />
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {copy.welcome.eyebrow}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">{copy.welcome.title}</h1>
              <p className="text-sm leading-relaxed text-muted">{copy.welcome.body}</p>
            </header>

            <dl className="divide-y divide-border rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted">{copy.welcome.invitedAs}</dt>
                <dd className="font-semibold text-foreground">{roleLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="shrink-0 text-muted">{copy.welcome.email}</dt>
                <dd className="truncate font-semibold text-foreground">{invite.email}</dd>
              </div>
            </dl>

            <ul className="space-y-2.5">
              {copy.welcome.points.map((point, index) => (
                <li
                  key={point}
                  className="flex animate-reveal-item items-start gap-3 text-sm text-foreground"
                  style={{ animationDelay: `${180 + index * 90}ms` }}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <CheckIcon />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <PrimaryButton type="button" className="group relative w-full overflow-hidden" onClick={() => setStep('credentials')}>
                <ShimmerSweep />
                <span className="relative inline-flex items-center gap-2">
                  {copy.welcome.start}
                  <ArrowIcon />
                </span>
              </PrimaryButton>
              <p className="text-center text-xs text-muted">
                {fillCopy(copy.welcome.expires, {
                  date: new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
                })}
              </p>
            </div>
          </div>
        ) : null}

        {step === 'credentials' ? (
          <form key="credentials" className="animate-wizard-step space-y-5" onSubmit={(event) => void handleCredentials(event)} noValidate>
            <header className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.credentials.title}</h1>
              <p className="text-sm text-muted">{copy.credentials.body}</p>
            </header>

            <Field label={copy.credentials.email.label} size="sm" labelWeight="medium">
              <Input id="tech-setup-email" type="email" inputSize="sm" value={invite.email} readOnly className="bg-surface text-muted" />
            </Field>

            <Field label={copy.credentials.name.label} required size="sm" labelWeight="medium" error={fieldErrors.name}>
              <Input
                id="tech-setup-name"
                inputSize="sm"
                value={fullName}
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(event) => {
                  setFullName(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder={copy.credentials.name.placeholder}
                autoComplete="name"
                disabled={submitting}
              />
              {fieldErrors.name ? null : <p className="mt-1.5 text-xs text-muted">{copy.credentials.name.hint}</p>}
            </Field>

            <Field label={copy.credentials.password.label} required size="sm" labelWeight="medium" error={fieldErrors.password}>
              <Input
                type="password"
                id="tech-setup-password"
                inputSize="sm"
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                placeholder={copy.credentials.password.placeholder}
                autoComplete="new-password"
                disabled={submitting}
              />
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule, index) => (
                  <li
                    key={rule.id}
                    className={cn(
                      'flex items-center gap-1.5 text-xs transition-colors',
                      rulesPassed[index] ? 'text-success' : 'text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-3.5 w-3.5 items-center justify-center rounded-full border',
                        rulesPassed[index] ? 'border-success bg-success text-white' : 'border-border',
                      )}
                    >
                      {rulesPassed[index] ? <CheckIcon small /> : null}
                    </span>
                    {copy.credentials.rules[rule.id]}
                  </li>
                ))}
              </ul>
            </Field>

            <Field label={copy.credentials.confirm.label} required size="sm" labelWeight="medium" error={fieldErrors.confirm}>
              <Input
                type="password"
                id="tech-setup-confirm"
                inputSize="sm"
                value={confirm}
                aria-invalid={Boolean(fieldErrors.confirm)}
                onChange={(event) => {
                  setConfirm(event.target.value)
                  setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
                }}
                placeholder={copy.credentials.confirm.placeholder}
                autoComplete="new-password"
                disabled={submitting}
              />
            </Field>

            {formError ? <FieldError message={formError} /> : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                disabled={submitting}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60"
              >
                {copy.credentials.back}
              </button>
              <PrimaryButton type="submit" className="group relative flex-1 overflow-hidden" disabled={submitting || acceptInvite.isPending}>
                {submitting || acceptInvite.isPending ? null : <ShimmerSweep />}
                <span className="relative inline-flex items-center gap-2">
                  {submitting || acceptInvite.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" />
                  ) : null}
                  {submitting || acceptInvite.isPending ? copy.credentials.submitting : copy.credentials.submit}
                </span>
              </PrimaryButton>
            </div>
          </form>
        ) : null}

        {step === 'done' ? (
          <div key="done" className="animate-wizard-step space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <SuccessMark />
              <h1 className="animate-reveal-item text-2xl font-semibold tracking-tight text-foreground [animation-delay:450ms]">
                {fillCopy(copy.done.title, { name: firstName(fullName) })}
              </h1>
              <p className="animate-reveal-item text-sm text-balance text-muted [animation-delay:540ms]">{copy.done.body}</p>
            </div>

            <NextSteps email={invite.email} />

            <button
              type="button"
              className="w-full animate-reveal-item rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors [animation-delay:1000ms] hover:bg-surface"
              onClick={() => setStep('thanks')}
            >
              {copy.done.continue}
            </button>
          </div>
        ) : null}

        {step === 'thanks' ? (
          <div key="thanks" className="animate-wizard-step space-y-7 py-2 text-center">
            <ThanksEmblem />

            <div className="space-y-3">
              <p className="animate-reveal-item text-xs font-semibold tracking-wide text-primary uppercase [animation-delay:350ms]">
                {copy.thanks.eyebrow}
              </p>
              <h1 className="animate-reveal-item text-3xl font-semibold tracking-tight text-balance text-foreground [animation-delay:430ms]">
                {fillCopy(copy.thanks.title, { name: firstName(fullName) })}
              </h1>
              <p className="mx-auto max-w-sm animate-reveal-item text-sm leading-relaxed text-balance text-muted [animation-delay:510ms]">
                {copy.thanks.body}
              </p>
            </div>

            <ul className="flex animate-reveal-item flex-wrap justify-center gap-2 [animation-delay:600ms]">
              {copy.thanks.highlights.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="animate-reveal-item space-y-4 [animation-delay:700ms]">
              <p className="text-sm font-medium text-foreground">{copy.thanks.signoff}</p>
              <button
                type="button"
                onClick={() => (previewMode ? setStep('welcome') : navigate(ROUTES.technicianApp, { replace: true }))}
                className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:underline"
              >
                {previewMode ? copy.thanks.restart : copy.thanks.leave}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </InviteSetupLayout>
  )
}

function StepDots({ current }: { current: Step }) {
  const order: Step[] = ['welcome', 'credentials', 'done']
  const index = order.indexOf(current)
  const last = copy.steps.length - 1
  return (
    <div className="relative">
      {/* Track sits behind the nodes, running between the first and last node centres. */}
      <div className="absolute top-3.5 right-[16.67%] left-[16.67%] h-0.5 rounded-full bg-border" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${(index / last) * 100}%` }}
        />
      </div>
      <ol className="relative grid grid-cols-3" aria-label="Setup progress">
        {copy.steps.map((label, position) => {
          const complete = position < index
          const active = position === index
          return (
            <li key={label} className="flex flex-col items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span className="relative flex h-7 w-7 items-center justify-center">
                {active ? (
                  <span className="absolute inset-0 animate-ring-out rounded-full bg-primary/30 motion-reduce:hidden" aria-hidden="true" />
                ) : null}
                <span
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-500',
                    complete && 'border-primary bg-primary text-primary-foreground',
                    active && 'scale-110 border-primary bg-card text-primary shadow-md shadow-primary/25',
                    !complete && !active && 'border-border bg-card text-muted',
                  )}
                >
                  {complete ? (
                    <span key="done" className="animate-pop-in">
                      <CheckIcon />
                    </span>
                  ) : (
                    position + 1
                  )}
                </span>
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium transition-colors duration-300',
                  active ? 'text-foreground' : complete ? 'text-primary' : 'text-muted',
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Envelope with an orbiting dot — echoes the ring in the RoundFlow mark. */
function InviteBadge() {
  return (
    <span className="relative flex h-11 w-11 shrink-0 animate-pop-in items-center justify-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border border-dashed border-primary/40" />
      <span className="absolute inset-0 animate-orbit motion-reduce:animate-none">
        <span className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-sm shadow-primary/50" />
      </span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="3.5" y="6" width="17" height="12" rx="2" />
          <path d="m4.5 7.5 7.5 5.5 7.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  )
}

/** A soft highlight that sweeps across a primary button now and then. */
function ShimmerSweep() {
  return (
    <span
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent motion-reduce:hidden"
      aria-hidden="true"
    />
  )
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
      aria-hidden="true"
    >
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Download → sign in → password, with store buttons on the first step. */
function NextSteps({ email }: { email: string }) {
  const links = technicianAppStoreLinks()
  const live = Boolean(links.ios || links.android)
  const steps = [
    { ...copy.done.steps.download, extra: <StoreButtons ios={links.ios} android={links.android} /> },
    { title: copy.done.steps.signIn.title, body: fillCopy(copy.done.steps.signIn.body, { email }), extra: null },
    { ...copy.done.steps.password, extra: null },
  ]

  return (
    <section className="space-y-3">
      <h2 className="animate-reveal-item text-xs font-semibold tracking-wide text-muted uppercase [animation-delay:620ms]">
        {copy.done.nextTitle}
      </h2>
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative flex animate-reveal-item gap-3.5 pb-5 last:pb-0"
            style={{ animationDelay: `${680 + index * 110}ms` }}
          >
            {index < steps.length - 1 ? (
              <span className="absolute top-8 bottom-1 left-[13px] w-0.5 rounded-full bg-primary/20" aria-hidden="true" />
            ) : null}
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{step.body}</p>
              {step.extra ? <div className="mt-3">{step.extra}</div> : null}
            </div>
          </li>
        ))}
      </ol>
      {live ? null : (
        <p className="animate-reveal-item rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted [animation-delay:1000ms]">
          {copy.done.stores.notLive}
        </p>
      )}
    </section>
  )
}

function StoreButtons({ ios, android }: { ios?: string; android?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StoreButton href={ios} overline={copy.done.stores.ios.overline} name={copy.done.stores.ios.name} icon={<AppleIcon />} />
      <StoreButton
        href={android}
        overline={copy.done.stores.android.overline}
        name={copy.done.stores.android.name}
        icon={<PlayIcon />}
      />
    </div>
  )
}

function StoreButton({ href, overline, name, icon }: { href?: string; overline: string; name: string; icon: ReactNode }) {
  const body = (
    <>
      <span className="h-6 w-6 shrink-0">{icon}</span>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="text-[10px] opacity-80">{href ? overline : copy.done.stores.comingSoon}</span>
        <span className="truncate text-sm font-semibold">{name}</span>
      </span>
    </>
  )
  const base = 'flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-background'

  if (!href) {
    return (
      <span className={cn(base, 'cursor-not-allowed opacity-45')} aria-disabled="true">
        {body}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/20 active:scale-[0.98]')}
    >
      {body}
    </a>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21Z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
      <path d="M4.6 2.9 13.7 12l-9.1 9.1c-.36-.2-.6-.6-.6-1.06V3.96c0-.46.24-.86.6-1.06Zm10.2 10.2 2.3 2.3-10.4 5.9 8.1-8.2Zm3.7-4.3 2.4 1.37c.78.45.78 1.21 0 1.66l-2.4 1.37-2.5-2.2 2.5-2.2Zm-12.8-5.6 10.4 5.9-2.3 2.3-8.1-8.2Z" />
    </svg>
  )
}

/** Twinkle positions around the thank-you emblem, as % of its box. */
const SPARKLES = [
  { top: '4%', left: '14%', delay: '0.5s', size: 'h-3 w-3' },
  { top: '10%', left: '84%', delay: '0.9s', size: 'h-2.5 w-2.5' },
  { top: '78%', left: '6%', delay: '1.3s', size: 'h-2 w-2' },
  { top: '84%', left: '88%', delay: '0.7s', size: 'h-3 w-3' },
  { top: '44%', left: '-4%', delay: '1.6s', size: 'h-2 w-2' },
  { top: '40%', left: '100%', delay: '1.1s', size: 'h-2 w-2' },
]

/** Completed badge inside the RoundFlow orbit ring, floating, with sparkles twinkling around it. */
function ThanksEmblem() {
  return (
    <div className="relative mx-auto h-32 w-32" aria-hidden="true">
      <span className="absolute inset-0 animate-ring-out rounded-full bg-primary/20 [animation-delay:400ms] motion-reduce:hidden" />
      <span className="absolute inset-0 animate-ring-out rounded-full bg-primary/15 [animation-delay:1600ms] motion-reduce:hidden" />
      {SPARKLES.map((sparkle) => (
        <svg
          key={sparkle.left + sparkle.top}
          viewBox="0 0 16 16"
          className={cn('absolute animate-twinkle fill-primary motion-reduce:animate-none', sparkle.size)}
          style={{ top: sparkle.top, left: sparkle.left, animationDelay: sparkle.delay }}
        >
          <path d="M8 0c.4 3.9 2.1 5.6 8 8-5.9 2.4-7.6 4.1-8 8-.4-3.9-2.1-5.6-8-8 5.9-2.4 7.6-4.1 8-8Z" />
        </svg>
      ))}
      <div className="absolute inset-3 animate-pop-in">
        <div className="h-full w-full animate-float motion-reduce:animate-none">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/35" />
          <span className="absolute inset-0 animate-orbit motion-reduce:animate-none">
            <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-md shadow-primary/50" />
          </span>
          <span className="absolute inset-3 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-xl shadow-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12"
            >
              <path
                className="fill-primary-foreground/15"
                d="M21 12c0 1.27-.63 2.39-1.59 3.07a3.75 3.75 0 0 1-1.04 3.3 3.75 3.75 0 0 1-3.3 1.04A3.75 3.75 0 0 1 12 21c-1.27 0-2.39-.63-3.07-1.59a3.75 3.75 0 0 1-3.3-1.04 3.75 3.75 0 0 1-1.04-3.3A3.75 3.75 0 0 1 3 12c0-1.27.63-2.39 1.59-3.07a3.75 3.75 0 0 1 1.04-3.3 3.75 3.75 0 0 1 3.3-1.04A3.75 3.75 0 0 1 12 3c1.27 0 2.39.63 3.07 1.59a3.75 3.75 0 0 1 3.3 1.04 3.75 3.75 0 0 1 1.04 3.3A3.75 3.75 0 0 1 21 12Z"
              />
              <path
                d="m8.75 12.25 2.25 2.25 4.25-5"
                strokeWidth="2.2"
                pathLength={1}
                strokeDasharray="1"
                className="animate-draw [animation-delay:650ms]"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

/** Burst directions for the confetti around the success mark. */
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const distance = 54 + (i % 3) * 12
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    tone: ['bg-primary', 'bg-success', 'bg-warning', 'bg-primary/60'][i % 4],
    size: i % 2 === 0 ? 'h-2 w-2' : 'h-1.5 w-1.5',
    round: i % 3 === 0 ? 'rounded-sm' : 'rounded-full',
  }
})

/** Circle and tick draw themselves, rings ripple out and confetti bursts. */
function SuccessMark() {
  return (
    <span className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
      <span className="absolute inset-0 animate-ring-out rounded-full bg-success/25 [animation-delay:500ms] motion-reduce:hidden" />
      <span className="absolute inset-0 animate-ring-out rounded-full bg-success/20 [animation-delay:1300ms] motion-reduce:hidden" />
      {BURST.map((piece, i) => (
        <span
          key={i}
          className={cn('absolute top-1/2 left-1/2 -mt-1 -ml-1 animate-burst opacity-0 motion-reduce:hidden', piece.tone, piece.size, piece.round)}
          style={
            {
              '--burst-x': `${piece.x}px`,
              '--burst-y': `${piece.y}px`,
              animationDelay: `${420 + (i % 4) * 30}ms`,
            } as CSSProperties
          }
        />
      ))}
      <span className="relative flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-success/10">
        <svg viewBox="0 0 48 48" fill="none" className="h-14 w-14 text-success">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="2.5"
            pathLength={1}
            strokeDasharray="1"
            className="origin-center -rotate-90 animate-draw [transform-box:fill-box]"
          />
          <path
            d="m15 24.5 6 6L33.5 18"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            className="animate-draw [animation-delay:380ms]"
          />
        </svg>
      </span>
    </span>
  )
}

function CheckIcon({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SetupState({
  title,
  body,
  icon = 'alert',
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  body: string
  icon?: 'alert' | 'mail'
  actionHref?: string
  actionLabel?: string
  children?: ReactNode
}) {
  return (
    <InviteSetupLayout>
      <div className="animate-wizard-step space-y-5 text-center">
        <span
          className={cn(
            'mx-auto flex h-14 w-14 animate-pop-in items-center justify-center rounded-2xl',
            icon === 'mail' ? 'bg-primary/10 text-primary' : 'bg-warning-surface text-warning-foreground',
          )}
        >
          {icon === 'mail' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7" aria-hidden="true">
              <rect x="3" y="5.5" width="18" height="13" rx="2" />
              <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7" aria-hidden="true">
              <path d="M12 3.5 2.5 20h19L12 3.5Z" strokeLinejoin="round" />
              <path d="M12 10v4.5M12 17.5v.01" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">{title}</h1>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
        {children ? <div className="space-y-3">{children}</div> : null}
        {actionHref && actionLabel ? (
          <Link
            to={actionHref}
            className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </InviteSetupLayout>
  )
}

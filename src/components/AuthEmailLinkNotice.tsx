import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { FieldError, PrimaryButton } from '@/components/ui'

interface AuthEmailLinkNoticeProps {
  title: string
  subtitle: string
  email: string
  actionLabel: string
  resendLabel: string
  loading: boolean
  error: string | null
  sentMessage: string | null
  onResend: () => void
}

/** Confirmation screen shown after auth email-link actions. */
export function AuthEmailLinkNotice({
  title,
  subtitle,
  email,
  actionLabel,
  resendLabel,
  loading,
  error,
  sentMessage,
  onResend,
}: AuthEmailLinkNoticeProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-surface text-primary">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2h9A2.5 2.5 0 0 1 17 4.5v11a.5.5 0 0 1-.8.4L10 11.25 3.8 15.9a.5.5 0 0 1-.8-.4v-11Z" />
        </svg>
      </div>

      <h2 className="mt-6 text-[32px] font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-[15px] text-muted">
        {subtitle.replace('{email}', email)}
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
        <span className="font-semibold">Sent to:</span> {email}
      </div>

      <div className="mt-8 space-y-3">
        <PrimaryButton type="button" loading={loading} onClick={onResend}>
          {loading ? 'Sending…' : resendLabel}
        </PrimaryButton>
        {error ? <FieldError message={error} /> : null}
        {sentMessage ? (
          <p className="animate-fade-in text-sm text-success">{sentMessage}</p>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          to={ROUTES.login}
          className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-muted"
        >
          {actionLabel}
        </Link>
      </p>
    </div>
  )
}

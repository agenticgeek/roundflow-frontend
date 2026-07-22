import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { AuthEmailLinkNotice } from '@/components/AuthEmailLinkNotice'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { authContent } from '@/content/auth'
import { Field, Input, PrimaryButton } from '@/components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function sendResetLink() {
    setResendMessage(null)
    setLoading(true)

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
      })
    } catch {
      // Keep the response indistinguishable from a successful request.
    } finally {
      // Always show the same result so this screen cannot be used to discover accounts.
      setSent(true)
      if (sent) setResendMessage(authContent.resetMagicLink.sent)
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendResetLink()
  }

  return (
    <AuthLayout>
      {sent ? (
        <AuthEmailLinkNotice
          title={authContent.resetMagicLink.title}
          subtitle={authContent.resetMagicLink.subtitle}
          email={email}
          actionLabel={authContent.resetMagicLink.action}
          resendLabel={authContent.resetMagicLink.resend}
          loading={loading}
          error={null}
          sentMessage={resendMessage}
          onResend={() => {
            void sendResetLink()
          }}
        />
      ) : (
        <>
      <Link to={ROUTES.login} className="text-[15px] text-muted transition-colors hover:text-foreground">
        &larr; Back to log in
      </Link>

      <h2 className="mt-6 text-[32px] font-semibold tracking-tight text-foreground">
        {authContent.forgotPassword.title}
      </h2>
      <p className="mt-2 max-w-xs text-[15px] text-muted">{authContent.forgotPassword.subtitle}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Work email">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <div>
          <PrimaryButton loading={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </PrimaryButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Didn't receive an email? Check your spam folder or{' '}
        <button
          type="button"
          onClick={sendResetLink}
          disabled={loading || !email}
          className="font-medium text-foreground underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          resend
        </button>
      </p>
        </>
      )}
    </AuthLayout>
  )
}

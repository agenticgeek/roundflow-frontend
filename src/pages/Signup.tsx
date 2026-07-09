import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { AuthEmailLinkNotice } from '@/components/AuthEmailLinkNotice'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { authContent } from '@/content/auth'
import { site } from '@/content/site'
import {
  AuthTabs,
  Field,
  FieldError,
  GoogleButton,
  OrDivider,
  PrimaryButton,
  Input,
} from '@/components/ui'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function sendSignupLink(showMessage = true) {
    setLoading(true)
    setError(null)
    setResendMessage(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, company_name: companyName },
          emailRedirectTo: `${window.location.origin}${ROUTES.setupWizard}`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return false
      }

      if (showMessage) setResendMessage(authContent.signupMagicLink.sent)
      return true
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setConfirmError(null)

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    const sent = await sendSignupLink(false)
    if (sent) setMagicLinkSent(true)
  }

  async function handleGoogle() {
    setGoogleError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${ROUTES.dashboard}` },
    })
    if (oauthError) setGoogleError(oauthError.message)
  }

  return (
    <AuthLayout>
      {magicLinkSent ? (
        <AuthEmailLinkNotice
          title={authContent.signupMagicLink.title}
          subtitle={authContent.signupMagicLink.subtitle}
          email={email}
          actionLabel={authContent.signupMagicLink.action}
          resendLabel={authContent.signupMagicLink.resend}
          loading={loading}
          error={error}
          sentMessage={resendMessage}
          onResend={() => {
            void sendSignupLink()
          }}
        />
      ) : (
        <>
      <h2 className="text-[32px] font-semibold tracking-tight text-foreground">{authContent.signup.title}</h2>
      <p className="mt-2 text-[15px] text-muted">{authContent.signup.subtitle}</p>

      <div className="mt-8">
        <AuthTabs active="signup" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Full name">
          <Input
            type="text"
            required
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>

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

        <Field label="Company name">
          <Input
            type="text"
            autoComplete="organization"
            placeholder="Your business name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirm Password" error={confirmError}>
          <Input
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <p className="text-sm text-muted">
          By signing up you agree to our{' '}
          <a
            href={site.legal.termsHref}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Terms
          </a>{' '}
          &{' '}
          <a
            href={site.legal.privacyHref}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Privacy Policy
          </a>
        </p>

        <div className="pt-1">
          <PrimaryButton loading={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </PrimaryButton>
          {error ? <FieldError message={error} /> : null}
        </div>
      </form>

      <div className="mt-6 space-y-6">
        <OrDivider />
        <div>
          <GoogleButton onClick={handleGoogle} />
          {googleError ? <FieldError message={googleError} /> : null}
        </div>
      </div>

      <p className="mt-8 text-center text-[15px] text-muted">
        Already have an account?{' '}
        <Link
          to={ROUTES.login}
          className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-muted"
        >
          Log in
        </Link>
      </p>
        </>
      )}
    </AuthLayout>
  )
}

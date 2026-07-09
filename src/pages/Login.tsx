import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { getPostAuthRoute } from '@/lib/setup-storage'
import { authContent } from '@/content/auth'
import {
  AuthTabs,
  Field,
  FieldError,
  GoogleButton,
  OrDivider,
  PrimaryButton,
  Input,
} from '@/components/ui'
import { useToast } from '@/components/ui/toast'

function isInvalidCredentialsMessage(message: string) {
  return /invalid login credentials|invalid email or password/i.test(message)
}

export default function Login() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        const invalidCreds = isInvalidCredentialsMessage(signInError.message)
        const message = invalidCreds
          ? authContent.errors.invalidCredentials
          : signInError.message

        setError(message)
        showToast(
          invalidCreds ? authContent.errors.invalidCredentials : authContent.errors.signInFailed,
        )
        return
      }

      navigate(getPostAuthRoute(), { replace: true })
    } catch {
      const message = authContent.errors.signInFailed
      setError(message)
      showToast(message)
    } finally {
      setLoading(false)
    }
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
      <h2 className="text-[32px] font-semibold tracking-tight text-foreground">{authContent.login.title}</h2>
      <p className="mt-2 text-[15px] text-muted">{authContent.login.subtitle}</p>

      <div className="mt-8">
        <AuthTabs active="login" />
      </div>

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

        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[15px] text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-foreground"
            />
            Remember me
          </label>
          <Link
            to={ROUTES.forgotPassword}
            className="text-[15px] font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-muted"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-2">
          <PrimaryButton loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</PrimaryButton>
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
        Don't have an account?{' '}
        <Link
          to={ROUTES.signup}
          className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-muted"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import {
  AuthTabs,
  Field,
  FieldError,
  GoogleButton,
  OrDivider,
  PrimaryButton,
  inputClass,
} from '../components/ui'

export default function Login() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }
    // Keep the button disabled: the session lands in AuthProvider and
    // GuestRoute redirects to /dashboard.
  }

  async function handleGoogle() {
    setGoogleError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (oauthError) setGoogleError(oauthError.message)
  }

  return (
    <AuthLayout>
      <h2 className="text-[32px] font-bold tracking-tight text-neutral-900">Welcome back</h2>
      <p className="mt-2 text-[15px] text-neutral-500">Sign in to your RoundFlow account</p>

      <div className="mt-8">
        <AuthTabs active="login" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Work email">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[15px] text-neutral-500">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-[15px] font-semibold text-neutral-900 underline underline-offset-2 transition-colors hover:text-neutral-600"
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

      <p className="mt-8 text-center text-[15px] text-neutral-500">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-neutral-900 underline underline-offset-2 transition-colors hover:text-neutral-600"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

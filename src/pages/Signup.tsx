import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setConfirmError(null)

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    if (data.session) {
      // Email confirmation disabled: session is live, GuestRoute
      // redirects to /dashboard on the next render.
      return
    }

    navigate('/verify-otp', { state: { email } })
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
      <h2 className="text-[32px] font-bold tracking-tight text-neutral-900">Get started free</h2>
      <p className="mt-2 text-[15px] text-neutral-500">Create your RoundFlow account</p>

      <div className="mt-8">
        <AuthTabs active="signup" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Full name">
          <input
            type="text"
            required
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </Field>

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

        <Field label="Company name">
          <input
            type="text"
            autoComplete="organization"
            placeholder="Your business name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Confirm Password" error={confirmError}>
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </Field>

        <p className="text-sm text-neutral-500">
          By signing up you agree to our{' '}
          <a href="#" className="font-medium text-neutral-700 underline underline-offset-2">
            Terms
          </a>{' '}
          &{' '}
          <a href="#" className="font-medium text-neutral-700 underline underline-offset-2">
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

      <p className="mt-8 text-center text-[15px] text-neutral-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-neutral-900 underline underline-offset-2 transition-colors hover:text-neutral-600"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}

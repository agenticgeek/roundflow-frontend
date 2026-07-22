import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { authContent } from '@/content/auth'
import { Field, FieldError, PasswordInput, PrimaryButton } from '@/components/ui'

type Strength = {
  score: 0 | 1 | 2 | 3
  label: string
  barColor: string
  textColor: string
}

function getStrength(password: string): Strength {
  if (!password) {
    return { score: 0, label: '', barColor: '', textColor: '' }
  }
  const longEnough = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasExtra = password.length >= 12 && (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password))

  if (!longEnough || !hasNumber) {
    return { score: 1, label: 'Weak', barColor: 'bg-danger', textColor: 'text-danger' }
  }
  if (!hasExtra) {
    return { score: 2, label: 'Good', barColor: 'bg-success', textColor: 'text-success' }
  }
  return { score: 3, label: 'Strong', barColor: 'bg-success', textColor: 'text-success' }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getStrength(password)

  useEffect(() => {
    let active = true

    async function establishRecoverySession() {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (active && exchangeError) setLinkError(exchangeError.message)
      } else {
        const { data } = await supabase.auth.getSession()
        if (active && !data.session) {
          setLinkError('This password reset link is invalid or has expired.')
        }
      }
      if (active) setCheckingSession(false)
    }

    void establishRecoverySession()
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setConfirmError(null)
    setError(null)

    if (password.length < 8 || !/\d/.test(password)) {
      setPasswordError('Password must be at least 8 characters and include a number')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1200)
      })
      await supabase.auth.signOut()
      navigate(ROUTES.login, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) return <FullScreenLoader />

  return (
    <AuthLayout>
      <Link to={ROUTES.login} className="text-[15px] text-muted transition-colors hover:text-foreground">
        &larr; Back
      </Link>

      <h2 className="mt-6 text-[32px] font-semibold tracking-tight text-foreground">
        {authContent.resetPassword.title}
      </h2>
      <p className="mt-2 text-[15px] text-muted">{authContent.resetPassword.subtitle}</p>

      {linkError ? (
        <div className="mt-8">
          <FieldError message={linkError} />
        </div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <Field label="New password" error={passwordError}>
            <PasswordInput
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="mt-3 flex gap-2" aria-hidden="true">
            {[1, 2, 3].map((segment) => (
              <span
                key={segment}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${segment <= strength.score ? strength.barColor : 'bg-border'}`}
              />
            ))}
          </div>
          {strength.label ? (
            <p className={`mt-2 animate-fade-in text-sm font-medium ${strength.textColor}`}>
              Strength: {strength.label}
            </p>
          ) : null}
        </div>

        <Field label="Confirm password" error={confirmError}>
          <PasswordInput
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <div className="pt-1">
          <PrimaryButton loading={loading}>
            {success ? 'Password reset' : loading ? 'Resetting…' : 'Reset password'}
          </PrimaryButton>
          {error ? <FieldError message={error} /> : null}
        </div>
      </form>
      )}

      {!linkError ? (
      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-success" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
        You'll be redirected to log in after reset.
      </p>
      ) : null}
    </AuthLayout>
  )
}

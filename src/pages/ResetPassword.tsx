import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import { Field, FieldError, PasswordInput, PrimaryButton } from '../components/ui'

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
    return { score: 1, label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-600' }
  }
  if (!hasExtra) {
    return { score: 2, label: 'Good', barColor: 'bg-green-600', textColor: 'text-green-700' }
  }
  return { score: 3, label: 'Strong', barColor: 'bg-green-600', textColor: 'text-green-700' }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const strength = getStrength(password)

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
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setLoading(false)
      setError(updateError.message)
      return
    }
    // Drop the recovery session so the user lands on a clean login screen
    // instead of being bounced straight into the dashboard.
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <Link to="/login" className="text-[15px] text-neutral-500 transition-colors hover:text-neutral-700">
        &larr; Back
      </Link>

      <h2 className="mt-6 text-[32px] font-bold tracking-tight text-neutral-900">
        Set new password
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        Your new password must be at least 8 characters and include a number.
      </p>

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
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${segment <= strength.score ? strength.barColor : 'bg-neutral-200'}`}
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
            {loading ? 'Resetting…' : 'Reset password'}
          </PrimaryButton>
          {error ? <FieldError message={error} /> : null}
        </div>
      </form>

      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-neutral-500">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-green-600" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
        You'll be redirected to log in after reset.
      </p>
    </AuthLayout>
  )
}

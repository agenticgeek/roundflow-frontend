import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import { Field, FieldError, PrimaryButton, inputClass } from '../components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function sendResetLink() {
    setError(null)
    setSent(false)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendResetLink()
  }

  return (
    <AuthLayout>
      <Link to="/login" className="text-[15px] text-neutral-500 transition-colors hover:text-neutral-700">
        &larr; Back to log in
      </Link>

      <h2 className="mt-6 text-[32px] font-bold tracking-tight text-neutral-900">
        Forgot password?
      </h2>
      <p className="mt-2 max-w-xs text-[15px] text-neutral-500">
        Enter your work email and we'll send you a reset link.
      </p>

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

        <div>
          <PrimaryButton loading={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </PrimaryButton>
          {error ? <FieldError message={error} /> : null}
          {sent ? (
            <p className="mt-2 animate-fade-in text-sm text-green-600">
              Reset link sent to {email}. Check your inbox.
            </p>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Didn't receive an email? Check your spam folder or{' '}
        <button
          type="button"
          onClick={sendResetLink}
          disabled={loading || !email}
          className="font-medium text-neutral-900 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          resend
        </button>
      </p>
    </AuthLayout>
  )
}

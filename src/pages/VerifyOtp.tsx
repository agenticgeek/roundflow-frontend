import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { FieldError, PrimaryButton } from '../components/ui'

const OTP_LENGTH = 6
const EXPIRY_SECONDS = 10 * 60

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const email = (location.state as { email?: string } | null)?.email

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Once verification succeeds the session lands in AuthProvider;
  // redirect from here instead of racing it after verifyOtp resolves.
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  if (!email) {
    return <Navigate to="/login" replace />
  }

  const expired = secondsLeft === 0
  const code = digits.join('')

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleChange(index: number, rawValue: string) {
    const numeric = rawValue.replace(/\D/g, '')
    if (!numeric) {
      setDigitAt(index, '')
      return
    }
    // Handles both single keystrokes and multi-digit input (e.g. autofill)
    setDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < numeric.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = numeric[i]
      }
      return next
    })
    const focusIndex = Math.min(index + numeric.length, OTP_LENGTH - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? ''))
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (code.length < OTP_LENGTH) {
      setError('Enter the 6-digit code from your email')
      return
    }
    setLoading(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email as string,
      token: code,
      type: 'email',
    })
    if (verifyError) {
      setLoading(false)
      setError(verifyError.message)
      return
    }
    // Keep the button disabled; the session effect above redirects.
  }

  async function handleResend() {
    setError(null)
    setResendMessage(null)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email as string,
    })
    if (resendError) {
      setError(resendError.message)
      return
    }
    setDigits(Array(OTP_LENGTH).fill(''))
    setSecondsLeft(EXPIRY_SECONDS)
    setResendMessage(`A new code was sent to ${email}`)
    inputsRef.current[0]?.focus()
  }

  return (
    <AuthLayout>
      <Link to="/login" className="text-[15px] text-neutral-500 transition-colors hover:text-neutral-700">
        &larr; Back
      </Link>

      <h2 className="mt-6 text-[32px] font-bold tracking-tight text-neutral-900">
        Check your email
      </h2>
      <p className="mt-2 text-[15px] text-neutral-500">
        We sent a 6-digit code to <span className="font-semibold text-neutral-900">{email}</span>.
        <br />
        Enter it below to continue.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8">
        <div className="flex gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={OTP_LENGTH}
              placeholder="–"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${index + 1}`}
              className={`h-14 w-full min-w-0 flex-1 rounded-xl border text-center text-xl font-semibold text-neutral-900 outline-none transition-[border-color,box-shadow,transform] duration-200 placeholder:text-neutral-300 focus:scale-[1.05] focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/[0.06] sm:h-[70px] ${digit ? 'border-neutral-400' : 'border-neutral-200'}`}
            />
          ))}
        </div>

        <p className="mt-5 text-[15px] text-neutral-500">
          {expired ? (
            <span className="text-red-600">Code expired. Request a new one below.</span>
          ) : (
            <>
              Code expires in{' '}
              <span className="font-semibold text-neutral-900">{formatTime(secondsLeft)}</span>
            </>
          )}
        </p>

        <div className="mt-4">
          <PrimaryButton loading={loading} disabled={expired}>
            {loading ? 'Verifying…' : 'Verify code'}
          </PrimaryButton>
          {error ? <FieldError message={error} /> : null}
          {resendMessage ? (
            <p className="mt-2 animate-fade-in text-sm text-green-600">{resendMessage}</p>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Didn't receive a code?{' '}
        <button
          type="button"
          onClick={handleResend}
          className="font-medium text-neutral-900 underline underline-offset-2"
        >
          Resend code
        </button>
      </p>
    </AuthLayout>
  )
}

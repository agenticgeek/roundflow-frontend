import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/[0.06]'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-neutral-900">{label}</span>
      {children}
      {error ? <FieldError message={error} /> : null}
    </label>
  )
}

export function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-2 animate-fade-in text-sm text-red-600">
      {message}
    </p>
  )
}

export function PrimaryButton({
  loading,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={loading || props.disabled}
      className={`w-full rounded-xl bg-neutral-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-neutral-800 hover:shadow-lg hover:shadow-neutral-900/15 active:translate-y-0 active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${className}`}
    >
      {children}
    </button>
  )
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-400 transition-all duration-150 hover:text-neutral-600 active:scale-90"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M6.7 6.9C4.6 8.2 3 10 2 12c1.8 3.7 5.5 6.5 10 6.5 1.8 0 3.4-.4 4.9-1.2M11 5.6c.3 0 .7-.1 1-.1 4.5 0 8.2 2.8 10 6.5-.5 1-1.1 1.9-1.9 2.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
            <path d="M2 12c1.8-3.7 5.5-6.5 10-6.5S20.2 8.3 22 12c-1.8 3.7-5.5 6.5-10 6.5S3.8 15.7 2 12Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}

export function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  const base =
    'relative z-10 rounded-full px-6 py-2 text-center text-sm transition-colors duration-300'
  return (
    <div className="relative inline-grid grid-cols-2 rounded-full bg-neutral-100 p-1">
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-neutral-900 shadow transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${active === 'signup' ? 'translate-x-full' : ''}`}
      />
      <Link
        to="/login"
        className={`${base} ${active === 'login' ? 'font-semibold text-white' : 'font-medium text-neutral-500 hover:text-neutral-700'}`}
      >
        Log in
      </Link>
      <Link
        to="/signup"
        className={`${base} ${active === 'signup' ? 'font-semibold text-white' : 'font-medium text-neutral-500 hover:text-neutral-700'}`}
      >
        Sign up
      </Link>
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-neutral-200" />
      <span className="text-sm text-neutral-400">or</span>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  )
}

export function GoogleButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] font-medium text-neutral-900 transition-all duration-200 hover:-translate-y-px hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md hover:shadow-neutral-900/5 active:translate-y-0 active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
        />
      </svg>
      Continue with Google
    </button>
  )
}

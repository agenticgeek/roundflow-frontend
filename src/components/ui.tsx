import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { authContent } from '@/content/auth'
import { usePasswordVisibility } from '@/hooks/use-password-visibility'
import { cn } from '@/lib/utils'

const { ui } = authContent

export const inputClass =
  'w-full rounded-xl border border-border bg-background text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-foreground focus:ring-4 focus:ring-foreground/[0.06]'

const inputSizeClass = {
  default: 'px-4 py-3 text-[15px]',
  sm: 'px-3.5 py-2 text-sm',
} as const

export type InputSize = keyof typeof inputSizeClass

export function Field({
  label,
  required,
  error,
  children,
  labelWeight = 'semibold',
  size = 'default',
}: {
  label: ReactNode
  required?: boolean
  error?: string | null
  children: ReactNode
  /** `medium` for setup/forms; `semibold` for auth screens (default). */
  labelWeight?: 'medium' | 'semibold'
  size?: InputSize
}) {
  return (
    <div className="block">
      <span
        className={cn(
          'block text-foreground',
          size === 'sm' ? 'mb-1.5 text-xs' : 'mb-2 text-sm',
          labelWeight === 'medium' ? 'font-medium' : 'font-semibold',
        )}
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {error ? <FieldError message={error} size={size} /> : null}
    </div>
  )
}

export function FieldError({ message, size = 'default' }: { message: string; size?: InputSize }) {
  return (
    <p
      role="alert"
      className={cn(
        'animate-fade-in text-danger',
        size === 'sm' ? 'mt-1.5 text-xs' : 'mt-2 text-sm',
      )}
    >
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
      className={cn(
        'w-full rounded-xl bg-primary px-4 py-3.5 text-[15px] font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-px hover:opacity-90 hover:shadow-lg hover:shadow-primary/15 active:translate-y-0 active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Reusable primary CTA classes — import for inline action buttons outside PrimaryButton. */
export const ctaButtonClass =
  'rounded-xl bg-primary font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'

function PasswordToggleButton({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? ui.hidePassword : ui.showPassword}
      className="absolute top-1/2 right-4 -translate-y-1/2 text-muted transition-all duration-150 hover:text-foreground active:scale-90"
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
  )
}

/** Styled input. Pass `type="password"` to get the show/hide eye toggle automatically. */
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { inputSize?: InputSize }
>(function Input({ type = 'text', className, inputSize = 'default', ...props }, ref) {
  const { visible, toggle, inputType } = usePasswordVisibility()
  const isPassword = type === 'password'
  const sizeClass = inputSizeClass[inputSize]

  if (!isPassword) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputClass, sizeClass, className)}
        {...props}
      />
    )
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        type={inputType}
        className={cn(inputClass, sizeClass, 'pr-12', className)}
        {...props}
      />
      <PasswordToggleButton visible={visible} onToggle={toggle} />
    </div>
  )
})

/** @deprecated Prefer `<Input type="password" />` — kept for existing call sites. */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(function PasswordInput(props, ref) {
  return <Input ref={ref} type="password" {...props} />
})

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  inputSize?: InputSize
}

/** Styled select matching Input appearance. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className, inputSize = 'default', ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(inputClass, inputSizeClass[inputSize], 'appearance-none bg-background', className)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})

/** Styled textarea matching Input appearance. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { inputSize?: InputSize }
>(function Textarea({ className, inputSize = 'default', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        inputClass,
        inputSizeClass[inputSize],
        inputSize === 'sm' ? 'min-h-[4.75rem]' : 'min-h-[6.5rem]',
        'resize-y',
        className,
      )}
      {...props}
    />
  )
})

/** Accessible toggle switch — reusable across setup and settings screens. */
export function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

export function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  const base =
    'relative z-10 rounded-full px-6 py-2 text-center text-sm transition-colors duration-300'
  return (
    <div className="relative inline-grid grid-cols-2 rounded-full bg-surface p-1">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          active === 'signup' && 'translate-x-full',
        )}
      />
      <Link
        to={ROUTES.login}
        className={cn(base, active === 'login' ? 'font-semibold text-primary-foreground' : 'font-medium text-muted hover:text-foreground')}
      >
        {ui.tabLogin}
      </Link>
      <Link
        to={ROUTES.signup}
        className={cn(base, active === 'signup' ? 'font-semibold text-primary-foreground' : 'font-medium text-muted hover:text-foreground')}
      >
        {ui.tabSignup}
      </Link>
    </div>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="text-sm text-muted">{ui.orDivider}</span>
      <span className="h-px flex-1 bg-border" />
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
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-[15px] font-medium text-foreground transition-all duration-200 hover:-translate-y-px hover:border-muted/40 hover:bg-surface hover:shadow-md hover:shadow-foreground/5 active:translate-y-0 active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Google's brand mark uses its own fixed brand colors, not app theme tokens. */}
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
      {ui.googleLabel}
    </button>
  )
}

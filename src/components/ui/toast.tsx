import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { site } from '@/content/site'
import type { UiToast } from '@/stores/ui.store'
import { useUiStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils'

interface ToastOptions {
  durationMs?: number
  description?: string
  tone?: UiToast['tone']
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Global toast provider.
 *
 * Mount this once near the app root. Feature modules should call `useToast()`
 * instead of rendering their own notification UI, which keeps toast placement,
 * timing, fade animation, and close affordance consistent across the product.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useUiStore((state) => state.toasts)
  const pushToast = useUiStore((state) => state.pushToast)
  const removeToast = useUiStore((state) => state.dismissToast)
  const timers = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    removeToast(id)
  }, [removeToast])

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      pushToast({
        message,
        description: options.description,
        durationMs: options.durationMs,
        tone: options.tone,
      })
    },
    [pushToast],
  )

  useEffect(() => {
    for (const toast of toasts) {
      if (timers.current.has(toast.id)) continue
      const timer = window.setTimeout(
        () => dismissToast(toast.id),
        toast.durationMs ?? 3500,
      )
      timers.current.set(toast.id, timer)
    }
  }, [dismissToast, toasts])

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer)
      timers.current.clear()
    },
    [],
  )

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: UiToast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed top-6 left-1/2 z-[70] flex w-full max-w-xl -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-auto flex w-full max-w-lg items-start justify-between gap-4 px-6 py-4 text-primary-foreground shadow-xl',
            toast.tone === 'error' ? 'bg-danger' : 'bg-primary',
            toast.description ? 'rounded-2xl' : 'items-center rounded-full py-3',
            'animate-toast-in',
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold sm:text-base">{toast.message}</p>
            {toast.description ? (
              <p className="mt-1 text-xs font-normal text-primary-foreground/85 sm:text-sm">
                {toast.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={site.ui.closeDialog}
            onClick={() => onDismiss(toast.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

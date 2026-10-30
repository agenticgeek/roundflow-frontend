import { appErrorsContent, LOADING_TIMEOUT_MS } from '@/content/app-errors'
import { site } from '@/content/site'
import { primaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import { useTimeoutElapsed } from '@/hooks/use-timeout-elapsed'

/**
 * App boot / auth splash — colored RoundFlow wordmark. After 15 s it stops pretending and
 * offers a Retry, so a dead connection never leaves a blank splash forever (GAP-005).
 */
export function FullScreenLoader({ timeoutMs = LOADING_TIMEOUT_MS }: { timeoutMs?: number }) {
  const timedOut = useTimeoutElapsed(timeoutMs)
  const copy = appErrorsContent.network

  return (
    <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center bg-background">
      <div className={timedOut ? 'flex flex-col items-center gap-4' : 'flex animate-pulse flex-col items-center gap-4'}>
        <img
          src={site.logo.src}
          alt={site.logo.alt}
          className="h-12 w-auto sm:h-14"
        />
        {timedOut ? (
          <div role="alert" className="max-w-sm px-6 text-center">
            <p className="text-base font-semibold text-foreground">{copy.timeoutTitle}</p>
            <p className="mt-1 text-sm text-muted">{copy.timeoutDescription}</p>
            <button type="button" className={`${primaryButtonClass} mt-4`} onClick={() => window.location.reload()}>
              {copy.retry}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

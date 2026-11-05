import { useNavigate, useRouteError } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { appErrorsContent } from '@/content/app-errors'
import { primaryButtonClass, secondaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import { routeErrorDetail } from '@/lib/route-error'

/**
 * `errorElement` for every route (GAP-024): one bad response or render bug shows this
 * instead of blanking the whole app.
 */
export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()
  const copy = appErrorsContent.route
  const detail = routeErrorDetail(error)

  return (
    <main role="alert" className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted">{copy.description}</p>
        {detail ? <p className="mt-3 text-sm text-danger">{detail}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className={secondaryButtonClass} onClick={() => navigate(ROUTES.dashboard)}>
            {copy.home}
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => navigate(0)}>
            {copy.retry}
          </button>
        </div>
      </div>
    </main>
  )
}

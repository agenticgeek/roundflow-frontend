import { isRouteErrorResponse } from 'react-router-dom'
import { appErrorsContent } from '@/content/app-errors'

/** The detail line for whatever a route threw — a Response (404 etc.) or an Error. */
export function routeErrorDetail(error: unknown): string | null {
  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? appErrorsContent.route.notFound : `${error.status} ${error.statusText}`.trim()
  }
  if (error instanceof Error && error.message) return error.message
  return null
}

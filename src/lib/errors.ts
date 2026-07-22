import type { NavigateFunction } from 'react-router-dom'
import type { Role } from '@/api/types'
import { ROUTES } from '@/config/routes'
import { useUiStore } from '@/stores/ui.store'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function handleForbidden(
  error: ApiError,
  role: Role | undefined,
  navigate: NavigateFunction,
) {
  switch (error.code) {
    case 'SETUP_INCOMPLETE':
      navigate(ROUTES.setupWizard, { replace: true })
      return
    case 'SETUP_ALREADY_COMPLETE':
      navigate(ROUTES.home, { replace: true })
      return
    case 'ROLE_FORBIDDEN':
      useUiStore.getState().pushToast({
        message: "You don't have permission to do that.",
        tone: 'error',
      })
      return
    default:
      // BACKEND-GAP: live 403 responses do not yet include a code.
      if (role === 'TECHNICIAN') {
        useUiStore.getState().pushToast({
          message: "You don't have permission to do that.",
          tone: 'error',
        })
        return
      }
      navigate(ROUTES.setupWizard, { replace: true })
  }
}

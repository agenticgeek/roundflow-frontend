import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

/** True for an ADMIN. A MANAGER can change most settings but gets `403 ADMIN_ONLY` on the ones that move money. */
export function useIsAdmin(): boolean {
  return useAppBootstrap().role === 'ADMIN'
}

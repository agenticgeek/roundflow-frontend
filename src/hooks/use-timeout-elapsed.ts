import { useEffect, useState } from 'react'

/** True once `ms` has passed since mount — for "this is taking too long" fallbacks (GAP-005). */
export function useTimeoutElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setElapsed(true), ms)
    return () => window.clearTimeout(timer)
  }, [ms])
  return elapsed
}

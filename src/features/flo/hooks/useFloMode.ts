import { useCallback, useState } from 'react'
import type { FloMode } from '@/api/flo.api'
import { readStored, writeStored } from '@/lib/safe-storage'

const KEY = 'roundflow.flo.mode'
const MODES: readonly FloMode[] = ['THOROUGH', 'BALANCED', 'QUICK']

/** The answer style, Balanced until the user picks one; remembered in this browser when storage allows. */
export function useFloMode(): [FloMode, (mode: FloMode) => void] {
  const [mode, setModeState] = useState<FloMode>(() => {
    const stored = readStored(KEY) as FloMode | null
    return stored && MODES.includes(stored) ? stored : 'BALANCED'
  })
  const setMode = useCallback((next: FloMode) => {
    setModeState(next)
    writeStored(KEY, next)
  }, [])
  return [mode, setMode]
}

import { useState } from 'react'
import type { FloMode } from '@/api/flo.api'

/** The answer style. Every visit to Flo starts on Balanced; a pick lasts for this visit only. */
export function useFloMode(): [FloMode, (mode: FloMode) => void] {
  return useState<FloMode>('BALANCED')
}

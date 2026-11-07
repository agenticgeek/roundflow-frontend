import { useCallback } from 'react'
import { useToast } from '@/components/ui/toast'
import { mapsContent } from '@/content/maps'

/**
 * After a property is created or its address changes, warns when the server could not place it on the
 * map (`latitude: null`). Returns a function to call with the save result. A result without a
 * `latitude` field (older backend) is ignored.
 */
export function useLocationWarning() {
  const { showToast } = useToast()
  return useCallback(
    (result: unknown) => {
      if ((result as { latitude?: number | null } | null)?.latitude !== null) return
      showToast(mapsContent.savedWithoutLocation.title, {
        description: mapsContent.savedWithoutLocation.description,
        durationMs: 8000,
      })
    },
    [showToast],
  )
}

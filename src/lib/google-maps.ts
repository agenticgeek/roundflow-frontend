import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { googleMapsApiKey } from '@/lib/env'

let loaderPromise: Promise<{ maps: typeof google.maps }> | null = null

/**
 * Loads the Google Maps JavaScript API exactly once per page load and caches
 * the `maps` + `marker` libraries. Throws if `VITE_GOOGLE_MAPS_API_KEY` isn't set —
 * callers should check `googleMapsApiKey()` first and show a setup notice instead.
 */
export function loadGoogleMaps(): Promise<{ maps: typeof google.maps }> {
  if (loaderPromise) return loaderPromise

  const apiKey = googleMapsApiKey()
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured.'))
  }

  setOptions({ key: apiKey, v: 'weekly' })

  // Both libraries attach their classes to the global `google.maps` namespace. `marker` provides
  // AdvancedMarkerElement; the Geocoding library is not loaded (geocoding happens on the backend).
  loaderPromise = Promise.all([importLibrary('maps'), importLibrary('marker')]).then(() => ({
    maps: window.google.maps,
  }))
  return loaderPromise
}

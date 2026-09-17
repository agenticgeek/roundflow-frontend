import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { googleMapsApiKey } from '@/lib/env'

let loaderPromise: Promise<{ maps: typeof google.maps }> | null = null
let optionsSet = false

/**
 * Loads the Google Maps JavaScript API exactly once per page load and caches
 * the `maps` + `geocoding` libraries. Throws if `VITE_GOOGLE_MAPS_API_KEY` isn't set —
 * callers should check `googleMapsApiKey()` first and show a setup notice instead.
 */
export function loadGoogleMaps(): Promise<{ maps: typeof google.maps }> {
  if (loaderPromise) return loaderPromise

  const apiKey = googleMapsApiKey()
  if (!apiKey) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured.'))
  }

  if (!optionsSet) {
    setOptions({ key: apiKey, v: 'weekly' })
    optionsSet = true
  }

  // Both libraries attach their classes to the global `google.maps` namespace.
  loaderPromise = Promise.all([importLibrary('maps'), importLibrary('geocoding')]).then(() => ({
    maps: window.google.maps,
  }))
  return loaderPromise
}

import { useEffect, useRef, useState } from 'react'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import {
  geocodeCacheKey,
  getCachedGeocode,
  setCachedGeocode,
  type GeocodedPoint,
} from '@/lib/geocode-cache'
import { googleMapsApiKey } from '@/lib/env'
import { loadGoogleMaps } from '@/lib/google-maps'

export interface GeocodedStop {
  stop: PlannerListStop
  point: GeocodedPoint
}

export interface UseGeocodedStopsResult {
  points: GeocodedStop[]
  /** Stops whose address the Geocoding API couldn't resolve — omitted from the map, listed so the manager can fix them. */
  failed: PlannerListStop[]
  loading: boolean
  error: string | null
  configured: boolean
}

/** Stagger new (uncached) lookups so a full day's stops don't all hit the Geocoder at once. */
const GEOCODE_STAGGER_MS = 180

function geocodeOne(geocoder: google.maps.Geocoder, address: string): Promise<GeocodedPoint | null> {
  return geocoder
    .geocode({ address, region: 'gb' })
    .then((result) => {
      const location = result.results[0]?.geometry.location
      return location ? { lat: location.lat(), lng: location.lng() } : null
    })
    .catch(() => null)
}

/**
 * Geocodes a day's stops client-side (Round Planner handoff §8 — no lat/lng in the
 * schema). Cached per address in localStorage so repeat visits to the same property
 * across occurrences don't re-spend Geocoding API quota.
 */
export function useGeocodedStops(stops: readonly PlannerListStop[]): UseGeocodedStopsResult {
  const configured = Boolean(googleMapsApiKey())
  const [points, setPoints] = useState<GeocodedStop[]>([])
  const [failed, setFailed] = useState<PlannerListStop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  // Stable dependency: re-geocode only when the actual set of addresses changes.
  const addressKey = stops.map((stop) => geocodeCacheKey(stop.addressLine, stop.postcode)).join('|')

  useEffect(() => {
    if (!configured || stops.length === 0) {
      setPoints([])
      setFailed([])
      return
    }

    const thisRequest = ++requestId.current
    setLoading(true)
    setError(null)

    async function run() {
      try {
        const { maps } = await loadGoogleMaps()
        if (thisRequest !== requestId.current) return
        const geocoder = new maps.Geocoder()

        const resolved: GeocodedStop[] = []
        const unresolved: PlannerListStop[] = []
        let pendingLookups = 0

        for (const stop of stops) {
          const key = geocodeCacheKey(stop.addressLine, stop.postcode)
          const cached = getCachedGeocode(key)

          if (cached !== undefined) {
            if (cached) resolved.push({ stop, point: cached })
            else unresolved.push(stop)
            continue
          }

          if (pendingLookups > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, GEOCODE_STAGGER_MS))
          }
          pendingLookups += 1
          if (thisRequest !== requestId.current) return

          const point = await geocodeOne(geocoder, `${stop.addressLine}, ${stop.postcode}, UK`)
          setCachedGeocode(key, point)
          if (point) resolved.push({ stop, point })
          else unresolved.push(stop)
        }

        if (thisRequest !== requestId.current) return
        setPoints(resolved)
        setFailed(unresolved)
      } catch (caught) {
        if (thisRequest !== requestId.current) return
        setError(caught instanceof Error ? caught.message : 'Could not load Google Maps.')
        setPoints([])
        setFailed([])
      } finally {
        if (thisRequest === requestId.current) setLoading(false)
      }
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, addressKey])

  return { points, failed, loading, error, configured }
}

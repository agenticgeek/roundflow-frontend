import { useEffect, useMemo, useState } from 'react'
import type { PlannerListStop } from '@/features/rounds/lib/planner'
import { googleMapsApiKey } from '@/lib/env'
import { loadGoogleMaps } from '@/lib/google-maps'

export interface GeocodedPoint {
  lat: number
  lng: number
}

export interface GeocodedStop {
  stop: PlannerListStop
  point: GeocodedPoint
}

export interface UseGeocodedStopsResult {
  points: GeocodedStop[]
  /** Stops with no backend coordinates yet — omitted from the map until the geocoding backfill resolves them. */
  failed: PlannerListStop[]
  loading: boolean
  error: string | null
  configured: boolean
}

/**
 * Plots a day's stops using the `latitude`/`longitude` the backend geocodes from
 * each postcode (property geocoding handoff, 2026-10-29). `null` coordinates are
 * normal — new properties and postcode edits stay unpinned until the backfill job
 * runs (~15 min) — so those stops are skipped, not treated as an error.
 */
export function useGeocodedStops(stops: readonly PlannerListStop[]): UseGeocodedStopsResult {
  const configured = Boolean(googleMapsApiKey())
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState<string | null>(null)

  const { points, failed } = useMemo(() => {
    const resolved: GeocodedStop[] = []
    const unresolved: PlannerListStop[] = []
    for (const stop of stops) {
      if (stop.latitude != null && stop.longitude != null) {
        resolved.push({ stop, point: { lat: stop.latitude, lng: stop.longitude } })
      } else {
        unresolved.push(stop)
      }
    }
    return { points: resolved, failed: unresolved }
  }, [stops])

  // Callers mount a live google.maps.Map once loading flips to false, so the
  // script must be present by then — even when there are no stops to plot.
  useEffect(() => {
    if (!configured) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadGoogleMaps()
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load Google Maps.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [configured])

  return { points, failed, loading, error, configured }
}

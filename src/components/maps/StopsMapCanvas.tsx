import { useEffect, useMemo, useRef } from 'react'
import type { GeocodedStop } from '@/features/maps/hooks/useGeocodedStops'
import { createPin, fitBoundsCapped, type PinHandle } from '@/features/maps/lib/gmaps'
import { groupPoints, infoWindowHtml, mapId } from '@/features/maps/lib/markers'
import { mapsDirectionsUrl } from '@/lib/navigation'
import { formatCurrency } from '@/lib/utils'

/**
 * The live Google map for a set of stops (Round Planner and the dashboard's GPS panel). One pin per set
 * of coincident stops (a count when there are several), `AdvancedMarkerElement` when the marker library
 * loaded, an info window for the selected stop, and a zoom capped so one address never fills the map.
 */
export function StopsMapCanvas({
  points,
  selectedVisitId,
  onSelect,
  onError,
  currency,
}: {
  points: readonly GeocodedStop[]
  selectedVisitId: string | null
  onSelect: (visitId: string) => void
  onError: () => void
  currency: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const pinsRef = useRef<Map<string, PinHandle>>(new Map())
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const groups = useMemo(() => groupPoints(points), [points])

  // Create the map once. Google's JS API can leave `google.maps` in a broken
  // state (stub constructors that throw) when auth/referrer checks fail, so
  // this is wrapped rather than letting it crash the whole app.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || typeof google === 'undefined') return
    try {
      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: 54.978, lng: -1.617 }, // UK-ish fallback until bounds fit
        zoom: 11,
        mapId: mapId(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      })
      infoWindowRef.current = new google.maps.InfoWindow()
    } catch {
      onError()
    }
  }, [onError])

  // Sync pins to the current groups: one pin per coincident set of stops.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    try {
      const nextKeys = new Set(groups.map((group) => group.key))
      for (const [key, pin] of pinsRef.current) {
        if (!nextKeys.has(key)) {
          pin.remove()
          pinsRef.current.delete(key)
        }
      }

      const bounds = new google.maps.LatLngBounds()
      for (const group of groups) {
        bounds.extend(group.point)
        const existing = pinsRef.current.get(group.key)
        if (existing) existing.update(group)
        else pinsRef.current.set(group.key, createPin(map, group, () => onSelect(group.stops[0].visitId)))
      }

      if (groups.length === 1) {
        map.setCenter(groups[0].point)
        map.setZoom(15)
      } else if (groups.length > 1) {
        fitBoundsCapped(map, bounds)
      }
    } catch {
      onError()
    }
  }, [groups, onSelect, onError])

  // Open/close the info window for the selected stop's pin.
  useEffect(() => {
    const map = mapRef.current
    const infoWindow = infoWindowRef.current
    if (!map || !infoWindow) return

    const group = selectedVisitId
      ? groups.find((candidate) => candidate.stops.some((stop) => stop.visitId === selectedVisitId))
      : undefined
    const pin = group ? pinsRef.current.get(group.key) : undefined
    if (!group || !pin) {
      infoWindow.close()
      return
    }

    infoWindow.setContent(
      infoWindowHtml(
        group,
        (value) => formatCurrency(value, currency),
        (stop) => mapsDirectionsUrl({ ...stop, address: `${stop.addressLine}, ${stop.postcode}` }),
      ),
    )
    infoWindow.open({ map, anchor: pin.anchor })
    map.panTo(group.point)
  }, [selectedVisitId, groups, currency])

  return <div ref={containerRef} className="absolute inset-0" />
}

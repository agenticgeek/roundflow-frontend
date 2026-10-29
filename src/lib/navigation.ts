/**
 * "Navigate here" link — coordinates when both are present (backend geocodes
 * from the postcode, so `null` is normal until the backfill job runs), else an
 * address-text search.
 */
export function mapsDirectionsUrl(target: {
  latitude?: number | null
  longitude?: number | null
  address: string
}): string {
  const { latitude, longitude, address } = target
  const query =
    latitude != null && longitude != null ? `${latitude},${longitude}` : address
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
}

import { mapsContent } from '@/content/maps'

/**
 * Says when a property's map location is only a guess ("Approximate location") or missing
 * ("Location not found"). Renders nothing when the location is fine or not known yet.
 */
export function LocationNote({
  latitude,
  locationApproximate,
}: {
  /** `null` = looked up but not found; `undefined` = the API did not say. */
  latitude?: number | null
  locationApproximate?: boolean
}) {
  if (locationApproximate) {
    return (
      <p className="mt-1 text-xs text-warning-foreground">
        <span className="inline-block rounded bg-warning-surface px-1.5 py-0.5 font-semibold">{mapsContent.approximateBadge}</span>{' '}
        {mapsContent.approximateHint}
      </p>
    )
  }
  if (latitude === null) {
    return (
      <p className="mt-1 text-xs text-muted">
        <span className="inline-block rounded bg-surface px-1.5 py-0.5 font-semibold text-foreground">{mapsContent.notFoundBadge}</span>{' '}
        {mapsContent.notFoundHint}
      </p>
    )
  }
  return null
}

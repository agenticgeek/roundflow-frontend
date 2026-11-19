import type { components } from '@/api/types.gen'

// One stop per property per day (docs/PROPERTY_STOPS_PLAN_2026-11-19.md): the office sees one row per property with
// the services due there, instead of one row per service.

export type StopServiceRef = components['schemas']['StopServiceRef']

const DEFAULT_SERVICE = 'Window clean'

/** "Window clean + Gutter clear": the services not skipped (every one when all were skipped); "" for none. */
export function stopServiceSummary(services: readonly StopServiceRef[] | undefined): string {
  if (!services?.length) return ''
  const shown = services.filter((s) => s.status !== 'SKIPPED' && s.status !== 'CANCELLED')
  return (shown.length ? shown : services).map((s) => s.serviceName ?? DEFAULT_SERVICE).join(' + ')
}

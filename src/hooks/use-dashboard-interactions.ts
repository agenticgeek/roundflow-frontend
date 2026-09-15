import { useCallback, useState } from 'react'
import type { DashboardChartRange, DashboardPeriod } from '@/api/dashboard.api'

/** Dashboard UI state — technician filter, KPI period, chart range, GPS selection. Data lives in the screen. */
export function useDashboardInteractions() {
  /** Empty set = all technicians. */
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<Set<string>>(() => new Set())
  const [period, setPeriod] = useState<DashboardPeriod>('monthly')
  const [range, setRange] = useState<DashboardChartRange>('6m')
  const [selectedGpsTechnician, setSelectedGpsTechnician] = useState<string | null>(null)

  const toggleTechnician = useCallback((technicianId: string) => {
    setSelectedTechnicianIds((current) => {
      const next = new Set(current)
      if (next.has(technicianId)) next.delete(technicianId)
      else next.add(technicianId)
      return next
    })
  }, [])

  const clearTechnicians = useCallback(() => setSelectedTechnicianIds(new Set()), [])

  return {
    selectedTechnicianIds,
    toggleTechnician,
    clearTechnicians,
    period,
    setPeriod,
    range,
    setRange,
    selectedGpsTechnician,
    setSelectedGpsTechnician,
  }
}

export type DashboardInteractions = ReturnType<typeof useDashboardInteractions>

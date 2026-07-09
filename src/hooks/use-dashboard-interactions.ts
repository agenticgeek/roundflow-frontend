import { useCallback, useMemo, useState } from 'react'
import type { DashboardAlertId } from '@/content/dashboard'
import { dashboardContent } from '@/content/dashboard'

/** Dashboard UI state — filters, period, alerts, GPS selection, refresh. */
export function useDashboardInteractions() {
  const { header, kpis } = dashboardContent

  const [selectedTechnicians, setSelectedTechnicians] = useState<Set<string>>(
    () => new Set(kpis.filters),
  )
  const [period, setPeriod] = useState<string>(kpis.period[0])
  const [openAlertModalId, setOpenAlertModalId] = useState<DashboardAlertId | null>(null)
  const [selectedGpsTechnician, setSelectedGpsTechnician] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>(header.lastUpdated)
  const [refreshing, setRefreshing] = useState(false)

  const toggleTechnician = useCallback((name: string) => {
    setSelectedTechnicians((current) => {
      const next = new Set(current)
      if (next.has(name)) {
        if (next.size > 1) next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const openAlertModal = useCallback((id: DashboardAlertId) => {
    setOpenAlertModalId(id)
  }, [])

  const closeAlertModal = useCallback(() => {
    setOpenAlertModalId(null)
  }, [])

  const refreshDashboard = useCallback(() => {
    setRefreshing(true)
    window.setTimeout(() => {
      const now = new Date()
      const formatted = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      setLastUpdated(`Last updated ${formatted}`)
      setRefreshing(false)
    }, 600)
  }, [])

  const periodMultiplier = period === 'Yearly' ? 1.25 : 1

  const scaledValueChart = useMemo(
    () =>
      kpis.valueChart.map((item) => ({
        ...item,
        value: Math.min(100, Math.round(item.value * periodMultiplier)),
      })),
    [periodMultiplier, kpis.valueChart],
  )

  const scaledRevenueLine = useMemo(
    () =>
      kpis.revenueLine.map((item) => ({
        ...item,
        value: Math.min(100, Math.round(item.value * periodMultiplier)),
      })),
    [periodMultiplier, kpis.revenueLine],
  )

  return {
    selectedTechnicians,
    toggleTechnician,
    period,
    setPeriod,
    openAlertModalId,
    openAlertModal,
    closeAlertModal,
    selectedGpsTechnician,
    setSelectedGpsTechnician,
    lastUpdated,
    refreshing,
    refreshDashboard,
    scaledValueChart,
    scaledRevenueLine,
  }
}

export type DashboardInteractions = ReturnType<typeof useDashboardInteractions>

import { useCallback, useState } from 'react'

const STORAGE_KEY = 'roundflow-sidebar-collapsed'

function readCollapsedPreference() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'true'
}

/** App sidebar collapse + mobile drawer state. */
export function useAppSidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const openMobile = useCallback(() => {
    setMobileOpen(true)
  }, [])

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return {
    collapsed,
    toggleCollapsed,
    mobileOpen,
    openMobile,
    closeMobile,
  }
}

export type AppSidebarState = ReturnType<typeof useAppSidebar>

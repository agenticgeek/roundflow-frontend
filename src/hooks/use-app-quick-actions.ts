import { useCallback, useState } from 'react'
import type { AppQuickActionId } from '@/content/app-shell'

/** Shared quick-action modal state — available from any app module. */
export function useAppQuickActions() {
  const [bulkMessageModalOpen, setBulkMessageModalOpen] = useState(false)
  const [addOneOffJobModalOpen, setAddOneOffJobModalOpen] = useState(false)

  const openBulkMessageModal = useCallback(() => {
    setBulkMessageModalOpen(true)
  }, [])

  const closeBulkMessageModal = useCallback(() => {
    setBulkMessageModalOpen(false)
  }, [])

  const openAddOneOffJobModal = useCallback(() => {
    setAddOneOffJobModalOpen(true)
  }, [])

  const closeAddOneOffJobModal = useCallback(() => {
    setAddOneOffJobModalOpen(false)
  }, [])

  const handleQuickAction = useCallback(
    (actionId: AppQuickActionId) => {
      if (actionId === 'bulk-message') {
        openBulkMessageModal()
      }
      if (actionId === 'add-one-off-job') {
        openAddOneOffJobModal()
      }
      // add-round — wired when the add-round modal ships
    },
    [openAddOneOffJobModal, openBulkMessageModal],
  )

  return {
    bulkMessageModalOpen,
    openBulkMessageModal,
    closeBulkMessageModal,
    addOneOffJobModalOpen,
    openAddOneOffJobModal,
    closeAddOneOffJobModal,
    handleQuickAction,
  }
}

export type AppQuickActions = ReturnType<typeof useAppQuickActions>

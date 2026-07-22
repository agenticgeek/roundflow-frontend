import { useCallback, useState } from 'react'
import type { AppQuickActionId } from '@/content/app-shell'

/** Shared quick-action modal state — available from any app module. */
export function useAppQuickActions() {
  const [addRoundModalOpen, setAddRoundModalOpen] = useState(false)
  const [bulkMessageModalOpen, setBulkMessageModalOpen] = useState(false)
  const [addOneOffJobModalOpen, setAddOneOffJobModalOpen] = useState(false)

  const openAddRoundModal = useCallback(() => {
    setAddRoundModalOpen(true)
  }, [])

  const closeAddRoundModal = useCallback(() => {
    setAddRoundModalOpen(false)
  }, [])

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
      if (actionId === 'add-round') {
        openAddRoundModal()
      }
      if (actionId === 'bulk-message') {
        openBulkMessageModal()
      }
      if (actionId === 'add-one-off-job') {
        openAddOneOffJobModal()
      }
    },
    [openAddOneOffJobModal, openAddRoundModal, openBulkMessageModal],
  )

  return {
    addRoundModalOpen,
    openAddRoundModal,
    closeAddRoundModal,
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

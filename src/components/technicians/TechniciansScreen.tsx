import { useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  ROUTES,
  technicianConversationPath,
  technicianDetailPath,
  technicianEditPath,
  technicianPhotosPath,
} from '@/config/routes'
import { techniciansContent } from '@/content/technicians'
import { useToast } from '@/components/ui/toast'
import {
  TechnicianDetail,
  TechnicianOverview,
} from '@/components/technicians/TechnicianOverview'
import { TechnicianForm } from '@/components/technicians/TechnicianForm'
import {
  PropertyPhotos,
  TechnicianConversation,
} from '@/components/technicians/TechnicianPhotos'
import {
  ApprovePhotosModal,
  RemoveTechnicianModal,
} from '@/components/technicians/TechnicianConfirmModals'

/** Route-aware frontend-only Technicians module. */
export function TechniciansScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [approveOpen, setApproveOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const newMatch = matchPath(ROUTES.technicianNew, location.pathname)
  const editMatch = matchPath(ROUTES.technicianEdit, location.pathname)
  const conversationMatch = matchPath(ROUTES.technicianConversation, location.pathname)
  const photosMatch = matchPath(ROUTES.technicianPhotos, location.pathname)
  const detailMatch = matchPath(ROUTES.technicianDetail, location.pathname)

  const technicianId =
    editMatch?.params.technicianId ??
    conversationMatch?.params.technicianId ??
    photosMatch?.params.technicianId ??
    detailMatch?.params.technicianId ??
    techniciansContent.technicians[0].id

  const technician =
    techniciansContent.technicians.find((item) => item.id === technicianId) ??
    techniciansContent.technicians[0]
  const photoJob =
    techniciansContent.photoJobs.find((job) => job.id === photosMatch?.params.photoJobId) ??
    techniciansContent.photoJobs[0]

  function approveAll() {
    setApproveOpen(false)
    showToast('All photos approved successfully.')
  }

  function removeTechnician() {
    setRemoveOpen(false)
    showToast('Technician removed from the team.')
    navigate(ROUTES.technicians, { replace: true })
  }

  let content: React.ReactNode

  if (newMatch) {
    content = (
      <TechnicianForm
        mode="add"
        onCancel={() => navigate(ROUTES.technicians)}
        onSave={() => {
          showToast('Technician added successfully.')
          navigate(ROUTES.technicians)
        }}
        onRemove={() => undefined}
      />
    )
  } else if (editMatch) {
    content = (
      <TechnicianForm
        mode="edit"
        technician={technician}
        onCancel={() => navigate(technicianDetailPath(technician.id))}
        onSave={() => {
          showToast('Technician details updated.')
          navigate(technicianDetailPath(technician.id))
        }}
        onRemove={() => setRemoveOpen(true)}
      />
    )
  } else if (photosMatch) {
    content = (
      <PropertyPhotos
        technician={technician}
        job={photoJob}
        onBack={() => navigate(technicianConversationPath(technician.id))}
        onApproveAll={() => setApproveOpen(true)}
      />
    )
  } else if (conversationMatch) {
    content = (
      <TechnicianConversation
        technician={technician}
        jobs={techniciansContent.photoJobs}
        onBack={() => navigate(technicianDetailPath(technician.id))}
        onOpenJob={(jobId) => navigate(technicianPhotosPath(technician.id, jobId))}
        onApproveAll={() => setApproveOpen(true)}
      />
    )
  } else if (detailMatch) {
    content = (
      <TechnicianDetail
        technician={technician}
        onBack={() => navigate(ROUTES.technicians)}
        onEdit={() => navigate(technicianEditPath(technician.id))}
        onConversation={() => navigate(technicianConversationPath(technician.id))}
      />
    )
  } else {
    content = (
      <TechnicianOverview
        technicians={techniciansContent.technicians}
        onAdd={() => navigate(ROUTES.technicianNew)}
        onDetails={(id) => navigate(technicianDetailPath(id))}
        onConversation={(id) => navigate(technicianConversationPath(id))}
      />
    )
  }

  return (
    <>
      {content}
      <ApprovePhotosModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={approveAll}
      />
      <RemoveTechnicianModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={removeTechnician}
      />
    </>
  )
}

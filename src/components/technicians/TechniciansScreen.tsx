import { useMemo, useState } from 'react'
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
import {
  TechnicianForm,
  toCreateInput,
  toUpdateInput,
  type TechnicianFormValues,
} from '@/components/technicians/TechnicianForm'
import {
  PropertyPhotos,
  TechnicianConversation,
} from '@/components/technicians/TechnicianPhotos'
import {
  ApprovePhotosModal,
  RemoveTechnicianModal,
} from '@/components/technicians/TechnicianConfirmModals'
import {
  TechnicianDetailSkeleton,
  TechnicianFormSkeleton,
} from '@/components/technicians/TechniciansSkeletons'
import {
  useCreateTechnician,
  useSendTechnicianInvite,
  useTechnician,
  useTechniciansList,
  useUpdateTechnician,
} from '@/features/technicians/hooks/useTechnicians'
import {
  formatOverviewDate,
  overviewMetricsFromList,
  technicianDetailToUi,
  technicianListToUi,
} from '@/features/technicians/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'

/** Technicians module — list/detail/create/update via `/technicians`. */
export function TechniciansScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const [approveOpen, setApproveOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const newMatch = matchPath(ROUTES.technicianNew, location.pathname)
  const editMatch = matchPath(ROUTES.technicianEdit, location.pathname)
  const conversationMatch = matchPath(ROUTES.technicianConversation, location.pathname)
  const photosMatch = matchPath(ROUTES.technicianPhotos, location.pathname)
  const detailMatch = matchPath(ROUTES.technicianDetail, location.pathname)

  const routeTechnicianId =
    editMatch?.params.technicianId ??
    conversationMatch?.params.technicianId ??
    photosMatch?.params.technicianId ??
    detailMatch?.params.technicianId ??
    ''

  const listQuery = useTechniciansList()
  const detailQuery = useTechnician(
    routeTechnicianId,
    Boolean(routeTechnicianId) && !newMatch,
  )
  const createTechnician = useCreateTechnician()
  const updateTechnician = useUpdateTechnician()
  const sendInvite = useSendTechnicianInvite()

  const listRows = useMemo(
    () => technicianListToUi(listQuery.data),
    [listQuery.data],
  )
  const metrics = useMemo(
    () => overviewMetricsFromList(listQuery.data),
    [listQuery.data],
  )

  const detailUi = technicianDetailToUi(detailQuery.data)
  const listFallback = listRows.find((row) => row.id === routeTechnicianId) ?? null
  const technician = detailUi ?? listFallback

  const photoJob =
    techniciansContent.photoJobs.find((job) => job.id === photosMatch?.params.photoJobId) ??
    techniciansContent.photoJobs[0]

  function approveAll() {
    setApproveOpen(false)
    showToast('All photos approved successfully.')
  }

  async function deactivateTechnician() {
    if (!canMutate || !technician || updateTechnician.isPending) return
    try {
      await updateTechnician.mutateAsync({
        id: technician.id,
        input: { active: false },
      })
      setRemoveOpen(false)
      showToast('Technician deactivated.')
      navigate(ROUTES.technicians, { replace: true })
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not deactivate technician')
    }
  }

  async function handleCreate(values: TechnicianFormValues) {
    if (!canMutate || createTechnician.isPending) return
    try {
      const created = await createTechnician.mutateAsync(toCreateInput(values))
      showToast(
        values.sendInvite
          ? 'Technician added and invite sent.'
          : 'Technician added successfully.',
      )
      navigate(technicianDetailPath(created.id))
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        showToast(error.message || 'A pending invite already exists for that email.')
        return
      }
      if (error instanceof ApiError && error.status === 503) {
        showToast('Technician saved, but invite email failed. Use Resend invite.')
        return
      }
      if (error instanceof ApiError && error.status === 400) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not add technician')
    }
  }

  async function handleUpdate(values: TechnicianFormValues) {
    if (!canMutate || !technician || updateTechnician.isPending) return
    try {
      await updateTechnician.mutateAsync({
        id: technician.id,
        input: toUpdateInput(values),
      })
      showToast('Technician details updated.')
      navigate(technicianDetailPath(technician.id))
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not update technician')
    }
  }

  async function handleResendInvite() {
    if (!canMutate || !technician || sendInvite.isPending) return
    const email = technician.email !== '—' ? technician.email.trim() : ''
    if (!email) {
      showToast('Add an email before resending an invite.')
      return
    }
    try {
      await sendInvite.mutateAsync({
        email,
        role: 'TECHNICIAN',
        technicianId: technician.id,
      })
      showToast('Invite resent.')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not resend invite')
    }
  }

  let content: React.ReactNode

  if (newMatch) {
    content = (
      <TechnicianForm
        mode="add"
        canMutate={canMutate}
        pending={createTechnician.isPending}
        onCancel={() => navigate(ROUTES.technicians)}
        onSave={handleCreate}
        onRemove={() => undefined}
      />
    )
  } else if (editMatch) {
    if (detailQuery.isPending && !technician) {
      content = <TechnicianFormSkeleton />
    } else if (!technician) {
      content = (
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted">
          <p>Technician not found.</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold underline"
            onClick={() => navigate(ROUTES.technicians)}
          >
            Back to technicians
          </button>
        </div>
      )
    } else {
      content = (
        <TechnicianForm
          mode="edit"
          technician={technician}
          canMutate={canMutate}
          pending={updateTechnician.isPending}
          resendPending={sendInvite.isPending}
          onCancel={() => navigate(technicianDetailPath(technician.id))}
          onSave={handleUpdate}
          onRemove={() => setRemoveOpen(true)}
          onResendInvite={handleResendInvite}
        />
      )
    }
  } else if (photosMatch && technician) {
    content = (
      <PropertyPhotos
        technician={technician}
        job={photoJob}
        onBack={() => navigate(technicianConversationPath(technician.id))}
        onApproveAll={() => setApproveOpen(true)}
      />
    )
  } else if (conversationMatch && technician) {
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
    if (detailQuery.isPending && !technician) {
      content = <TechnicianDetailSkeleton />
    } else if (!technician) {
      content = (
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted">
          <p>Technician not found.</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold underline"
            onClick={() => navigate(ROUTES.technicians)}
          >
            Back to technicians
          </button>
        </div>
      )
    } else {
      content = (
        <TechnicianDetail
          technician={technician}
          loading={detailQuery.isFetching}
          canMutate={canMutate}
          onBack={() => navigate(ROUTES.technicians)}
          onEdit={() => navigate(technicianEditPath(technician.id))}
          onConversation={() => navigate(technicianConversationPath(technician.id))}
        />
      )
    }
  } else {
    content = (
      <TechnicianOverview
        technicians={listRows}
        metrics={metrics}
        dateLabel={formatOverviewDate()}
        loading={listQuery.isPending}
        error={
          listQuery.isError
            ? listQuery.error instanceof ApiError && listQuery.error.status === 403
              ? 'You don’t have permission to view technicians.'
              : 'Could not load technicians.'
            : null
        }
        canMutate={canMutate}
        onRetry={() => void listQuery.refetch()}
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
        pending={updateTechnician.isPending}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => void deactivateTechnician()}
      />
    </>
  )
}

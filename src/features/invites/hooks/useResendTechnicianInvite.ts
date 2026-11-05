import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invitesApi } from '@/api/invites.api'
import { pendingInviteContent } from '@/content/round-planner'
import { invalidateTechnicians } from '@/lib/query-keys'

export type ResendTechnicianInviteInput = {
  technicianId: string
  /** Needed only when the technician has no invite yet (one is created instead). */
  email?: string | null
}

/**
 * "Resend invite" for a PENDING_INVITE technician (GAP-011). Resends their open invite
 * (`POST /invites/:id/resend`) — a fresh `POST /invites` would 409 while one is pending.
 * With no invite on file yet, one is created from the technician's email.
 */
export async function resendTechnicianInvite({ technicianId, email }: ResendTechnicianInviteInput) {
  const invites = await invitesApi.list()
  const open = invites.find((invite) => invite.technicianId === technicianId)
  if (open) return invitesApi.resend(open.id)
  if (!email?.trim()) throw new Error(pendingInviteContent.noEmail)
  return invitesApi.create({ email: email.trim(), role: 'TECHNICIAN', technicianId })
}

export function useResendTechnicianInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: resendTechnicianInvite,
    // The picker shows its own toast with the server's message.
    meta: { silenceGlobalError: true },
    onSuccess: () => invalidateTechnicians(queryClient),
  })
}

import { pendingInviteContent as copy } from '@/content/round-planner'
import { useToast } from '@/components/ui/toast'
import { useResendTechnicianInvite } from '@/features/invites/hooks/useResendTechnicianInvite'
import { errorMessage } from '@/lib/errors'
import { cn, fillCopy } from '@/lib/utils'

/**
 * "Invite pending · Resend invite" for a technician who can't be assigned yet (GAP-011).
 * Rendered next to their (disabled) entry in every technician picker.
 */
export function PendingInviteResend({
  technician,
  className,
}: {
  technician: { id: string; name?: string | null; email?: string | null }
  className?: string
}) {
  const { showToast } = useToast()
  const resend = useResendTechnicianInvite()

  async function handleResend() {
    try {
      await resend.mutateAsync({ technicianId: technician.id, email: technician.email })
      showToast(fillCopy(copy.resent, { name: technician.name || technician.email || '' }))
    } catch (error) {
      showToast(errorMessage(error), { tone: 'error' })
    }
  }

  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs', className)}>
      <span className="font-medium text-warning-foreground" title={copy.hint}>
        {copy.badge}
      </span>
      <span className="text-muted">{copy.hint}</span>
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resend.isPending}
        className="font-semibold text-primary underline underline-offset-2 disabled:opacity-60"
      >
        {resend.isPending ? copy.resending : copy.resend}
      </button>
    </span>
  )
}

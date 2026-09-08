import { useEffect, useMemo, useState } from 'react'
import { complaintsContent } from '@/content/complaints'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Input } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { cn } from '@/lib/utils'

interface AssignTechnicianModalProps {
  open: boolean
  currentTechnicianId: string | null
  onClose: () => void
  onAssign: (technicianId: string) => void
  assigning?: boolean
}

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

/** Searchable technician picker for a complaint — real technicians only, excludes pending invites. */
export function AssignTechnicianModal({
  open,
  currentTechnicianId,
  onClose,
  onAssign,
  assigning = false,
}: AssignTechnicianModalProps) {
  const content = complaintsContent.assignTechnician
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(currentTechnicianId ?? '')

  const techniciansQuery = useTechniciansList(open)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelectedId(currentTechnicianId ?? '')
  }, [currentTechnicianId, open])

  const technicians = useMemo(() => {
    const all = (techniciansQuery.data ?? []).filter(
      (technician) => technician.appStatus !== 'PENDING_INVITE',
    )
    const query = search.trim().toLowerCase()
    if (!query) return all
    return all.filter((technician) => (technician.name ?? '').toLowerCase().includes(query))
  }, [techniciansQuery.data, search])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={content.title}
      subtitle={content.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      className="rounded-2xl"
      headerClassName="pl-16"
      bodyClassName="space-y-3"
      footer={
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            {content.cancel}
          </button>
          <button
            type="button"
            disabled={!selectedId || assigning}
            onClick={() => onAssign(selectedId)}
            className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {assigning ? 'Assigning…' : content.assign}
          </button>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <DashboardIcon name="user" className="h-5 w-5" />
      </span>

      <div className="relative">
        <DashboardIcon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <Input
          inputSize="sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={content.searchPlaceholder}
          className="bg-surface pl-10"
        />
      </div>

      <div className="space-y-2">
        {techniciansQuery.isPending ? (
          <p className="px-3 py-6 text-center text-xs text-muted">Loading technicians…</p>
        ) : technicians.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted">{content.empty}</p>
        ) : (
          technicians.map((technician) => {
            const id = technician.id
            const name = technician.name ?? 'Unnamed technician'
            const selected = id === selectedId
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  selected ? 'bg-accent-surface' : 'hover:bg-surface',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-card',
                  )}
                >
                  {initialsFor(name)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {technician.role ?? '—'}
                    {technician.appStatus === 'INACTIVE' ? ' · Inactive' : ''}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </Modal>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { complaintsContent } from '@/content/complaints'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Input } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

interface AssignTechnicianModalProps {
  open: boolean
  currentTechnician: string
  onClose: () => void
  onAssign: (technician: string) => void
}

/** Searchable technician picker for a complaint. */
export function AssignTechnicianModal({
  open,
  currentTechnician,
  onClose,
  onAssign,
}: AssignTechnicianModalProps) {
  const content = complaintsContent.assignTechnician
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState(currentTechnician)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelectedName(currentTechnician)
  }, [currentTechnician, open])

  const technicians = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return content.technicians
    return content.technicians.filter((technician) =>
      `${technician.name} ${technician.rounds}`.toLowerCase().includes(query),
    )
  }, [content.technicians, search])

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
            disabled={!selectedName}
            onClick={() => onAssign(selectedName)}
            className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {content.assign}
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
        {technicians.map((technician) => {
          const selected = technician.name === selectedName
          return (
            <button
              key={technician.id}
              type="button"
              onClick={() => setSelectedName(technician.name)}
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
                {technician.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {technician.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {technician.rounds}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

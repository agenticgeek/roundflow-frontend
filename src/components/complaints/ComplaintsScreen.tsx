import { useEffect, useMemo, useState } from 'react'
import type { Complaint, ComplaintMessage, ComplaintStatus } from '@/api/complaints.api'
import {
  complaintSeverityLabels,
  complaintStatusLabels,
  complaintsContent,
} from '@/content/complaints'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import {
  LogComplaintModal,
  type NewComplaintValues,
} from '@/components/complaints/LogComplaintModal'
import { AssignTechnicianModal } from '@/components/complaints/AssignTechnicianModal'
import { ResolveComplaintModal } from '@/components/complaints/ResolveComplaintModal'
import { Input } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  useAddComplaintMessage,
  useAssignComplaintTechnician,
  useComplaintMessages,
  useComplaints,
  useCreateComplaint,
  useMarkComplaintInReview,
  useReopenComplaint,
  useResolveComplaint,
  useScheduleComplaintRevisit,
} from '@/features/complaints/hooks/useComplaints'
import { useCustomer } from '@/features/customers/hooks/useCustomers'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError, errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const statusTone: Record<ComplaintStatus, string> = {
  OPEN: 'text-warning',
  IN_REVIEW: 'text-primary',
  REVISIT_BOOKED: 'text-danger',
  RESOLVED: 'text-success',
}

const statusBadge: Record<ComplaintStatus, string> = {
  OPEN: 'bg-warning-surface text-warning-foreground',
  IN_REVIEW: 'bg-primary/10 text-primary',
  REVISIT_BOOKED: 'bg-danger/10 text-danger',
  RESOLVED: 'bg-success/10 text-success',
}

const severityBadge: Record<string, string> = {
  LOW: 'bg-surface text-muted',
  MEDIUM: 'bg-warning-surface text-warning-foreground',
  HIGH: 'bg-danger/10 text-danger',
}

type ComplaintFilter = (typeof complaintsContent.filters)[number]['id']
type DetailTab = 'messages' | 'details'

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Complaints workspace — list, split-panel detail, and all status-transition actions. */
export function ComplaintsScreen() {
  const { showToast } = useToast()
  const { canMutate, me } = useAppBootstrap()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ComplaintFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('messages')
  const [reply, setReply] = useState('')
  /** Resolution notes are rendered client-side only — the API has no message for them. */
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const debouncedSearch = useDebouncedValue(search, 300)

  const complaintsQuery = useComplaints({
    search: debouncedSearch.trim() || undefined,
    assignedTo: filter === 'my-work' ? 'me' : undefined,
  })
  const records = complaintsQuery.data ?? []
  const selected = records.find((record) => record.id === selectedId) ?? null

  const techniciansQuery = useTechniciansList()
  const technicianNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const technician of techniciansQuery.data ?? []) {
      if (technician.id) map.set(technician.id, technician.name ?? 'Unnamed technician')
    }
    return map
  }, [techniciansQuery.data])

  const customerQuery = useCustomer(selected?.customerId ?? '', Boolean(selected))
  const messagesQuery = useComplaintMessages(selected?.id ?? '', Boolean(selected))

  const createComplaint = useCreateComplaint()
  const markInReview = useMarkComplaintInReview()
  const scheduleRevisit = useScheduleComplaintRevisit()
  const resolveComplaint = useResolveComplaint()
  const reopenComplaint = useReopenComplaint()
  const assignTechnician = useAssignComplaintTechnician()
  const addMessage = useAddComplaintMessage(selected?.id ?? '')

  useEffect(() => {
    setDetailTab('messages')
  }, [selectedId])

  async function handleCreate(values: NewComplaintValues) {
    try {
      const created = await createComplaint.mutateAsync({
        customerId: values.customerId,
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        issueType: values.issueType || undefined,
        severity: values.severity,
        propertyId: values.propertyId,
        technicianId: values.technicianId || null,
      })
      setSelectedId(created.id)
      setFilter('all')
      setModalOpen(false)
      showToast(complaintsContent.toasts.logged)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  async function handleMarkInReview() {
    if (!selected || !canMutate) return
    try {
      await markInReview.mutateAsync(selected.id)
      showToast(complaintsContent.toasts.markedInReview)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  async function handleScheduleRevisit(date: string) {
    if (!selected || !canMutate) return
    try {
      await scheduleRevisit.mutateAsync({ id: selected.id, revisitDate: date })
      showToast(complaintsContent.toasts.revisitScheduled)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        showToast(error.message || complaintsContent.revisit.invalidDate)
        return
      }
      showToast(errorMessage(error))
    }
  }

  async function handleResolve() {
    if (!selected || !canMutate) return
    try {
      await resolveComplaint.mutateAsync(selected.id)
      setResolutionNotes((current) => ({
        ...current,
        [selected.id]: complaintsContent.resolutionMessage(
          `${me?.name ?? 'You'} · ${formatDateTime(new Date().toISOString())}`,
        ),
      }))
      setResolveModalOpen(false)
      showToast(complaintsContent.toasts.resolved)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  async function handleReopen() {
    if (!selected || !canMutate) return
    try {
      await reopenComplaint.mutateAsync(selected.id)
      showToast(complaintsContent.toasts.reopened)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  async function handleAssign(technicianId: string) {
    if (!selected || !canMutate) return
    try {
      await assignTechnician.mutateAsync({ id: selected.id, technicianId })
      setAssignModalOpen(false)
      showToast(complaintsContent.toasts.assigned(technicianNameById.get(technicianId) ?? 'technician'))
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  async function sendReply() {
    const body = reply.trim()
    if (!body || !selected || !canMutate) return
    try {
      await addMessage.mutateAsync(body)
      setReply('')
      showToast(complaintsContent.toasts.replySent)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  return (
    <>
      <div className="space-y-5">
        {!selected ? (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {complaintsContent.header.title}
              </h1>
              <p className="mt-1 text-sm text-muted">{complaintsContent.header.subtitle}</p>
            </div>
          </header>
        ) : null}

        <div
          className={cn(
            'grid min-h-[38rem] gap-4',
            selected && 'xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.65fr)]',
          )}
        >
          <section
            className={cn(
              'rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5',
              selected && 'hidden xl:block',
            )}
          >
            <ComplaintListHeader
              compact={Boolean(selected)}
              canLog={canMutate}
              onLog={() => setModalOpen(true)}
            />

            <ComplaintFilters filter={filter} onChange={setFilter} />

            <div className="relative mt-4">
              <DashboardIcon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <Input
                inputSize="sm"
                aria-label="Search complaints"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={complaintsContent.searchPlaceholder}
                className="bg-surface pl-10"
              />
            </div>

            <div className="mt-4 space-y-3">
              {complaintsQuery.isPending ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-xl" />
                ))
              ) : complaintsQuery.isError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted">{complaintsContent.loadError}</p>
                  <button
                    type="button"
                    onClick={() => void complaintsQuery.refetch()}
                    className="mt-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : records.length ? (
                records.map((record) => (
                  <ComplaintCard
                    key={record.id}
                    record={record}
                    technicianName={
                      record.technicianId ? technicianNameById.get(record.technicianId) : undefined
                    }
                    selected={record.id === selectedId}
                    onClick={() => setSelectedId(record.id)}
                  />
                ))
              ) : (
                <p className="py-12 text-center text-sm text-muted">{complaintsContent.empty}</p>
              )}
            </div>
          </section>

          {selected ? (
            <ComplaintDetail
              key={selected.id}
              record={selected}
              canMutate={canMutate}
              technicianName={
                selected.technicianId ? technicianNameById.get(selected.technicianId) : undefined
              }
              customerDetail={customerQuery.data}
              customerLoading={customerQuery.isPending}
              messages={messagesQuery.data ?? []}
              messagesLoading={messagesQuery.isPending}
              messagesError={messagesQuery.isError}
              resolutionNote={resolutionNotes[selected.id]}
              tab={detailTab}
              reply={reply}
              sendingReply={addMessage.isPending}
              schedulingRevisit={scheduleRevisit.isPending}
              onTabChange={setDetailTab}
              onReplyChange={setReply}
              onSendReply={() => void sendReply()}
              onBack={() => setSelectedId(null)}
              onAssign={() => setAssignModalOpen(true)}
              onScheduleRevisit={handleScheduleRevisit}
              onMarkReview={() => void handleMarkInReview()}
              onResolve={() => setResolveModalOpen(true)}
              onReopen={() => void handleReopen()}
            />
          ) : null}
        </div>
      </div>

      <LogComplaintModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => void handleCreate(values)}
        submitting={createComplaint.isPending}
      />
      <AssignTechnicianModal
        open={assignModalOpen}
        currentTechnicianId={selected?.technicianId ?? null}
        onClose={() => setAssignModalOpen(false)}
        onAssign={(technicianId) => void handleAssign(technicianId)}
        assigning={assignTechnician.isPending}
      />
      <ResolveComplaintModal
        open={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onConfirm={() => void handleResolve()}
        resolving={resolveComplaint.isPending}
      />
    </>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

function ComplaintListHeader({
  compact,
  canLog,
  onLog,
}: {
  compact: boolean
  canLog: boolean
  onLog: () => void
}) {
  return (
    <header className={cn('flex items-start gap-3', compact ? 'justify-between' : 'justify-end')}>
      {compact ? (
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {complaintsContent.header.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {complaintsContent.header.activeSubtitle}
          </p>
        </div>
      ) : null}
      {canLog ? (
        <button
          type="button"
          onClick={onLog}
          className={cn(dashboardCtaClass, 'shrink-0 px-3 py-2 text-xs')}
        >
          <DashboardIcon name="plus" className="h-3.5 w-3.5" />
          {complaintsContent.header.action}
        </button>
      ) : null}
    </header>
  )
}

function ComplaintFilters({
  filter,
  onChange,
}: {
  filter: ComplaintFilter
  onChange: (filter: ComplaintFilter) => void
}) {
  return (
    <div className="scrollbar-none mt-5 flex gap-5 overflow-x-auto border-b border-border">
      {complaintsContent.filters.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'shrink-0 border-b-2 px-0.5 pb-2 text-xs font-semibold transition-colors',
            filter === item.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function ComplaintCard({
  record,
  technicianName,
  selected,
  onClick,
}: {
  record: Complaint
  technicianName?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]',
        selected ? 'border-primary ring-2 ring-primary/10' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className={cn('inline-flex items-center gap-1.5 font-semibold', statusTone[record.status])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {complaintStatusLabels[record.status]}
        </span>
        <time className="text-muted">{formatDate(record.createdAt)}</time>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{record.title}</h3>
      <p className="mt-2 text-xs text-muted">{record.customerName}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <DashboardIcon name="user" className="h-3.5 w-3.5" />
          {technicianName ?? complaintsContent.detail.unassigned}
        </span>
        <span className="inline-flex items-center gap-1" title="Messages (count not yet available)">
          <DashboardIcon name="message" className="h-3.5 w-3.5" />
        </span>
        {record.status === 'REVISIT_BOOKED' && record.revisitDate ? (
          <span className="inline-flex items-center gap-1">
            <DashboardIcon name="calendar" className="h-3.5 w-3.5" />
            {formatDate(record.revisitDate)}
          </span>
        ) : null}
        <span className={cn('ml-auto rounded-full px-2 py-0.5 font-semibold', severityBadge[record.severity])}>
          {complaintSeverityLabels[record.severity]}
        </span>
      </div>
    </button>
  )
}

interface ComplaintDetailProps {
  record: Complaint
  canMutate: boolean
  technicianName?: string
  customerDetail?: {
    customer?: { phone?: string | null; email?: string | null }
    property?: { addressLine?: string; postcode?: string } | null
  }
  customerLoading: boolean
  messages: ComplaintMessage[]
  messagesLoading: boolean
  messagesError: boolean
  resolutionNote?: string
  tab: DetailTab
  reply: string
  sendingReply: boolean
  schedulingRevisit: boolean
  onTabChange: (tab: DetailTab) => void
  onReplyChange: (value: string) => void
  onSendReply: () => void
  onBack: () => void
  onAssign: () => void
  onScheduleRevisit: (date: string) => void
  onMarkReview: () => void
  onResolve: () => void
  onReopen: () => void
}

function ComplaintDetail({
  record,
  canMutate,
  technicianName,
  customerDetail,
  customerLoading,
  messages,
  messagesLoading,
  messagesError,
  resolutionNote,
  tab,
  reply,
  sendingReply,
  schedulingRevisit,
  onTabChange,
  onReplyChange,
  onSendReply,
  onBack,
  onAssign,
  onScheduleRevisit,
  onMarkReview,
  onResolve,
  onReopen,
}: ComplaintDetailProps) {
  const { detail } = complaintsContent
  const [schedulingOpen, setSchedulingOpen] = useState(false)
  const [revisitDate, setRevisitDate] = useState('')

  const isResolved = record.status === 'RESOLVED'
  const address = customerDetail?.property?.addressLine

  return (
    <section className="animate-slide-in-right rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
          >
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {detail.back}
          </button>

          {canMutate ? (
            <div className="flex flex-wrap gap-2">
              {isResolved ? (
                <DetailAction label={detail.actions.reopen} primary onClick={onReopen} />
              ) : (
                <>
                  <DetailAction label={detail.actions.assign} onClick={onAssign} />
                  <DetailAction
                    label={detail.actions.revisit}
                    primary
                    onClick={() => setSchedulingOpen((current) => !current)}
                  />
                  {record.status === 'OPEN' || record.status === 'REVISIT_BOOKED' ? (
                    <DetailAction label={detail.actions.review} warning onClick={onMarkReview} />
                  ) : null}
                  <DetailAction label={detail.actions.resolve} success onClick={onResolve} />
                </>
              )}
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground">{record.customerName}</h2>
          <p className="mt-1 text-sm text-muted">
            {customerLoading ? '…' : address ?? '—'} · Technician: {technicianName ?? detail.unassigned}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusBadge[record.status])}>
              {complaintStatusLabels[record.status]}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                severityBadge[record.severity],
              )}
            >
              {complaintSeverityLabels[record.severity]} priority
            </span>
          </div>
        </div>
      </div>

      {schedulingOpen ? (
        <div className="mt-5 animate-fade-in-up rounded-xl border border-primary/20 bg-accent-surface p-3">
          <label htmlFor="complaint-revisit-date" className="text-xs font-semibold text-primary">
            {complaintsContent.revisit.title}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id="complaint-revisit-date"
              type="date"
              inputSize="sm"
              value={revisitDate}
              onChange={(event) => setRevisitDate(event.target.value)}
              aria-label={complaintsContent.revisit.dateLabel}
              className="bg-card"
            />
            <button
              type="button"
              disabled={!revisitDate || schedulingRevisit}
              onClick={() => {
                onScheduleRevisit(revisitDate)
                setSchedulingOpen(false)
                setRevisitDate('')
              }}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {schedulingRevisit ? 'Saving…' : complaintsContent.revisit.confirm}
            </button>
            <button
              type="button"
              onClick={() => setSchedulingOpen(false)}
              className="px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
            >
              {complaintsContent.revisit.cancel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex gap-5 border-b border-border">
        <DetailTabButton active={tab === 'messages'} onClick={() => onTabChange('messages')}>
          {detail.messages}
        </DetailTabButton>
        <DetailTabButton active={tab === 'details'} onClick={() => onTabChange('details')}>
          {detail.details}
        </DetailTabButton>
      </div>

      {tab === 'messages' ? (
        <div className="mt-5 animate-fade-in">
          {messagesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-3/4 rounded-xl" />
            </div>
          ) : messagesError ? (
            <p className="py-6 text-center text-sm text-muted">{detail.messagesLoadError}</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <article
                  key={message.id}
                  style={{ animationDelay: `${Math.min(index * 55, 220)}ms` }}
                  className="animate-reveal-item rounded-xl bg-surface p-4"
                >
                  <p className="text-sm leading-relaxed text-foreground">{message.body}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    <span className="font-semibold text-foreground">
                      {message.direction === 'INBOUND' ? record.customerName : 'RoundFlow Team'}
                    </span>
                    <span className="mx-2">·</span>
                    {formatDateTime(message.createdAt)}
                  </p>
                </article>
              ))}
              {resolutionNote ? (
                <article className="animate-reveal-item rounded-xl border border-success/20 bg-success/10 p-4">
                  <p className="text-sm leading-relaxed font-semibold text-success">{resolutionNote}</p>
                </article>
              ) : null}
              {messages.length === 0 && !resolutionNote ? (
                <p className="py-6 text-center text-sm text-muted">No messages yet.</p>
              ) : null}
            </div>
          )}

          {canMutate && !isResolved ? (
            <div className="mt-8">
              <label htmlFor="complaint-reply" className="text-xs font-semibold text-foreground">
                {detail.replyLabel}
              </label>
              <div className="mt-2 flex items-stretch gap-2">
                <textarea
                  id="complaint-reply"
                  value={reply}
                  onChange={(event) => onReplyChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.ctrlKey && event.key === 'Enter') onSendReply()
                  }}
                  placeholder={detail.replyPlaceholder}
                  className="min-h-24 flex-1 resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
                />
                <button
                  type="button"
                  aria-label="Send reply"
                  disabled={!reply.trim() || sendingReply}
                  onClick={onSendReply}
                  className={cn(
                    dashboardPressableClass,
                    'flex w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <DashboardIcon name="send" className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted">{detail.replyHint}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <ComplaintDetails
          record={record}
          technicianName={technicianName}
          customerDetail={customerDetail}
          customerLoading={customerLoading}
        />
      )}
    </section>
  )
}

function DetailAction({
  label,
  onClick,
  primary,
  warning,
  success,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  warning?: boolean
  success?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardPressableClass,
        'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
        primary && 'border-primary bg-primary text-primary-foreground',
        warning && 'border-warning-border bg-card text-warning',
        success && 'border-success/20 bg-success/10 text-success',
        !primary && !warning && !success && 'border-primary/40 bg-card text-primary',
      )}
    >
      {label}
    </button>
  )
}

function DetailTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 pb-2 text-xs font-semibold',
        active ? 'border-primary text-foreground' : 'border-transparent text-muted',
      )}
    >
      {children}
    </button>
  )
}

function ComplaintDetails({
  record,
  technicianName,
  customerDetail,
  customerLoading,
}: {
  record: Complaint
  technicianName?: string
  customerDetail?: ComplaintDetailProps['customerDetail']
  customerLoading: boolean
}) {
  const { detail } = complaintsContent
  const loadingValue = customerLoading ? '…' : detail.notSupplied

  const rows = [
    { label: detail.fields.issueType, value: record.issueType ?? '—' },
    { label: detail.fields.priority, value: complaintSeverityLabels[record.severity] },
    { label: detail.fields.dateReported, value: formatDate(record.createdAt) },
    { label: detail.fields.technicianAssigned, value: technicianName ?? detail.unassigned },
    { label: detail.fields.customerPhone, value: customerDetail?.customer?.phone || loadingValue },
    { label: detail.fields.customerEmail, value: customerDetail?.customer?.email || loadingValue },
    {
      label: detail.fields.propertyAddress,
      value: customerDetail?.property?.addressLine || loadingValue,
      className: 'sm:col-start-1',
    },
  ]

  return (
    <dl className="mt-8 grid animate-fade-in gap-x-12 gap-y-8 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className={row.className}>
          <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
            {row.label}
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

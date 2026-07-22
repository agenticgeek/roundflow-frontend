import { useMemo, useState } from 'react'
import type {
  ComplaintPriority,
  ComplaintRecord,
  ComplaintStatus,
} from '@/content/complaints'
import {
  complaintPriorityLabels,
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
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const statusTone: Record<ComplaintStatus, string> = {
  open: 'text-warning',
  'in-review': 'text-primary',
  'revisit-booked': 'text-danger',
  resolved: 'text-success',
}

const statusBadge: Record<ComplaintStatus, string> = {
  open: 'bg-warning-surface text-warning-foreground',
  'in-review': 'bg-primary/10 text-primary',
  'revisit-booked': 'bg-danger/10 text-danger',
  resolved: 'bg-success/10 text-success',
}

const priorityBadge: Record<ComplaintPriority, string> = {
  low: 'bg-surface text-muted',
  medium: 'bg-warning-surface text-warning-foreground',
  high: 'bg-danger/10 text-danger',
}

type ComplaintFilter = (typeof complaintsContent.filters)[number]['id']
type DetailTab = 'messages' | 'details'

/** Interactive frontend-only complaints workspace. */
export function ComplaintsScreen() {
  const { showToast } = useToast()
  const [records, setRecords] = useState<ComplaintRecord[]>(() => [
    ...complaintsContent.records,
  ])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ComplaintFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('messages')
  const [reply, setReply] = useState('')

  const selected = records.find((record) => record.id === selectedId) ?? null

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    return records.filter((record) => {
      if (filter === 'my-work' && record.technician !== 'James') return false
      if (!query) return true
      return [
        record.customer,
        record.address,
        record.subject,
        record.issueType,
        record.technician,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [filter, records, search])

  function updateSelected(changes: Partial<ComplaintRecord>) {
    if (!selectedId) return
    setRecords((current) =>
      current.map((record) =>
        record.id === selectedId ? { ...record, ...changes } : record,
      ),
    )
  }

  function setStatus(status: ComplaintStatus) {
    updateSelected({ status })
    showToast(`Complaint marked ${complaintStatusLabels[status].toLowerCase()}.`)
  }

  function handleAssign(technician: string) {
    updateSelected({ technician })
    setAssignModalOpen(false)
    showToast(`Complaint assigned to ${technician}.`)
  }

  function handleScheduleRevisit(date: string) {
    updateSelected({
      status: 'revisit-booked',
      revisitDate: formatInputDate(date),
    })
    showToast('Revisit scheduled successfully.')
  }

  function handleResolve() {
    if (!selected) return
    updateSelected({
      status: 'resolved',
      messages: [
        ...selected.messages,
        {
          id: `message-${Date.now()}`,
          author: `Resolved by ${selected.technician}`,
          body: 'Issue resolved — revisit completed successfully.',
          sentAt: 'Just now',
          kind: 'system',
        },
      ],
    })
    setResolveModalOpen(false)
    showToast('Complaint resolved successfully.')
  }

  function sendReply() {
    const body = reply.trim()
    if (!body || !selected) return
    const message = {
      id: `message-${Date.now()}`,
      author: 'RoundFlow Admin',
      body,
      sentAt: 'Just now',
    }
    updateSelected({ messages: [...selected.messages, message] })
    setReply('')
    showToast('Reply sent to customer.')
  }

  function handleCreate(values: NewComplaintValues) {
    const createdAt = formatInputDate(values.visitDate) || 'Today'
    const newRecord: ComplaintRecord = {
      id: `complaint-${Date.now()}`,
      customer: values.customer.trim(),
      address: values.address.trim() || 'Address not supplied',
      phone: values.phone.trim(),
      email: values.email.trim(),
      issueType: values.issueType,
      subject: values.issueType,
      description: values.description.trim(),
      status: 'open',
      priority: values.priority,
      technician: values.technician || 'Unassigned',
      round: 'Not assigned',
      visitDate: createdAt,
      createdAt,
      messages: [
        {
          id: `message-${Date.now()}`,
          author: values.customer.trim(),
          body: values.description.trim(),
          sentAt: 'Just now',
        },
      ],
    }
    setRecords((current) => [newRecord, ...current])
    setSelectedId(newRecord.id)
    setFilter('all')
    setModalOpen(false)
    setDetailTab('messages')
    showToast('Complaint logged successfully.')
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
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <DashboardIcon name="calendar" className="h-4 w-4" />
              {complaintsContent.cycle}
            </p>
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
              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <ComplaintCard
                    key={record.id}
                    record={record}
                    selected={record.id === selectedId}
                    onClick={() => {
                      setSelectedId(record.id)
                      setDetailTab('messages')
                    }}
                  />
                ))
              ) : (
                <p className="py-12 text-center text-sm text-muted">
                  {complaintsContent.empty}
                </p>
              )}
            </div>
          </section>

          {selected ? (
            <ComplaintDetail
              key={selected.id}
              record={selected}
              tab={detailTab}
              reply={reply}
              onTabChange={setDetailTab}
              onReplyChange={setReply}
              onSendReply={sendReply}
              onBack={() => setSelectedId(null)}
              onAssign={() => setAssignModalOpen(true)}
              onScheduleRevisit={handleScheduleRevisit}
              onMarkReview={() => setStatus('in-review')}
              onResolve={() => setResolveModalOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <LogComplaintModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
      <AssignTechnicianModal
        open={assignModalOpen}
        currentTechnician={selected?.technician ?? ''}
        onClose={() => setAssignModalOpen(false)}
        onAssign={handleAssign}
      />
      <ResolveComplaintModal
        open={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onConfirm={handleResolve}
      />
    </>
  )
}

function ComplaintListHeader({ compact, onLog }: { compact: boolean; onLog: () => void }) {
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
      <button
        type="button"
        onClick={onLog}
        className={cn(dashboardCtaClass, 'shrink-0 px-3 py-2 text-xs')}
      >
        <DashboardIcon name="plus" className="h-3.5 w-3.5" />
        {complaintsContent.header.action}
      </button>
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
  selected,
  onClick,
}: {
  record: ComplaintRecord
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
        <time className="text-muted">{record.createdAt}</time>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{record.subject}</h3>
      <p className="mt-2 text-xs text-muted">
        {record.customer} · {record.address}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <DashboardIcon name="user" className="h-3.5 w-3.5" />
          {record.technician}
        </span>
        <span className="inline-flex items-center gap-1">
          <DashboardIcon name="message" className="h-3.5 w-3.5" />
          {record.messages.length}
        </span>
        {record.revisitDate ? (
          <span className="inline-flex items-center gap-1">
            <DashboardIcon name="calendar" className="h-3.5 w-3.5" />
            {record.revisitDate}
          </span>
        ) : null}
      </div>
    </button>
  )
}

interface ComplaintDetailProps {
  record: ComplaintRecord
  tab: DetailTab
  reply: string
  onTabChange: (tab: DetailTab) => void
  onReplyChange: (value: string) => void
  onSendReply: () => void
  onBack: () => void
  onAssign: () => void
  onScheduleRevisit: (date: string) => void
  onMarkReview: () => void
  onResolve: () => void
}

function ComplaintDetail({
  record,
  tab,
  reply,
  onTabChange,
  onReplyChange,
  onSendReply,
  onBack,
  onAssign,
  onScheduleRevisit,
  onMarkReview,
  onResolve,
}: ComplaintDetailProps) {
  const { detail } = complaintsContent
  const [schedulingRevisit, setSchedulingRevisit] = useState(false)
  const [revisitDate, setRevisitDate] = useState('')

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

          <div className="flex flex-wrap gap-2">
            <DetailAction label={detail.actions.assign} onClick={onAssign} />
            <DetailAction
              label={detail.actions.revisit}
              primary
              onClick={() => setSchedulingRevisit((current) => !current)}
            />
            <DetailAction label={detail.actions.review} warning onClick={onMarkReview} />
            <DetailAction label={detail.actions.resolve} success onClick={onResolve} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground">{record.customer}</h2>
          <p className="mt-1 text-sm text-muted">
            {record.address} · Technician: {record.technician}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusBadge[record.status])}>
              {complaintStatusLabels[record.status]}
            </span>
            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', priorityBadge[record.priority])}>
              {complaintPriorityLabels[record.priority]} priority
            </span>
          </div>
        </div>
      </div>

      {schedulingRevisit ? (
        <div className="mt-5 animate-fade-in-up rounded-xl border border-primary/20 bg-accent-surface p-3">
          <label
            htmlFor="complaint-revisit-date"
            className="text-xs font-semibold text-primary"
          >
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
              disabled={!revisitDate}
              onClick={() => {
                onScheduleRevisit(revisitDate)
                setSchedulingRevisit(false)
              }}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {complaintsContent.revisit.confirm}
            </button>
            <button
              type="button"
              onClick={() => setSchedulingRevisit(false)}
              className="px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
            >
              {complaintsContent.revisit.cancel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex gap-5 border-b border-border">
        <DetailTabButton
          active={tab === 'messages'}
          onClick={() => onTabChange('messages')}
        >
          {detail.messages} ({record.messages.length})
        </DetailTabButton>
        <DetailTabButton active={tab === 'details'} onClick={() => onTabChange('details')}>
          {detail.details}
        </DetailTabButton>
      </div>

      {tab === 'messages' ? (
        <div className="mt-5 animate-fade-in">
          <div className="space-y-3">
            {record.messages.map((message, index) => (
              <article
                key={message.id}
                style={{ animationDelay: `${Math.min(index * 55, 220)}ms` }}
                className={cn(
                  'animate-reveal-item rounded-xl p-4',
                  message.kind === 'system'
                    ? 'border border-success/20 bg-success/10'
                    : 'bg-surface',
                )}
              >
                <p
                  className={cn(
                    'text-sm leading-relaxed',
                    message.kind === 'system'
                      ? 'font-semibold text-success'
                      : 'text-foreground',
                  )}
                >
                  {message.body}
                </p>
                <p className="mt-2 text-[11px] text-muted">
                  <span
                    className={cn(
                      'font-semibold',
                      message.kind === 'system' ? 'text-success' : 'text-foreground',
                    )}
                  >
                    {message.author}
                  </span>
                  <span className="mx-2">·</span>
                  {message.sentAt}
                </p>
              </article>
            ))}
          </div>

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
                disabled={!reply.trim()}
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
        </div>
      ) : (
        <ComplaintDetails record={record} />
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

function ComplaintDetails({ record }: { record: ComplaintRecord }) {
  const rows = [
    { label: 'Issue type', value: record.issueType },
    { label: 'Priority', value: complaintPriorityLabels[record.priority] },
    { label: 'Date reported', value: record.createdAt },
    { label: 'Technician assigned', value: record.technician },
    { label: 'Round', value: record.round },
    { label: 'Customer phone', value: record.phone || 'Not supplied' },
    { label: 'Customer email', value: record.email || 'Not supplied' },
    {
      label: 'Property address',
      value: `${record.address} · ${record.customer}`,
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

function formatInputDate(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

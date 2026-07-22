import { useMemo, useState } from 'react'
import type { TechnicianPhotoJob, TechnicianRecord } from '@/content/technicians'
import { techniciansContent } from '@/content/technicians'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
import { Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

interface TechnicianConversationProps {
  technician: TechnicianRecord
  jobs: readonly TechnicianPhotoJob[]
  onBack: () => void
  onOpenJob: (jobId: string) => void
  onApproveAll: () => void
}

export function TechnicianConversation({
  technician,
  jobs,
  onBack,
  onOpenJob,
  onApproveAll,
}: TechnicianConversationProps) {
  const content = techniciansContent.conversation
  const [search, setSearch] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(true)

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return jobs
    return jobs.filter((job) =>
      `${job.property} ${job.customer} ${job.service}`.toLowerCase().includes(query),
    )
  }, [jobs, search])

  return (
    <div className="animate-slide-in-right space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {content.back}
          </button>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">{content.title}</h1>
          <p className="mt-1 text-sm text-muted">{content.subtitle}</p>
        </div>
        <button type="button" onClick={onApproveAll} className={dashboardCtaClass}>
          {content.approveAll}
        </button>
      </header>

      <div className={cn('grid gap-6', archiveOpen && 'xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]')}>
        <section className="min-h-[36rem]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {technician.initials}
            </span>
            <div>
              <p className="font-semibold text-foreground">{technician.name.split(' ')[0]}</p>
              <p className="text-xs text-muted">
                {technician.role} <span className="ml-2 text-success">● Online</span>
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {content.messages.map((message, index) => {
              const admin = message.from === 'admin'
              const photos = index === 0 ? jobs[0]?.before.slice(0, 2) : index === 2 ? jobs[0]?.after.slice(0, 2) : []
              return (
                <article
                  key={message.id}
                  className={cn('animate-reveal-item', admin && 'ml-auto max-w-md')}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div
                    className={cn(
                      'w-fit max-w-md rounded-xl px-4 py-3 text-sm',
                      admin ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted/20 text-foreground',
                    )}
                  >
                    <p>{message.body}</p>
                    <time className={cn('mt-1 block text-[10px]', admin ? 'text-primary-foreground/70' : 'text-muted')}>
                      {message.time}
                    </time>
                  </div>
                  {photos?.length ? (
                    <div className={cn('mt-3 flex gap-2', admin && 'justify-end')}>
                      {photos.map((src) => (
                        <img key={src} src={src} alt="" className="h-24 w-28 rounded-lg object-cover" />
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>

        {archiveOpen ? (
          <aside className="animate-slide-in-right rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{content.archiveTitle}</h2>
                <p className="text-xs text-muted">{content.archiveSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveOpen(false)}
                className="inline-flex items-center gap-1 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-foreground"
              >
                {content.collapse}
                <DashboardIcon name="chevron-right" className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mt-4">
              <DashboardIcon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                inputSize="sm"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={content.search}
                className="pl-9"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Select inputSize="sm" value="30" onChange={() => undefined} options={[{ value: '30', label: 'Last 30 days' }]} />
              <Select inputSize="sm" value="all" onChange={() => undefined} options={[{ value: 'all', label: 'All rounds' }]} />
              <Select inputSize="sm" value="all" onChange={() => undefined} options={[{ value: 'all', label: 'All statuses' }]} />
            </div>

            <p className="mt-5 text-[10px] font-semibold tracking-wide text-muted uppercase">{content.recentPhotos}</p>
            <div className="mt-3 space-y-3">
              {filteredJobs.map((job) => (
                <PhotoJobCard key={job.id} job={job} onClick={() => onOpenJob(job.id)} />
              ))}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="fixed right-4 bottom-6 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            {content.archiveTitle}
          </button>
        )}
      </div>
    </div>
  )
}

function PhotoJobCard({ job, onClick }: { job: TechnicianPhotoJob; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardPressableClass,
        'w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{job.property}</p>
          <p className="text-[10px] text-muted">{job.date}</p>
        </div>
        <PhotoStatus status={job.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[job.before[0], job.after[0]].map((src, index) => (
          <div key={src}>
            <img src={src} alt="" className="h-20 w-full rounded-lg object-cover" />
            <span className="mt-1 block text-[10px] text-muted">{index ? 'After' : 'Before'}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

interface PropertyPhotosProps {
  technician: TechnicianRecord
  job: TechnicianPhotoJob
  onBack: () => void
  onApproveAll: () => void
}

export function PropertyPhotos({
  technician,
  job,
  onBack,
  onApproveAll,
}: PropertyPhotosProps) {
  const content = techniciansContent.photos

  return (
    <div className="animate-slide-in-right space-y-5">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <DashboardIcon name="chevron-left" className="h-3.5 w-3.5" />
            {content.back}
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{content.titlePrefix} - {job.property}</h1>
            <span className="rounded-full bg-warning-surface px-3 py-1 text-xs font-semibold text-warning">
              {content.pendingReview}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{job.customer} · {job.service} · {job.date}</p>
        </div>
        <button type="button" onClick={onApproveAll} className={dashboardCtaClass}>
          {content.approveAll}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.65fr)]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <PhotoGrid title={content.before} photos={job.before} flaggedIndex={2} />
            <PhotoGrid title={content.after} photos={job.after} />
          </div>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">{content.notes}</h2>
            <div className="mt-4 flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                <DashboardIcon name="message" className="h-5 w-5" />
              </span>
              <p className="text-sm leading-relaxed text-muted">{content.notesBody}</p>
            </div>
          </section>
        </div>

        <aside className="border-l border-border pl-6">
          <h2 className="text-lg font-semibold text-foreground">{content.jobDetails}</h2>
          <dl className="mt-6 space-y-5">
            <PhotoDetail label="Property" value={`${job.property}, Alnwick, NE66 1JD`} />
            <PhotoDetail label="Customer" value={job.customer} />
            <PhotoDetail label="Service" value={job.service} />
            <PhotoDetail label="Technician" value={technician.name} />
            <PhotoDetail label="Round" value="Alnwick Monday" />
            <PhotoDetail label="Scheduled" value={`${job.date} 09:00`} />
            <PhotoDetail label="Status" value="In Progress" valueClass="text-success" />
          </dl>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">{content.previousIssues}</h3>
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-danger">
              <DashboardIcon name="alert-circle" className="h-4 w-4" />
              {content.previousIssue}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button type="button" className="w-full rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary">
              {content.viewCustomer}
            </button>
            <button type="button" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground">
              {content.contact}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function PhotoGrid({ title, photos, flaggedIndex }: { title: string; photos: readonly string[]; flaggedIndex?: number }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs font-semibold text-primary">{photos.length} Total</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {photos.map((src, index) => (
          <figure key={src} className="relative">
            <img
              src={src}
              alt=""
              className={cn(
                'aspect-[4/3] w-full rounded-lg object-cover',
                flaggedIndex === index && 'ring-2 ring-danger',
              )}
            />
            {flaggedIndex === index ? (
              <span className="absolute top-2 right-2 rounded bg-danger px-2 py-1 text-[10px] font-semibold text-white">
                FLAGGED
              </span>
            ) : null}
            <figcaption className="mt-1 text-[10px] text-muted">
              {index < 2 ? '14:2' : '15:5'}{index}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function PhotoStatus({ status }: { status: TechnicianPhotoJob['status'] }) {
  const classes = {
    approved: 'bg-success/10 text-success',
    pending: 'bg-primary/10 text-primary',
    flagged: 'bg-danger/10 text-danger',
  }
  return (
    <span className={cn('rounded-lg px-2 py-1 text-[10px] font-semibold capitalize', classes[status])}>
      {status}
    </span>
  )
}

function PhotoDetail({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium text-foreground', valueClass)}>{value}</dd>
    </div>
  )
}

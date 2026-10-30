import { useState } from 'react'
import type { PerformancePeriod } from '@/api/technician-records.api'
import { Select } from '@/components/ui'
import { technicianRecordsContent } from '@/content/technician-records'
import { useTechnicianPerformance } from '@/features/technicians/hooks/useTechnicianRecords'
import { formatMinutes, formatMoneyOrDash } from '@/features/technicians/lib/records'
import { errorMessage } from '@/lib/errors'

/** Technician detail › Performance with a period select (GAP-030, GET /technicians/:id/performance). */
export function TechnicianPerformanceCard({ technicianId }: { technicianId: string }) {
  const copy = technicianRecordsContent.performance
  const [period, setPeriod] = useState<PerformancePeriod>('thisMonth')
  const query = useTechnicianPerformance(technicianId, period)
  const data = query.data

  const metrics = data
    ? [
        { label: copy.metrics.visitsCompleted, value: String(data.visitsCompleted) },
        { label: copy.metrics.revenue, value: formatMoneyOrDash(data.revenue) },
        { label: copy.metrics.timeOnJob, value: formatMinutes(data.timeOnJobMinutes) },
        { label: copy.metrics.revenuePerHour, value: formatMoneyOrDash(data.revenuePerHour) },
        { label: copy.metrics.strikes, value: String(data.strikes) },
        { label: copy.metrics.damages, value: String(data.damages) },
        { label: copy.metrics.upsells, value: String(data.upsells) },
        { label: copy.metrics.upsellValue, value: formatMoneyOrDash(data.upsellValue) },
        { label: copy.metrics.complaints, value: String(data.complaints) },
      ]
    : []

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
        <div className="w-40">
          <Select
            inputSize="sm"
            aria-label={copy.periodLabel}
            value={period}
            onChange={(event) => setPeriod(event.target.value as PerformancePeriod)}
            options={copy.periods.map(({ value, label }) => ({ value, label }))}
          />
        </div>
      </div>
      <div className="mt-5">
        {data ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">{metric.label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">{metric.value}</dd>
                </div>
              ))}
            </dl>
            {data.timeOnJobMinutes === null ? <p className="mt-4 text-xs text-muted">{copy.noTimingHint}</p> : null}
          </>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(query.error)}
          </p>
        ) : (
          <p className="text-sm text-muted">{copy.loading}</p>
        )}
      </div>
    </section>
  )
}

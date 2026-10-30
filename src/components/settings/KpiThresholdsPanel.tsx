import { useState } from 'react'
import type { KpiThreshold, KpiThresholdInput } from '@/api/settings.api'
import { settingsContent } from '@/content/settings'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { SettingsFormSkeleton } from '@/components/settings/SettingsSkeletons'
import { FieldError, Input, Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { useKpiThresholds, useSaveKpiThresholds } from '@/features/settings/hooks/useKpiThresholds'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

type Row = { key: string; metric: KpiThresholdInput['metric']; operator: KpiThresholdInput['operator']; value: string }

let rowSeq = 0
function rowKey() {
  rowSeq += 1
  return `kpi-row-${rowSeq}`
}

function toRows(thresholds: readonly KpiThreshold[]): Row[] {
  return thresholds.map((threshold) => ({
    key: threshold.id,
    metric: threshold.metric,
    operator: threshold.operator,
    value: String(threshold.value),
  }))
}

/** Whole, non-negative numbers (decimals allowed for £/hour). Null when any row is invalid. */
function toInput(rows: readonly Row[]): KpiThresholdInput[] | null {
  const inputs = rows.map((row) => ({ metric: row.metric, operator: row.operator, value: Number(row.value) }))
  const valid = rows.every((row) => row.value.trim() !== '') && inputs.every((input) => input.value >= 0)
  return valid ? inputs : null
}

/**
 * Settings › KPI thresholds (GAP-025). GET/PUT /settings/kpi-thresholds — the PUT replaces the
 * whole list. The nightly job raises one alert per technician + metric + month on a breach.
 * A duplicate metric + operator is rejected by the server (400) and its message shown here.
 */
export function KpiThresholdsPanel({ canMutate }: { canMutate: boolean }) {
  const copy = settingsContent.kpiThresholds
  const query = useKpiThresholds()
  const save = useSaveKpiThresholds()
  const { showToast } = useToast()
  /** null until the user edits — then the local list wins over the server's. */
  const [draft, setDraft] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (query.isPending) return <SettingsFormSkeleton fields={3} />
  if (query.isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm shadow-sm">
        <p className="text-foreground">{copy.loadError}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 font-semibold text-primary underline underline-offset-2"
        >
          {copy.retry}
        </button>
      </div>
    )
  }

  const rows = draft ?? toRows(query.data)

  function update(next: Row[]) {
    setDraft(next)
    setError(null)
  }

  function patch(key: string, change: Partial<Row>) {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)))
  }

  async function handleSave() {
    const input = toInput(rows)
    if (!input) return setError(copy.valueInvalid)
    try {
      await save.mutateAsync(input)
      setDraft(null)
      showToast(copy.saved)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
          <DashboardIcon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{copy.heading}</h2>
          <p className="mt-0.5 text-sm text-muted">{copy.subheading}</p>
        </div>
      </div>

      {!canMutate ? <p className="mt-4 text-sm text-muted">{copy.readOnly}</p> : null}

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{copy.empty}</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-xl border border-border px-4 py-3 sm:grid-cols-[1.4fr_1fr_8rem_2.5rem] sm:items-center"
            >
              <Select
                inputSize="sm"
                aria-label={`${copy.columns.metric} ${index + 1}`}
                value={row.metric}
                disabled={!canMutate}
                onChange={(event) => patch(row.key, { metric: event.target.value as Row['metric'] })}
                options={[...copy.metrics]}
              />
              <Select
                inputSize="sm"
                aria-label={`${copy.columns.operator} ${index + 1}`}
                value={row.operator}
                disabled={!canMutate}
                onChange={(event) => patch(row.key, { operator: event.target.value as Row['operator'] })}
                options={[...copy.operators]}
              />
              <Input
                inputSize="sm"
                inputMode="decimal"
                aria-label={`${copy.columns.value} ${index + 1}`}
                value={row.value}
                readOnly={!canMutate}
                onChange={(event) => patch(row.key, { value: event.target.value.replace(/[^0-9.]/g, '') })}
              />
              {canMutate ? (
                <button
                  type="button"
                  aria-label={`${copy.remove} ${index + 1}`}
                  onClick={() => update(rows.filter((item) => item.key !== row.key))}
                  className="justify-self-end rounded-md p-1 text-muted hover:bg-surface hover:text-danger"
                >
                  <DashboardIcon name="trash" className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? <FieldError message={error} /> : null}

      {canMutate ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update([...rows, { key: rowKey(), metric: 'strikes', operator: 'GT', value: '' }])}
            className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-surface"
          >
            {copy.add}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={save.isPending || draft === null}
            className={cn(dashboardCtaClass, 'px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60')}
          >
            {save.isPending ? copy.saving : copy.save}
          </button>
        </div>
      ) : null}
    </article>
  )
}

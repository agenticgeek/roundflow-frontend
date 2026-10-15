import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import type { PropertyDraft } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { Field, FieldError, Input, Select, Textarea } from '@/components/ui'
import { parsePropertyCsv, parsePropertyXlsx, type PropertyCsvResult } from '@/lib/property-csv'

interface ImportPropertiesPanelProps {
  roundOptions: SelectOption[]
  serviceAreaOptions: SelectOption[]
  draftDefaults: PropertyDraft
  /** Saves one property via the real endpoint (reused per row until a bulk endpoint exists). */
  onSaveProperty: (draft: PropertyDraft) => Promise<void> | void
  onClose: () => void
}

interface FailedRow {
  label: string
  error: string
}

export function ImportPropertiesPanel({
  roundOptions,
  serviceAreaOptions,
  draftDefaults,
  onSaveProperty,
  onClose,
}: ImportPropertiesPanelProps) {
  const { importCsv } = setupWizardContent.addProperty

  const [pasteText, setPasteText] = useState('')
  const [round, setRound] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [price, setPrice] = useState('')
  const [result, setResult] = useState<PropertyCsvResult | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState<FailedRow[]>([])
  const [summary, setSummary] = useState<string | null>(null)

  const roundSelectOptions = useMemo(
    () => [{ value: '', label: importCsv.roundPlaceholder }, ...roundOptions],
    [importCsv.roundPlaceholder, roundOptions],
  )

  const serviceAreaSelectOptions = useMemo(
    () => [{ value: '', label: importCsv.serviceAreaPlaceholder }, ...serviceAreaOptions],
    [importCsv.serviceAreaPlaceholder, serviceAreaOptions],
  )

  function handlePreview() {
    setFormError(null)
    setSummary(null)
    setFailed([])
    if (!pasteText.trim()) {
      setResult(null)
      setFormError(importCsv.emptyPaste)
      return
    }
    setResult(parsePropertyCsv(pasteText, draftDefaults))
  }

  function handleClear() {
    setPasteText('')
    setResult(null)
    setFormError(null)
    setSummary(null)
    setFailed([])
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset so selecting the same file again re-fires onChange.
    event.target.value = ''
    if (!file) return
    setFormError(null)
    setSummary(null)
    setFailed([])
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        // Excel is binary — parse the sheet directly; the textarea stays empty.
        setPasteText('')
        setFileName(file.name)
        setResult(await parsePropertyXlsx(file, draftDefaults))
      } else {
        const text = await file.text()
        setPasteText(text)
        setFileName(file.name)
        setResult(text.trim() ? parsePropertyCsv(text, draftDefaults) : null)
      }
    } catch {
      setResult(null)
      setFileName(null)
      setFormError(importCsv.fileError)
    }
  }

  const parsedCount = result?.properties.length ?? 0

  async function handleImport() {
    if (!result || parsedCount === 0) {
      setFormError(importCsv.noValidRows)
      return
    }
    const priceValue = Number(String(price).replace(/[^0-9.]/g, ''))
    if (!round) {
      setFormError(importCsv.roundRequired)
      return
    }
    if (!serviceArea) {
      setFormError(importCsv.serviceAreaRequired)
      return
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setFormError(importCsv.priceRequired)
      return
    }

    setFormError(null)
    setImporting(true)
    setProgress(0)
    const failures: FailedRow[] = []

    for (const [index, property] of result.properties.entries()) {
      try {
        await onSaveProperty({
          ...property.draft,
          round,
          serviceArea,
          pricePerVisit: String(priceValue),
        })
      } catch (error) {
        failures.push({
          label: property.draft.customerName || `Row ${property.rowNumber}`,
          error: error instanceof Error ? error.message : 'Save failed',
        })
      }
      setProgress(index + 1)
    }

    const added = parsedCount - failures.length
    setFailed(failures)
    setImporting(false)
    setSummary(
      failures.length === 0
        ? importCsv.done.replace('{added}', String(added))
        : importCsv.partial
            .replace('{added}', String(added))
            .replace('{total}', String(parsedCount))
            .replace('{failed}', String(failures.length)),
    )

    // Everything saved — close so the refreshed "Added properties" list shows.
    if (failures.length === 0) {
      setPasteText('')
      setResult(null)
      window.setTimeout(onClose, 900)
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{importCsv.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{importCsv.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={importing}
          className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60"
        >
          {importCsv.cancel}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(event) => void handleFile(event)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {importCsv.uploadButton}
          </button>
          {fileName ? (
            <span className="text-xs text-muted">
              {importCsv.fileSelected.replace('{name}', fileName)}
            </span>
          ) : (
            <span className="text-xs text-muted">{importCsv.orDivider}</span>
          )}
        </div>

        <Field label={importCsv.pasteLabel} labelWeight="medium" size="sm">
          <Textarea
            inputSize="sm"
            rows={7}
            value={pasteText}
            onChange={(event) => {
              setPasteText(event.target.value)
              setFileName(null)
            }}
            placeholder={importCsv.pastePlaceholder}
            className="font-mono text-xs"
            disabled={importing}
          />
        </Field>

        <Field label={importCsv.serviceAreaLabel} required labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={serviceArea}
            onChange={(event) => setServiceArea(event.target.value)}
            options={serviceAreaSelectOptions}
            disabled={importing}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={importCsv.roundLabel} required labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={round}
              onChange={(event) => setRound(event.target.value)}
              options={roundSelectOptions}
              disabled={importing}
            />
          </Field>
          <Field label={importCsv.priceLabel} required labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={importCsv.pricePlaceholder}
              disabled={importing}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {!fileName ? (
            <button
              type="button"
              onClick={handlePreview}
              disabled={importing}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {importCsv.parse}
            </button>
          ) : null}
          {pasteText || result ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={importing}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60"
            >
              {importCsv.clear}
            </button>
          ) : null}
        </div>

        {formError ? <FieldError message={formError} size="sm" /> : null}

        {result && !result.recognized ? (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            {importCsv.unrecognized}
          </p>
        ) : null}

        {result && result.recognized && parsedCount > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <p className="border-b border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground">
              {importCsv.readyTitle} ({parsedCount})
            </p>
            <div className="max-h-52 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface text-muted">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">{importCsv.columns.name}</th>
                    <th className="px-3 py-1.5 font-medium">{importCsv.columns.address}</th>
                    <th className="px-3 py-1.5 font-medium">{importCsv.columns.postcode}</th>
                    <th className="px-3 py-1.5 font-medium">{importCsv.columns.phone}</th>
                    <th className="px-3 py-1.5 font-medium">{importCsv.columns.email}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.properties.map((property) => (
                    <tr key={property.rowNumber}>
                      <td className="px-3 py-1.5 text-foreground">{property.draft.customerName}</td>
                      <td className="px-3 py-1.5 text-muted">{property.draft.fullAddress}</td>
                      <td className="px-3 py-1.5 text-muted">{property.draft.postcode}</td>
                      <td className="px-3 py-1.5 text-muted">{property.draft.phone || '—'}</td>
                      <td className="px-3 py-1.5 text-muted">{property.draft.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {result && result.skipped.length > 0 ? (
          <details className="rounded-lg border border-border bg-background px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-warning">
              {importCsv.skippedTitle} ({result.skipped.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {result.skipped.map((row) => (
                <li key={row.rowNumber}>
                  <span className="font-medium text-foreground">{row.label}</span> — {row.reason}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {failed.length > 0 ? (
          <details open className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-danger">
              {importCsv.failedTitle} ({failed.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {failed.map((row, index) => (
                <li key={`${row.label}-${index}`}>
                  <span className="font-medium text-foreground">{row.label}</span> — {row.error}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {summary ? <p className="text-sm font-medium text-foreground">{summary}</p> : null}

        {parsedCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {importing
              ? importCsv.importing
                  .replace('{done}', String(progress))
                  .replace('{total}', String(parsedCount))
              : importCsv.importButton.replace('{count}', String(parsedCount))}
          </button>
        ) : null}
      </div>
    </div>
  )
}

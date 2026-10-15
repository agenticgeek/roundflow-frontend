import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { PropertyDraft } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { Field, FieldError, Input, MultiSelect, Select, Textarea } from '@/components/ui'
import { parsePropertyCsv, parsePropertyXlsx, type PropertyCsvResult } from '@/lib/property-csv'

/** Sum the catalogue prices of the given services (missing prices count as 0). */
function sumServicePrices(ids: readonly string[], prices: Readonly<Record<string, number>>): number {
  return ids.reduce((total, id) => total + (prices[id] ?? 0), 0)
}

interface ImportPropertiesPanelProps {
  roundOptions: SelectOption[]
  serviceAreaOptions: SelectOption[]
  /** Catalogue services the user can assign per row. */
  serviceOptions: SelectOption[]
  /** Catalogue default price per service id — prefills a row's price when its service is picked. */
  servicePrices: Readonly<Record<string, number>>
  draftDefaults: PropertyDraft
  /** Saves one property via the real endpoint (reused per row until a bulk endpoint exists). */
  onSaveProperty: (draft: PropertyDraft) => Promise<void> | void
  onClose: () => void
}

interface FailedRow {
  label: string
  error: string
}

/** Per-row services + price the user can edit before importing. */
interface RowEdit {
  serviceIds: string[]
  price: string
  /** True once the user typed a custom price, so service toggles stop overwriting it. */
  priceEdited: boolean
}

export function ImportPropertiesPanel({
  roundOptions,
  serviceAreaOptions,
  serviceOptions,
  servicePrices,
  draftDefaults,
  onSaveProperty,
  onClose,
}: ImportPropertiesPanelProps) {
  const { importCsv } = setupWizardContent.addProperty

  const [pasteText, setPasteText] = useState('')
  const [round, setRound] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [rowEdits, setRowEdits] = useState<Record<number, RowEdit>>({})
  // Rows the user crossed off in the preview — kept out of the import.
  const [removedRows, setRemovedRows] = useState<Set<number>>(new Set())
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

  const serviceLabelById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const option of serviceOptions) map[option.value] = option.label
    return map
  }, [serviceOptions])

  function rowPriceFor(serviceIds: string[], previous?: RowEdit): string {
    if (previous?.priceEdited) return previous.price
    return serviceIds.length > 0 ? String(sumServicePrices(serviceIds, servicePrices)) : ''
  }

  // Seed one editable row per parsed property whenever the parsed set changes,
  // applying the currently selected services filter.
  const rowKey = result ? result.properties.map((property) => property.rowNumber).join(',') : ''
  useEffect(() => {
    setRemovedRows(new Set())
    if (!result) {
      setRowEdits({})
      return
    }
    const seeded: Record<number, RowEdit> = {}
    for (const property of result.properties) {
      const serviceIds = [...selectedServiceIds]
      seeded[property.rowNumber] = {
        serviceIds,
        price: rowPriceFor(serviceIds),
        priceEdited: false,
      }
    }
    setRowEdits(seeded)
    // Reseed only when the parsed rows change — filter changes are applied via
    // applyServiceFilter so custom prices survive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKey])

  /** The filter sets which services are available; re-seed every row to that set. */
  function applyServiceFilter(nextIds: string[]) {
    setSelectedServiceIds(nextIds)
    if (!result) return
    setRowEdits((prev) => {
      const next = { ...prev }
      for (const property of result.properties) {
        const current = prev[property.rowNumber]
        const serviceIds = [...nextIds]
        next[property.rowNumber] = {
          serviceIds,
          price: rowPriceFor(serviceIds, current),
          priceEdited: current?.priceEdited ?? false,
        }
      }
      return next
    })
  }

  function toggleRowService(rowNumber: number, serviceId: string) {
    setRowEdits((prev) => {
      const current = prev[rowNumber] ?? { serviceIds: [...selectedServiceIds], price: '', priceEdited: false }
      const serviceIds = current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId]
      return {
        ...prev,
        [rowNumber]: { ...current, serviceIds, price: rowPriceFor(serviceIds, current) },
      }
    })
  }

  function setRowPrice(rowNumber: number, price: string) {
    setRowEdits((prev) => ({
      ...prev,
      [rowNumber]: {
        ...(prev[rowNumber] ?? { serviceIds: [...selectedServiceIds], price: '', priceEdited: false }),
        price,
        priceEdited: true,
      },
    }))
  }

  function toggleRowRemoved(rowNumber: number) {
    setRemovedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) next.delete(rowNumber)
      else next.add(rowNumber)
      return next
    })
  }

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
    setRowEdits({})
    setRemovedRows(new Set())
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

  // Parsed rows the user hasn't crossed off — the set that actually imports.
  const activeProperties = result
    ? result.properties.filter((property) => !removedRows.has(property.rowNumber))
    : []
  const parsedTotal = result?.properties.length ?? 0
  const activeCount = activeProperties.length

  function rowPriceValue(rowNumber: number): number {
    return Number(String(rowEdits[rowNumber]?.price ?? '').replace(/[^0-9.]/g, ''))
  }

  async function handleImport() {
    if (!result || activeCount === 0) {
      setFormError(importCsv.noValidRows)
      return
    }
    if (!round) {
      setFormError(importCsv.roundRequired)
      return
    }
    if (!serviceArea) {
      setFormError(importCsv.serviceAreaRequired)
      return
    }
    const anyInvalidPrice = activeProperties.some((property) => {
      const value = rowPriceValue(property.rowNumber)
      return !Number.isFinite(value) || value <= 0
    })
    if (anyInvalidPrice) {
      setFormError(importCsv.allPricesRequired)
      return
    }

    setFormError(null)
    setImporting(true)
    setProgress(0)
    const failures: FailedRow[] = []

    for (const [index, property] of activeProperties.entries()) {
      const edit = rowEdits[property.rowNumber] ?? { serviceIds: [], price: '', priceEdited: false }
      try {
        await onSaveProperty({
          ...property.draft,
          round,
          serviceArea,
          serviceIds: edit.serviceIds,
          serviceId: edit.serviceIds[0] ?? '',
          pricePerVisit: String(rowPriceValue(property.rowNumber)),
        })
      } catch (error) {
        failures.push({
          label: property.draft.customerName || `Row ${property.rowNumber}`,
          error: error instanceof Error ? error.message : 'Save failed',
        })
      }
      setProgress(index + 1)
    }

    const added = activeCount - failures.length
    setFailed(failures)
    setImporting(false)
    setSummary(
      failures.length === 0
        ? importCsv.done.replace('{added}', String(added))
        : importCsv.partial
            .replace('{added}', String(added))
            .replace('{total}', String(activeCount))
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={importCsv.serviceAreaLabel} required labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={serviceArea}
              onChange={(event) => setServiceArea(event.target.value)}
              options={serviceAreaSelectOptions}
              disabled={importing}
            />
          </Field>
          <Field label={importCsv.roundLabel} required labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={round}
              onChange={(event) => setRound(event.target.value)}
              options={roundSelectOptions}
              disabled={importing}
            />
          </Field>
        </div>

        {serviceOptions.length > 0 ? (
          <Field label={importCsv.servicesFilterLabel} labelWeight="medium" size="sm">
            <MultiSelect
              inputSize="sm"
              label={importCsv.servicesFilterPlaceholder}
              placeholder={importCsv.servicesFilterPlaceholder}
              displayMode="values"
              showAllOption
              value={selectedServiceIds}
              options={serviceOptions}
              onChange={applyServiceFilter}
              disabled={importing}
            />
          </Field>
        ) : null}

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

        {result && result.recognized && parsedTotal > 0 ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">{importCsv.customizeHint}</p>

            <div className="overflow-hidden rounded-lg border border-border bg-background">
              <p className="border-b border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground">
                {importCsv.readyTitle} ({activeCount}
                {activeCount !== parsedTotal ? ` of ${parsedTotal}` : ''})
              </p>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface text-muted">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">{importCsv.columns.name}</th>
                      <th className="px-3 py-1.5 font-medium">{importCsv.columns.address}</th>
                      <th className="px-3 py-1.5 font-medium">{importCsv.columns.postcode}</th>
                      {serviceOptions.length > 0 ? (
                        <th className="px-3 py-1.5 font-medium">{importCsv.columns.service}</th>
                      ) : null}
                      <th className="px-3 py-1.5 font-medium">{importCsv.columns.price}</th>
                      <th className="px-3 py-1.5" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeProperties.map((property) => {
                      const edit =
                        rowEdits[property.rowNumber] ??
                        ({ serviceIds: [], price: '', priceEdited: false } as RowEdit)
                      return (
                        <tr key={property.rowNumber}>
                          <td className="px-3 py-1.5 align-top text-foreground">
                            {property.draft.customerName}
                          </td>
                          <td className="px-3 py-1.5 align-top text-muted">
                            {property.draft.fullAddress}
                          </td>
                          <td className="px-3 py-1.5 align-top text-muted">
                            {property.draft.postcode}
                          </td>
                          {serviceOptions.length > 0 ? (
                            <td className="px-3 py-1.5 align-top">
                              {selectedServiceIds.length === 0 ? (
                                <span className="text-[11px] text-muted">
                                  {importCsv.noServicesHint}
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {selectedServiceIds.map((serviceId) => (
                                    <label
                                      key={serviceId}
                                      className="inline-flex items-center gap-1.5 text-foreground"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={edit.serviceIds.includes(serviceId)}
                                        onChange={() =>
                                          toggleRowService(property.rowNumber, serviceId)
                                        }
                                        disabled={importing}
                                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                                      />
                                      <span className="whitespace-nowrap">
                                        {serviceLabelById[serviceId] ?? serviceId}
                                        {servicePrices[serviceId] != null ? (
                                          <span className="text-muted">
                                            {' '}
                                            (£{servicePrices[serviceId]})
                                          </span>
                                        ) : null}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </td>
                          ) : null}
                          <td className="px-3 py-1.5 align-top">
                            <Input
                              inputSize="sm"
                              inputMode="decimal"
                              value={edit.price}
                              onChange={(event) =>
                                setRowPrice(property.rowNumber, event.target.value)
                              }
                              placeholder={importCsv.pricePlaceholder}
                              disabled={importing}
                              className="w-24"
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <button
                              type="button"
                              onClick={() => toggleRowRemoved(property.rowNumber)}
                              disabled={importing}
                              aria-label={`Remove ${property.draft.customerName || 'property'}`}
                              title="Remove from import"
                              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {removedRows.size > 0 ? (
                <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted">
                  <span>{removedRows.size} removed from this import</span>
                  <button
                    type="button"
                    onClick={() => setRemovedRows(new Set())}
                    disabled={importing}
                    className="font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Restore all
                  </button>
                </div>
              ) : null}
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

        {parsedTotal > 0 ? (
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing || activeCount === 0}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {importing
              ? importCsv.importing
                  .replace('{done}', String(progress))
                  .replace('{total}', String(activeCount))
              : importCsv.importButton.replace('{count}', String(activeCount))}
          </button>
        ) : null}
      </div>
    </div>
  )
}

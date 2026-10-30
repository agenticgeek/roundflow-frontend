import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { ImportPropertiesPanel, type BulkSaveResult } from '@/components/setup-wizard/ImportPropertiesPanel'
import { setupWizardContent } from '@/content/setup-wizard'
import { parsePropertyCsv } from '@/lib/property-csv'
import type { PropertyDraft } from '@/types/setup-wizard'
import { renderWithProviders } from '@/test/render'

const draftDefaults = setupWizardContent.addProperty.draftDefaults as PropertyDraft

const HEADER = 'First name,Last name,Mobile phone,Service street 1,Service city,Service postcode'
const csv = [
  HEADER,
  'Oliver,Clarke,07500 208733,63 Manor Road,Alnwick,NE66 1TD',
  'No,Phone,,1 High Street,Alnwick,NE66 1AA',
  'Bad,Phone,12ab,2 High Street,Alnwick,NE66 1AB',
].join('\n')

describe('parsePropertyCsv (GAP-009)', () => {
  it('a missing or invalid mobile is a row error, as on the single-add form', () => {
    const result = parsePropertyCsv(csv, draftDefaults)
    expect(result.properties.map((row) => row.draft.phone)).toEqual(['07500 208733'])
    expect(result.skipped.map((row) => row.reason)).toEqual(['No mobile number', 'Invalid mobile number "12ab"'])
  })
})

describe('ImportPropertiesPanel (GAP-009)', () => {
  it('imports with the round’s frequency and an indeterminate bar until the first chunk returns', async () => {
    let finish: (value: BulkSaveResult) => void = () => {}
    const onSaveProperties = vi.fn(
      () => new Promise<BulkSaveResult>((resolve) => {
        finish = resolve
      }),
    )
    const { user } = renderWithProviders(
      <ImportPropertiesPanel
        roundOptions={[{ value: 'r6', label: 'Amble 6-weekly' }]}
        roundFrequencies={{ r6: 'SIX_WEEKLY' }}
        serviceAreaOptions={[{ value: 'a1', label: 'Alnwick' }]}
        serviceOptions={[]}
        servicePrices={{}}
        draftDefaults={draftDefaults}
        onSaveProperty={vi.fn()}
        onSaveProperties={onSaveProperties}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/First name/), { target: { value: csv } })
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByText(/No mobile number/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select a service area' }))
    await user.click(screen.getByRole('option', { name: 'Alnwick' }))
    await user.click(screen.getByRole('button', { name: 'Select a round' }))
    await user.click(screen.getByRole('option', { name: 'Amble 6-weekly' }))
    await user.type(screen.getByPlaceholderText('e.g. 20'), '18')
    await user.click(screen.getByRole('button', { name: 'Import 1 properties' }))

    expect(screen.getByText('Starting 1…')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
    const [drafts] = onSaveProperties.mock.calls[0] as unknown as [PropertyDraft[]]
    expect(drafts[0]?.cleaningFrequency).toBe('SIX_WEEKLY')

    finish({ created: 1, errors: [] })
    expect(await screen.findByText('Imported 1 properties.')).toBeInTheDocument()
  })

  it('shows "N of M" once rows are saved, keeping the draft frequency without a round map', async () => {
    const saved: PropertyDraft[] = []
    let release: () => void = () => {}
    const onSaveProperty = vi.fn((draft: PropertyDraft) => {
      saved.push(draft)
      return saved.length === 1 ? Promise.resolve() : new Promise<void>((resolve) => (release = resolve))
    })
    const twoRows = `${HEADER}\nA,One,07500 208733,1 Road,Alnwick,NE66 1TD\nB,Two,07500 208734,2 Road,Alnwick,NE66 1TD`
    const { user } = renderWithProviders(
      <ImportPropertiesPanel
        roundOptions={[{ value: 'r1', label: 'Round' }]}
        serviceAreaOptions={[{ value: 'a1', label: 'Alnwick' }]}
        serviceOptions={[]}
        servicePrices={{}}
        draftDefaults={draftDefaults}
        onSaveProperty={onSaveProperty}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText(/First name/), { target: { value: twoRows } })
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    await user.click(screen.getByRole('button', { name: 'Select a service area' }))
    await user.click(screen.getByRole('option', { name: 'Alnwick' }))
    await user.click(screen.getByRole('button', { name: 'Select a round' }))
    await user.click(screen.getByRole('option', { name: 'Round' }))
    for (const input of screen.getAllByPlaceholderText('e.g. 20')) await user.type(input, '10')
    await user.click(screen.getByRole('button', { name: 'Import 2 properties' }))

    expect(await screen.findByText('1 of 2 saved')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(saved[0]?.cleaningFrequency).toBe(draftDefaults.cleaningFrequency)
    release()
    expect(await screen.findByText('Imported 2 properties.')).toBeInTheDocument()
  })
})

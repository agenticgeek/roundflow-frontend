import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { setupApi } from '@/api/setup.api'
import type { SetupStatus } from '@/api/types'
import { ImportPropertiesPanel } from '@/components/setup-wizard/ImportPropertiesPanel'
import { BusinessProfileStep } from '@/components/setup-wizard/steps/BusinessProfileStep'
import { setupWizardContent } from '@/content/setup-wizard'
import { businessProfileFromForm, businessProfileToForm } from '@/features/setup/lib/mappers'
import { getMaxAllowedStep, isWizardStepComplete, stepCompletionFlags } from '@/features/setup/lib/wizard'
import { ApiError } from '@/lib/errors'
import type { PropertyDraft } from '@/types/setup-wizard'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

describe('setup API additions', () => {
  it('saves one property (step 9) and previews activation (step 11)', async () => {
    const seen: unknown[] = []
    server.use(
      on('post', '/setup/step/9', async ({ request }) => {
        seen.push(await request.json())
        return HttpResponse.json({ propertyId: 'p1' }, { status: 201 })
      }),
      on('get', '/setup/step/11/preview', ({ request }) => {
        seen.push(new URL(request.url).search)
        return HttpResponse.json({ visits: 0 })
      }),
    )
    await setupApi.saveStep9({ addressLine1: '1 Bondgate' } as never)
    await setupApi.getStep11Preview({ startDate: '2026-11-02', cycleWeeks: 4 })
    expect(seen).toEqual([{ addressLine1: '1 Bondgate' }, '?startDate=2026-11-02&cycleWeeks=4'])
  })
})

function status(overrides: Partial<SetupStatus> = {}): SetupStatus {
  return {
    setupCompleted: false,
    allRequiredComplete: false,
    steps: [
      { step: 1, complete: true, deferred: false },
      { step: 7, complete: false, deferred: false },
      { step: 10, complete: false, deferred: true },
    ],
    wizardSteps: [],
    ...overrides,
  }
}

describe('wizard step completion (GAP-002)', () => {
  it('reads `wizardSteps` by key, and falls back to `steps[]` by number', () => {
    const keyed = status({
      wizardSteps: [
        { key: 'business-profile', step: 1, complete: false },
        { key: 'service-area', step: 7, complete: true },
      ],
    })
    expect(isWizardStepComplete(keyed, 1)).toBe(false)
    expect(isWizardStepComplete(keyed, 7)).toBe(true)
    expect(isWizardStepComplete(status(), 1)).toBe(true)
    expect(isWizardStepComplete(status(), 4)).toBe(false)
    expect(isWizardStepComplete(undefined, 1)).toBe(false)
    expect(isWizardStepComplete({ ...status(), wizardSteps: undefined } as never, 1)).toBe(true)
  })

  it('unlocks up to the first incomplete step, skipping deferred and skipped ones', () => {
    expect(getMaxAllowedStep(status())).toBe(7)
    expect(getMaxAllowedStep(status(), new Set([7]))).toBe(4)
    expect(stepCompletionFlags(status(), 3)).toEqual([true, false, false])
    expect(stepCompletionFlags(undefined, 2)).toEqual([false, false])
  })
})

describe('Business profile step (GAP-001)', () => {
  it('sends blank optional address lines as null', () => {
    const form = { ...businessProfileToForm(null), businessAddress: ' 1 Bondgate ', addressLine2: '  ', town: 'Alnwick' }
    expect(businessProfileFromForm(form)).toMatchObject({ addressLine1: '1 Bondgate', addressLine2: null, town: 'Alnwick' })
  })

  it('edits address line 2 and the town', () => {
    renderWithProviders(<BusinessProfileStep initialValues={businessProfileToForm(null)} onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. Unit 3'), { target: { value: 'Unit 3' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Alnwick'), { target: { value: 'Alnwick' } })
    expect(screen.getByPlaceholderText('e.g. Unit 3')).toHaveValue('Unit 3')
    expect(screen.getByPlaceholderText('e.g. Alnwick')).toHaveValue('Alnwick')
  })
})

describe('ImportPropertiesPanel bulk rejection (GAP-009)', () => {
  it('shows the row errors from a 400 body', async () => {
    const draftDefaults = setupWizardContent.addProperty.draftDefaults as PropertyDraft
    const csv = [
      'First name,Last name,Mobile phone,Service street 1,Service city,Service postcode',
      'Oliver,Clarke,07500 208733,63 Manor Road,Alnwick,NE66 1TD',
    ].join('\n')
    const onSaveProperties = vi.fn().mockRejectedValue(
      new ApiError(400, 'Validation failed', undefined, undefined, {
        errors: [{ row: 0, field: 'postcode', error: 'Postcode is not in a service area' }],
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
    await user.click(screen.getByRole('button', { name: 'Select a service area' }))
    await user.click(screen.getByRole('option', { name: 'Alnwick' }))
    await user.click(screen.getByRole('button', { name: 'Select a round' }))
    await user.click(screen.getByRole('option', { name: 'Amble 6-weekly' }))
    await user.type(screen.getByPlaceholderText('e.g. 20'), '18')
    await user.click(screen.getByRole('button', { name: 'Import 1 properties' }))
    expect(await screen.findByText(/Postcode is not in a service area/)).toBeInTheDocument()
  })
})

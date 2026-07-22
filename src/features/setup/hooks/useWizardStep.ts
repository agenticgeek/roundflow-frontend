import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import type { SetupStatus } from '@/api/types'
import { SETUP_STEP_COUNT } from '@/config/setup-wizard'
import { clampWizardStep } from '@/features/setup/lib/wizard'
import { queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

export function useWizardStep() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { setupStatus } = useAppBootstrap()
  const queryClient = useQueryClient()
  /** Client-only: steps the user chose to skip for now (does not mark complete on the server). */
  const [skippedSteps, setSkippedSteps] = useState<ReadonlySet<number>>(() => new Set())

  /** Prefer cache after mutation invalidation — React state can lag one render. */
  function latestStatus(): SetupStatus | undefined {
    return (
      queryClient.getQueryData<SetupStatus>(queryKeys.setup.status) ?? setupStatus
    )
  }

  const raw = Number(searchParams.get('step') ?? '1')
  const requested = Number.isFinite(raw) ? raw : 1
  const status = latestStatus()
  const step = clampWizardStep(requested, status, skippedSteps)
  const stepIndex = step - 1

  useEffect(() => {
    if (requested !== step) {
      setSearchParams({ step: String(step) }, { replace: true })
    }
  }, [requested, step, setSearchParams])

  function goToStep(nextStep: number) {
    const clamped = clampWizardStep(nextStep, latestStatus(), skippedSteps)
    setSearchParams({ step: String(clamped) }, { replace: true })
  }

  function skipStep() {
    if (step >= SETUP_STEP_COUNT) return

    const nextSkipped = new Set(skippedSteps)
    nextSkipped.add(step)
    setSkippedSteps(nextSkipped)

    const nextStep = Math.min(SETUP_STEP_COUNT, step + 1)
    const clamped = clampWizardStep(nextStep, latestStatus(), nextSkipped)
    setSearchParams({ step: String(clamped) }, { replace: true })
  }

  return {
    step,
    stepIndex,
    goToStep,
    goNext: () => goToStep(step + 1),
    goBack: () => goToStep(step - 1),
    skipStep,
    isFirstStep: step === 1,
    isLastStep: step === SETUP_STEP_COUNT,
  }
}

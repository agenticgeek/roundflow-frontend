import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import type { SetupStatus } from '@/api/types'
import {
  FIRST_SETUP_STEP,
  LAST_SETUP_STEP,
  nextSetupStep,
  previousSetupStep,
  setupStepPosition,
} from '@/config/setup-wizard'
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

  // `?step=` holds the backend step number, so existing deep links keep working.
  const raw = Number(searchParams.get('step') ?? String(FIRST_SETUP_STEP))
  const requested = Number.isFinite(raw) ? raw : FIRST_SETUP_STEP
  const status = latestStatus()
  const step = clampWizardStep(requested, status, skippedSteps)
  const stepIndex = setupStepPosition(step)

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
    if (step === LAST_SETUP_STEP) return

    const nextSkipped = new Set(skippedSteps)
    nextSkipped.add(step)
    setSkippedSteps(nextSkipped)

    const nextStep = nextSetupStep(step)
    const clamped = clampWizardStep(nextStep, latestStatus(), nextSkipped)
    setSearchParams({ step: String(clamped) }, { replace: true })
  }

  return {
    step,
    stepIndex,
    goToStep,
    nextStep: nextSetupStep(step),
    previousStep: previousSetupStep(step),
    goNext: () => goToStep(nextSetupStep(step)),
    goBack: () => goToStep(previousSetupStep(step)),
    skipStep,
    isFirstStep: step === FIRST_SETUP_STEP,
    isLastStep: step === LAST_SETUP_STEP,
  }
}

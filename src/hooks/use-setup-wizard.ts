import { useCallback, useState } from 'react'
import { SETUP_STEP_COUNT } from '@/config/setup-wizard'
import type { SetupWizardData } from '@/types/setup-wizard'

/** Manage current step index and per-step form data for the setup wizard. */
export function useSetupWizard(initialData: SetupWizardData = {}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [data, setData] = useState<SetupWizardData>(initialData)

  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === SETUP_STEP_COUNT - 1

  const next = useCallback(() => {
    setStepIndex((index) => Math.min(index + 1, SETUP_STEP_COUNT - 1))
  }, [])

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(index - 1, 0))
  }, [])

  const saveStep = useCallback(
    <K extends keyof SetupWizardData>(stepId: K, values: NonNullable<SetupWizardData[K]>) => {
      setData((prev) => ({ ...prev, [stepId]: values }))
    },
    [],
  )

  return {
    stepIndex,
    data,
    isFirstStep,
    isLastStep,
    next,
    back,
    saveStep,
  }
}

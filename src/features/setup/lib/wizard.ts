import type { SetupStatus } from '@/api/types'
import { SETUP_STEP_COUNT } from '@/config/setup-wizard'

export { SETUP_STEP_COUNT }

/** Friendly pending-task copy for the dashboard setup card. */
export const SETUP_STEP_TASKS: Record<number, string> = {
  1: 'Add your company details',
  2: 'Set up payment processing',
  3: 'Add your services',
  4: 'Configure round settings',
  5: 'Configure notifications',
  6: 'Invite technicians',
  7: 'Define service areas',
  8: 'Create your first round',
  9: 'Add a property',
  10: 'Assign technicians to rounds',
  11: 'Generate visits',
  12: 'Review and launch',
}

export function getMaxAllowedStep(
  status: SetupStatus,
  skippedSteps?: ReadonlySet<number>,
): number {
  for (const step of [...status.steps].sort((a, b) => a.step - b.step)) {
    if (step.deferred || step.complete || skippedSteps?.has(step.step)) continue
    return step.step
  }
  return SETUP_STEP_COUNT
}

export function clampWizardStep(
  requested: number,
  status: SetupStatus | undefined,
  skippedSteps?: ReadonlySet<number>,
): number {
  const normalized = Number.isFinite(requested)
    ? Math.min(SETUP_STEP_COUNT, Math.max(1, Math.trunc(requested)))
    : 1

  if (!status) return normalized === 1 ? 1 : normalized

  return Math.min(normalized, getMaxAllowedStep(status, skippedSteps))
}

export function stepCompletionFlags(
  status: SetupStatus | undefined,
  stepCount = SETUP_STEP_COUNT,
): boolean[] {
  return Array.from({ length: stepCount }, (_, index) => {
    const stepNumber = index + 1
    const step = status?.steps.find((item) => item.step === stepNumber)
    return step?.complete ?? false
  })
}

export function getSetupProgress(status: SetupStatus) {
  const required = status.steps.filter((step) => !step.deferred)
  const done = required.filter((step) => step.complete).length
  const percent =
    required.length === 0 ? 100 : Math.round((done / required.length) * 100)

  const pending = required
    .filter((step) => !step.complete)
    .map((step) => ({
      step: step.step,
      label: SETUP_STEP_TASKS[step.step] ?? `Complete step ${step.step}`,
    }))

  return {
    percent,
    pending,
    continueStep: getMaxAllowedStep(status),
  }
}

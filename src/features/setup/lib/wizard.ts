import type { SetupStatus } from '@/api/types'
import {
  FIRST_SETUP_STEP,
  LAST_SETUP_STEP,
  SETUP_STEPS,
  SETUP_STEP_COUNT,
  SETUP_STEP_ORDER,
  setupStepPosition,
} from '@/config/setup-wizard'

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

/**
 * GAP-002: whether a wizard step is done, from `status.wizardSteps` matched by the step's `key`
 * (the stepper's `id`) — never by array position. `complete` = that step was saved at least once.
 * A backend that doesn't send `wizardSteps` falls back to `steps[]` by backend number.
 */
export function isWizardStepComplete(status: SetupStatus | undefined, stepNumber: number): boolean {
  const definition = SETUP_STEPS.find((item) => item.step === stepNumber)
  const keyed = status?.wizardSteps?.find((item) => item.key === definition?.id)
  if (keyed) return keyed.complete
  return status?.steps.find((item) => item.step === stepNumber)?.complete ?? false
}

export function getMaxAllowedStep(
  status: SetupStatus,
  skippedSteps?: ReadonlySet<number>,
): number {
  for (const stepNumber of SETUP_STEP_ORDER) {
    const deferred = status.steps.find((item) => item.step === stepNumber)?.deferred ?? false
    if (deferred || isWizardStepComplete(status, stepNumber) || skippedSteps?.has(stepNumber)) continue
    return stepNumber
  }
  return LAST_SETUP_STEP
}

export function clampWizardStep(
  requested: number,
  status: SetupStatus | undefined,
  skippedSteps?: ReadonlySet<number>,
): number {
  const normalized =
    Number.isFinite(requested) && setupStepPosition(Math.trunc(requested)) !== -1
      ? Math.trunc(requested)
      : FIRST_SETUP_STEP

  if (!status) return normalized

  // Steps unlock in display order, so compare positions — not backend numbers.
  const maxAllowed = getMaxAllowedStep(status, skippedSteps)
  return setupStepPosition(normalized) > setupStepPosition(maxAllowed) ? maxAllowed : normalized
}

export function stepCompletionFlags(
  status: SetupStatus | undefined,
  stepCount = SETUP_STEP_COUNT,
): boolean[] {
  return SETUP_STEPS.slice(0, stepCount).map(({ step: stepNumber }) =>
    isWizardStepComplete(status, stepNumber),
  )
}

export function getSetupProgress(status: SetupStatus) {
  const required = status.steps.filter((step) => !step.deferred)
  const done = required.filter((step) => step.complete).length
  const percent =
    required.length === 0 ? 100 : Math.round((done / required.length) * 100)

  const pending = required
    .filter((step) => !step.complete)
    .sort((a, b) => setupStepPosition(a.step) - setupStepPosition(b.step))
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

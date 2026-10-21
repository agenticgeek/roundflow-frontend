import { setupWizardContent } from '@/content/setup-wizard'

/** Ordered setup wizard steps — labels live in content, ids drive routing logic. */
export const SETUP_STEPS = setupWizardContent.steps

export const SETUP_STEP_COUNT = SETUP_STEPS.length

/**
 * Backend step numbers in display order. The wizard shows steps in a different
 * order than the API numbers them, so navigation walks this list, never `step ± 1`.
 */
export const SETUP_STEP_ORDER: readonly number[] = SETUP_STEPS.map((definition) => definition.step)

export const FIRST_SETUP_STEP = SETUP_STEP_ORDER[0]
export const LAST_SETUP_STEP = SETUP_STEP_ORDER[SETUP_STEP_ORDER.length - 1]

/** Display position (0-based) of a backend step number; -1 if unknown. */
export function setupStepPosition(step: number): number {
  return SETUP_STEP_ORDER.indexOf(step)
}

/** Backend step shown after `step`, or `step` itself when it is already last. */
export function nextSetupStep(step: number): number {
  return SETUP_STEP_ORDER[setupStepPosition(step) + 1] ?? step
}

/** Backend step shown before `step`, or `step` itself when it is already first. */
export function previousSetupStep(step: number): number {
  const position = setupStepPosition(step)
  return position > 0 ? SETUP_STEP_ORDER[position - 1] : step
}

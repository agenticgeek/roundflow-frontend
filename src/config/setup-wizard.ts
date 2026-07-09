import { setupWizardContent } from '@/content/setup-wizard'

/** Ordered setup wizard steps — labels live in content, ids drive routing logic. */
export const SETUP_STEPS = setupWizardContent.steps

export const SETUP_STEP_COUNT = SETUP_STEPS.length

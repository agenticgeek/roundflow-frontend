import { createContext, useContext, useEffect, useMemo } from 'react'

/** Lets the wizard shell know whether the mounted step has unsaved edits. */
export const WizardDirtyContext = createContext<(dirty: boolean) => void>(() => undefined)

/** Reports `current !== initial` (by value) to the wizard shell while the step is mounted. */
export function useReportWizardDirty(current: unknown, initial: unknown) {
  const report = useContext(WizardDirtyContext)
  const dirty = useMemo(
    () => JSON.stringify(current) !== JSON.stringify(initial),
    [current, initial],
  )

  useEffect(() => {
    report(dirty)
  }, [dirty, report])

  useEffect(() => () => report(false), [report])
}

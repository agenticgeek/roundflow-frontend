import type { ReactNode } from 'react'

/** Lightweight step transition wrapper — CSS-only, no extra libraries. */
export function SetupStepPanel({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  return (
    <div key={stepKey} className="animate-wizard-step">
      {children}
    </div>
  )
}

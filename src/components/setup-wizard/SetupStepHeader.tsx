import type { ReactNode } from 'react'

interface SetupStepHeaderProps {
  icon: ReactNode
  title: string
  subtitle: string
  action?: ReactNode
}

/** Reusable step header — icon, title, subtitle, optional top-right action. */
export function SetupStepHeader({ icon, title, subtitle, action }: SetupStepHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        {icon}
        <div>
          <h2 className="text-lg font-medium text-foreground sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

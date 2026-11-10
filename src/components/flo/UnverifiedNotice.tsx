import { floContent } from '@/content/flo'

/** Shown when the server could not match some figures in the prose to your data. */
export function UnverifiedNotice() {
  return (
    <p className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
      {floContent.unverified.notice}
    </p>
  )
}

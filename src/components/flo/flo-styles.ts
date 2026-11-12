/** The one focus ring every Flo control uses: 2px accent, offset 2px from the control. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/** White outlined control (area tags, header buttons, follow-ups): accent border and tint on hover, slight press. */
export const OUTLINE_CONTROL = `border border-line bg-card text-foreground transition-[color,background-color,border-color,transform] duration-150 hover:border-primary hover:bg-primary/[0.06] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING}`

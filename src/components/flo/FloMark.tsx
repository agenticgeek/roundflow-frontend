import { useId } from 'react'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: { box: 'h-7 w-7 rounded-lg', svg: 'h-6 w-6' },
  md: { box: 'h-10 w-10 rounded-xl', svg: 'h-9 w-9' },
  lg: { box: 'h-12 w-12 rounded-xl', svg: 'h-11 w-11' },
} as const

/** A round: a loop through three stops, drawn from the top. */
const ROUTE = 'M24 8a16 16 0 1 1 0 32a16 16 0 1 1 0-32'
const STOPS = [
  [40, 24],
  [16, 37.9],
  [16, 10.1],
] as const

/**
 * Flo's mark: a round with three stops, dashes flowing along it and a dot travelling it like a window cleaner
 * on their round. `live` speeds it up while Flo works. Decorative only;
 * under reduced motion it stands still.
 */
export function FloMark({ size = 'md', live = false, className }: { size?: keyof typeof SIZES; live?: boolean; className?: string }) {
  const { box, svg } = SIZES[size]
  const routeId = `flo-route-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const still = prefersReducedMotion()
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center bg-accent-surface text-accent ring-1 ring-primary/10', box, className)}
    >
      <svg viewBox="0 0 48 48" fill="none" className={svg}>
        <path id={routeId} d={ROUTE} stroke="currentColor" strokeOpacity={0.18} strokeWidth={3} />
        <path
          d={ROUTE}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="3 5"
          strokeOpacity={0.7}
          className="animate-route-march motion-reduce:animate-none"
          style={{ animationDuration: live ? '0.7s' : '2.4s' }}
        />
        {STOPS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.2} fill="var(--card)" stroke="currentColor" strokeWidth={2.2} />
        ))}
        <circle r={3.8} fill="currentColor" stroke="var(--card)" strokeWidth={1.6} {...(still ? { cx: 24, cy: 8 } : {})}>
          {still ? null : (
            <animateMotion dur={live ? '1.6s' : '5s'} repeatCount="indefinite" rotate="auto">
              <mpath href={`#${routeId}`} />
            </animateMotion>
          )}
        </circle>
      </svg>
    </span>
  )
}

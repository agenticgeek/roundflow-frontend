import { useEffect, useState, type ReactNode } from 'react'
import { Brand } from '@/components/layout/Brand'
import { site } from '@/content/site'

/** Main route across the page; each stop below sits on a segment end, so it lands on the line. */
const ROUTE_PATH = 'M-40 720 C 180 640, 260 520, 420 560 S 700 760, 860 620 S 1060 300, 1240 360 S 1420 260, 1500 180'
const ROUTE_STOPS = [
  { x: 420, y: 560, delay: '0s' },
  { x: 860, y: 620, delay: '0.8s' },
  { x: 1240, y: 360, delay: '1.6s' },
]
const SIDE_ROUTE_PATH = 'M-40 160 C 200 220, 360 80, 560 140 S 900 260, 1080 150 S 1360 60, 1500 120'
const SIDE_ROUTE_STOPS = [
  { x: 560, y: 140 },
  { x: 1080, y: 150 },
]

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Drifting glows, a dot grid and a round being driven stop to stop — sits behind the card. */
function RouteBackdrop() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-40 -left-32 h-[30rem] w-[30rem] animate-drift rounded-full bg-primary/20 blur-3xl motion-reduce:animate-none" />
      <div
        className="absolute -right-40 -bottom-48 h-[34rem] w-[34rem] animate-drift rounded-full bg-primary/15 blur-3xl [--drift-x:-56px] [--drift-y:40px] [animation-delay:-6s] motion-reduce:animate-none"
      />
      <div
        className="absolute top-1/3 left-1/2 h-72 w-72 animate-drift rounded-full bg-success/10 blur-3xl [--drift-x:-80px] [--drift-y:60px] [animation-delay:-10s] motion-reduce:animate-none"
      />

      <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] bg-[size:22px_22px]" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <path d={SIDE_ROUTE_PATH} fill="none" className="stroke-primary/15" strokeWidth="2" strokeDasharray="4 12" strokeLinecap="round" />
        {SIDE_ROUTE_STOPS.map((stop) => (
          <circle key={stop.x} cx={stop.x} cy={stop.y} r="5" className="fill-background stroke-primary/30" strokeWidth="2" />
        ))}

        <path d={ROUTE_PATH} fill="none" className="stroke-primary/10" strokeWidth="14" strokeLinecap="round" />
        <path
          d={ROUTE_PATH}
          fill="none"
          className="animate-route-march stroke-primary/45 motion-reduce:animate-none"
          strokeWidth="2.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
        />

        {ROUTE_STOPS.map((stop) => (
          <g key={stop.x} transform={`translate(${stop.x} ${stop.y})`}>
            <circle
              r="14"
              className="origin-center animate-ring-out fill-primary/25 [transform-box:fill-box] motion-reduce:hidden"
              style={{ animationDelay: stop.delay }}
            />
            <circle r="8" className="fill-card stroke-primary" strokeWidth="3" />
            <circle r="3" className="fill-primary" />
          </g>
        ))}

        <g>
          <circle r="16" className="fill-primary/15" />
          <circle r="7" className="fill-primary stroke-card" strokeWidth="3" />
          {reducedMotion ? (
            <animateMotion dur="1ms" fill="freeze" keyPoints="0.42;0.42" keyTimes="0;1" calcMode="linear" path={ROUTE_PATH} />
          ) : (
            <animateMotion dur="18s" repeatCount="indefinite" path={ROUTE_PATH} />
          )}
        </g>
      </svg>
    </div>
  )
}

/**
 * Full-screen shell for the technician invite flow (`/app-invite`). No marketing side panel:
 * the technician is here to finish one job, so the card gets the whole stage.
 */
export function InviteSetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center overflow-hidden bg-background px-4 pt-8 pb-6 sm:pt-10">
      <RouteBackdrop />

      <div className="animate-fade-in">
        <Brand asLink={false} className="h-9 sm:h-10" />
      </div>

      <main className="flex w-full flex-1 items-center justify-center py-8">
        <div className="w-full max-w-xl animate-card-in rounded-3xl border border-border/80 bg-card/85 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-10">
          {children}
        </div>
      </main>

      <p className="text-center text-xs text-muted">{site.footerText}</p>
    </div>
  )
}

import { useState } from 'react'
import { authContent } from '@/content/auth'
import { Brand } from '@/components/layout/Brand'
import { TypewriterLines } from '@/components/TypewriterLines'
import { StaggeredReveal } from '@/components/StaggeredReveal'
import { cn } from '@/lib/utils'

const { aside } = authContent

function CheckBadge() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Animated auth sidebar — typewriter headline, fade subheadline, staggered features. */
export function AuthAside() {
  const [headlineDone, setHeadlineDone] = useState(false)

  return (
    <aside className="flex flex-col bg-sidebar px-6 py-6 text-sidebar-foreground sm:px-10 lg:sticky lg:top-0 lg:h-svh lg:w-[38.5%] lg:shrink-0 lg:px-14 lg:py-10 xl:px-16 2xl:px-20">
      <Brand asLink={false} inverse className="h-10" />

      <div className="mt-10 mb-4 flex flex-1 flex-col justify-center lg:my-0">
        <TypewriterLines
          lines={aside.headlineLines}
          className="text-[28px] leading-[1.2] font-semibold tracking-tight sm:text-4xl xl:text-[42px]"
          onComplete={() => setHeadlineDone(true)}
        />

        <p
          className={cn(
            'mt-5 max-w-md text-base text-sidebar-muted transition-all duration-500 ease-out xl:text-lg',
            headlineDone ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          {aside.subheadline}
        </p>

        <ul className="mt-8 space-y-4 xl:mt-10">
          <StaggeredReveal active={headlineDone} startDelay={180} staggerMs={140}>
            {aside.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-[15px] font-medium xl:text-[17px]"
              >
                <CheckBadge />
                {feature}
              </li>
            ))}
          </StaggeredReveal>
        </ul>
      </div>

      <p className="hidden text-sm text-sidebar-muted lg:block">{aside.footerText}</p>
    </aside>
  )
}

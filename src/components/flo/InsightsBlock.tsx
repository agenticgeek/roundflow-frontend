import { Link } from 'react-router-dom'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Sentence } from '@/components/flo/Sentence'
import { floLinkTarget } from '@/features/flo/lib/links'
import type { FloSentence } from '@/features/flo/lib/stream-reducer'

/** "What stands out": one plain-text line per insight, each with an optional link to the screen it came from. */
export function InsightsBlock({ insights, animate }: { insights: readonly FloSentence[]; animate: boolean }) {
  return (
    <section
      aria-label={floContent.insights.title}
      className="rounded-xl border border-border bg-background p-4"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <DashboardIcon name="sparkle" className="h-4 w-4 text-accent" />
        {floContent.insights.title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm text-foreground">
        {insights.map((insight, index) => {
          const target = floLinkTarget(insight.link)
          return (
            <li key={index} className="relative pl-4 leading-relaxed">
              <span aria-hidden="true" className="absolute top-2 left-0 h-1.5 w-1.5 rounded-full bg-accent" />
              <Sentence sentence={insight} animate={animate} />
              {target && insight.link ? (
                <Link to={target} className="ml-2 font-medium whitespace-nowrap text-accent underline-offset-4 hover:underline">
                  {floContent.link[insight.link.screen as keyof typeof floContent.link]}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { floContent } from '@/content/flo'
import { Sentence } from '@/components/flo/Sentence'
import { floLinkTarget } from '@/features/flo/lib/links'
import type { FloSentence } from '@/features/flo/lib/stream-reducer'

/** "What stands out": one plain-text line per insight, each with an optional link to the screen it came from. */
export function InsightsBlock({ insights, animate }: { insights: readonly FloSentence[]; animate: boolean }) {
  return (
    <section aria-label={floContent.insights.title}>
      <h3 className="text-sm font-semibold text-foreground">{floContent.insights.title}</h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
        {insights.map((insight, index) => {
          const target = floLinkTarget(insight.link)
          return (
            <li key={index}>
              <Sentence sentence={insight} animate={animate} />
              {target && insight.link ? (
                <Link to={target} className="ml-2 font-medium text-accent hover:underline">
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

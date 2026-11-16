import { Link } from 'react-router-dom'
import type { FloLink } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { floLinkTarget } from '@/features/flo/lib/links'

/** The "Open <screen>" affordance under a block. Draws nothing for a missing or unknown screen. */
export function BlockLink({ link }: { link?: FloLink }) {
  const target = floLinkTarget(link)
  if (!target || !link) return null
  return (
    <Link
      to={target}
      className="group mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-4 hover:underline"
    >
      {floContent.link[link.screen as keyof typeof floContent.link]}
      <DashboardIcon name="arrow-right" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

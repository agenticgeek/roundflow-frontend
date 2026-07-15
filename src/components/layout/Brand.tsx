import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { site } from '@/content/site'
import { cn } from '@/lib/utils'

/** Brand logo — SVG wordmark from public/assets. `inverse` uses the dark-bg colored asset. */
export function Brand({
  className,
  asLink = true,
  inverse = false,
}: {
  className?: string
  asLink?: boolean
  inverse?: boolean
}) {
  const logo = (
    <img
      src={inverse ? site.logo.darkSrc : site.logo.src}
      alt={site.logo.alt}
      className={cn('h-8 w-auto', className)}
    />
  )

  if (!asLink) return logo

  return (
    <Link to={ROUTES.home} aria-label={site.name}>
      {logo}
    </Link>
  )
}

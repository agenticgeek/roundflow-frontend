import type { CSSProperties, ReactElement } from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import { useStaggeredReveal } from '@/hooks/use-staggered-reveal'
import { cn } from '@/lib/utils'

type RevealElement = ReactElement<{ className?: string; style?: CSSProperties }>

interface StaggeredRevealProps {
  /** Start revealing children when this becomes true. */
  active?: boolean
  staggerMs?: number
  startDelay?: number
  children: ReactElement | ReactElement[]
}

/**
 * Reveal each child with a staggered fade-up animation. Clones valid element
 * children and merges reveal classes — keeps list semantics intact.
 */
export function StaggeredReveal({
  active = true,
  staggerMs = 130,
  startDelay = 0,
  children,
}: StaggeredRevealProps) {
  const items = Children.toArray(children).filter(isValidElement) as RevealElement[]
  const { isVisible } = useStaggeredReveal({
    count: items.length,
    active,
    staggerMs,
    startDelay,
  })

  return (
    <>
      {items.map((child, index) =>
        cloneElement(child, {
          key: child.key ?? index,
          className: cn(
            child.props.className,
            isVisible(index) ? 'animate-reveal-item' : 'opacity-0',
          ),
          style: {
            ...child.props.style,
            animationDelay: `${startDelay + index * staggerMs}ms`,
          },
        }),
      )}
    </>
  )
}

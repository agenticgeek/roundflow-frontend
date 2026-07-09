import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type ScrollArrowDirection = 'left' | 'right'

export interface ScrollArrowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  direction: ScrollArrowDirection
  /** Accessible label — pass copy from content, never hardcode in the component. */
  ariaLabel: string
  /** Keeps layout stable: hidden buttons stay in place but are inert. */
  visuallyHidden?: boolean
}

/** Reusable circular arrow control for horizontal scroll/slide regions. */
export function ScrollArrowButton({
  direction,
  ariaLabel,
  visuallyHidden = false,
  className,
  disabled,
  ...props
}: ScrollArrowButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled ?? visuallyHidden}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-[opacity,background-color,transform] duration-200 hover:bg-surface active:scale-95 disabled:pointer-events-none',
        visuallyHidden && 'opacity-0',
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        {direction === 'right' ? (
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd"
          />
        )}
      </svg>
    </button>
  )
}

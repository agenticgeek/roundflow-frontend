import { useEffect } from 'react'
import type { HTMLAttributes } from 'react'
import { useTypewriter, useTypewriterSequence } from '@/hooks/use-typewriter'

interface TypewriterLinesProps extends HTMLAttributes<HTMLHeadingElement> {
  lines: readonly string[]
  speed?: number
  showCursor?: boolean
  onComplete?: () => void
}

function TypewriterCursor({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] animate-pulse bg-current opacity-80"
    />
  )
}

function activeLineIndex(displayLines: string[], sourceLines: readonly string[]): number {
  const typing = displayLines.findIndex((line, index) => line.length > 0 && line !== sourceLines[index])
  if (typing >= 0) return typing

  const next = displayLines.findIndex(
    (line, index) => line.length === 0 && (index === 0 || displayLines[index - 1] === sourceLines[index - 1]),
  )
  return next >= 0 ? next : sourceLines.length - 1
}

/** Type out multiple lines sequentially inside a heading element. */
export function TypewriterLines({
  lines,
  speed,
  showCursor = true,
  onComplete,
  className,
  ...props
}: TypewriterLinesProps) {
  const { lines: displayLines, isComplete, isTyping } = useTypewriterSequence(lines, { speed })
  const cursorIndex = activeLineIndex(displayLines, lines)

  useEffect(() => {
    if (isComplete) onComplete?.()
  }, [isComplete, onComplete])

  return (
    <h1 className={className} {...props}>
      {lines.map((sourceLine, index) => (
        <span key={sourceLine} className="block">
          {displayLines[index]}
          <TypewriterCursor visible={showCursor && isTyping && cursorIndex === index} />
        </span>
      ))}
    </h1>
  )
}

interface TypewriterTextProps extends HTMLAttributes<HTMLElement> {
  text: string
  speed?: number
  startDelay?: number
  showCursor?: boolean
  as?: 'span' | 'p'
}

/** Type out a single string — reusable anywhere. */
export function TypewriterText({
  text,
  speed,
  startDelay,
  showCursor = true,
  as: Tag = 'span',
  className,
  ...props
}: TypewriterTextProps) {
  const { displayedText, isComplete } = useTypewriter({ text, speed, startDelay })

  return (
    <Tag className={className} {...props}>
      {displayedText}
      <TypewriterCursor visible={showCursor && !isComplete} />
    </Tag>
  )
}

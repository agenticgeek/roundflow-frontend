import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

export interface TypewriterOptions {
  /** Full string to type out character by character. */
  text: string
  /** Milliseconds between each character. */
  speed?: number
  /** Delay before typing starts. */
  startDelay?: number
  /** Set false to show the full string immediately. */
  enabled?: boolean
}

/**
 * Reveal text one character at a time. Respects `prefers-reduced-motion`
 * and returns the full string instantly when motion is reduced.
 */
export function useTypewriter({
  text,
  speed = 36,
  startDelay = 0,
  enabled = true,
}: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    if (prefersReducedMotion()) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    setDisplayedText('')
    setIsComplete(false)

    let index = 0
    let charTimer: ReturnType<typeof setTimeout> | undefined
    let startTimer: ReturnType<typeof setTimeout> | undefined

    const typeNext = () => {
      index += 1
      setDisplayedText(text.slice(0, index))

      if (index < text.length) {
        charTimer = setTimeout(typeNext, speed)
      } else {
        setIsComplete(true)
      }
    }

    startTimer = setTimeout(typeNext, startDelay)

    return () => {
      if (startTimer) clearTimeout(startTimer)
      if (charTimer) clearTimeout(charTimer)
    }
  }, [text, speed, startDelay, enabled])

  return { displayedText, isComplete, isTyping: !isComplete && displayedText.length > 0 }
}

export interface TypewriterSequenceOptions {
  /** Milliseconds between each character. */
  speed?: number
  /** Delay before the first line starts. */
  startDelay?: number
  /** Pause between finishing one line and starting the next. */
  linePause?: number
}

/**
 * Type multiple lines in order. Each line completes before the next begins.
 * Returns partial text per line plus an `isComplete` flag for the whole sequence.
 */
export function useTypewriterSequence(
  lines: readonly string[],
  { speed = 36, startDelay = 200, linePause = 320 }: TypewriterSequenceOptions = {},
) {
  const [lineIndex, setLineIndex] = useState(0)
  const [finishedLines, setFinishedLines] = useState<string[]>([])

  const currentLine = lines[lineIndex] ?? ''
  const delay = lineIndex === 0 ? startDelay : linePause

  const { displayedText, isComplete } = useTypewriter({
    text: currentLine,
    speed,
    startDelay: delay,
    enabled: lineIndex < lines.length,
  })

  useEffect(() => {
    if (!isComplete || lineIndex >= lines.length) return

    setFinishedLines((prev) => [...prev, currentLine])
    setLineIndex((index) => index + 1)
  }, [isComplete, lineIndex, lines.length, currentLine])

  const displayLines = lines.map((_, index) => {
    if (index < finishedLines.length) return finishedLines[index]
    if (index === lineIndex && lineIndex < lines.length) return displayedText
    return ''
  })

  const allComplete = lineIndex >= lines.length
  const isTyping = !allComplete

  return { lines: displayLines, isComplete: allComplete, isTyping }
}

import { floContent } from '@/content/flo'
import { useTypewriter } from '@/hooks/use-typewriter'

function greeting(hour: number): string {
  const { morning, afternoon, evening } = floContent.empty.greeting
  if (hour < 12) return morning
  if (hour < 18) return afternoon
  return evening
}

/**
 * The greeting above the question box before a conversation starts. It types itself out with a lighter
 * shade of its own colour sweeping through it; screen readers get the whole line at once.
 */
export function FloWelcome() {
  const copy = floContent.empty
  const hello = greeting(new Date().getHours())
  const typed = useTypewriter({ text: hello, speed: 70, startDelay: 250 })
  return (
    <div className="flex animate-fade-in flex-col items-center gap-2 text-center">
      <p className="text-[13px] font-medium tracking-[0.08em] text-muted-strong uppercase">{copy.eyebrow}</p>
      <p className="font-display text-[40px] leading-tight font-light tracking-[-0.03em]">
        <span className="sr-only">{hello}</span>
        <span aria-hidden="true" className="inline-flex min-h-[1.25em] items-center">
          <span className="animate-text-flow bg-[linear-gradient(90deg,var(--foreground)_0%,var(--foreground)_35%,color-mix(in_srgb,var(--foreground)_35%,var(--background))_50%,var(--foreground)_65%,var(--foreground)_100%)] bg-[length:200%_100%] bg-clip-text pb-1 text-transparent motion-reduce:animate-none">
            {typed.displayedText}
          </span>
          {typed.isComplete ? null : <span className="ml-1 h-[0.85em] w-[2px] animate-caret rounded-full bg-primary" />}
        </span>
      </p>
      <h2 className="text-lg font-normal text-balance text-muted-strong">{copy.title}</h2>
    </div>
  )
}

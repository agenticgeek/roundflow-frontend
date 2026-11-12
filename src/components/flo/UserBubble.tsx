import { floContent } from '@/content/flo'

/** The admin's own question, as plain text. */
export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex animate-fade-in justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-primary-foreground">
        <span className="sr-only">{floContent.messages.you}: </span>
        {text}
      </p>
    </div>
  )
}

import { floContent } from '@/content/flo'

/** The admin's own question, as plain text. */
export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        <span className="sr-only">{floContent.messages.you}: </span>
        {text}
      </p>
    </div>
  )
}

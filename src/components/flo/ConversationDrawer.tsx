import { useState } from 'react'
import type { FloConversationSummary } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SidePanel } from '@/components/ui/side-panel'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { useDeleteFloConversation, useFloConversations } from '@/features/flo/hooks/useFloConversations'
import { errorMessage } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  activeId: string | null
  onOpen: (id: string) => void
  /** A conversation was deleted: the open chat should reset if it was that one. */
  onDeleted: (id: string) => void
}

/** The admin's own past conversations: open one, or delete it after a confirmation. */
export function ConversationDrawer({ open, onClose, activeId, onOpen, onDeleted }: ConversationDrawerProps) {
  const list = useFloConversations(open)
  const remove = useDeleteFloConversation()
  const [target, setTarget] = useState<FloConversationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const conversations = list.data?.conversations ?? []
  const titleOf = (conversation: FloConversationSummary) => conversation.title || floContent.untitled

  async function confirmDelete() {
    const { id } = target as FloConversationSummary
    try {
      await remove.mutateAsync(id)
      onDeleted(id)
      setTarget(null)
      setError(null)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  function closeDialog() {
    setTarget(null)
    setError(null)
  }

  return (
    <>
      <SidePanel open={open} onClose={onClose} title={floContent.historyTitle}>
        {list.isPending ? <p className="text-sm text-muted">{floContent.historyLoading}</p> : null}
        {list.isError ? (
          <p role="alert" className="text-sm text-danger">
            {floContent.historyError}
          </p>
        ) : null}
        {list.isSuccess && conversations.length === 0 ? <p className="text-sm text-muted">{floContent.historyEmpty}</p> : null}
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="group flex items-center gap-1">
              <button
                type="button"
                aria-current={conversation.id === activeId ? 'true' : undefined}
                aria-label={fillCopy(floContent.openConversation, { title: titleOf(conversation) })}
                onClick={() => {
                  onOpen(conversation.id)
                  onClose()
                }}
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-surface aria-[current=true]:bg-accent-surface aria-[current=true]:font-medium aria-[current=true]:text-accent"
              >
                <DashboardIcon name="message" className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate">{titleOf(conversation)}</span>
              </button>
              <button
                type="button"
                aria-label={fillCopy(floContent.deleteConversation, { title: titleOf(conversation) })}
                onClick={() => setTarget(conversation)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-danger"
              >
                <DashboardIcon name="trash" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </SidePanel>

      <ConfirmDialog
        open={target !== null}
        title={floContent.deleteTitle}
        description={floContent.deleteDescription}
        confirmLabel={floContent.deleteConfirm}
        pending={remove.isPending}
        error={error}
        onConfirm={() => void confirmDelete()}
        onClose={closeDialog}
      />
    </>
  )
}

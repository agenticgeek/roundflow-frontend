import { create } from 'zustand'

export type UiModal =
  | { type: 'confirm-delete'; id?: string }
  | { type: 'confirm-bulk-replace'; id?: string }
  | { type: 'unsaved-changes'; id?: string }

export interface UiToast {
  id: string
  message: string
  description?: string
  tone?: 'default' | 'error'
  durationMs?: number
}

type NewUiToast = Omit<UiToast, 'id'>

interface UiState {
  modal: UiModal | null
  toasts: UiToast[]
  openModal: (modal: UiModal) => void
  closeModal: () => void
  pushToast: (toast: NewUiToast) => string
  dismissToast: (id: string) => void
}

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  toasts: [],
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  pushToast: (toast) => {
    const id = createToastId()
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    return id
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

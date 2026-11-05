import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface RoundForm {
  serviceAreaId: string
  name: string
  defaultDay: string
  /** `null` until the user edits it — until then it follows the Round Settings default. */
  frequency: string | null
}

export interface RoundsDraft {
  form: RoundForm
  setForm: Dispatch<SetStateAction<RoundForm>>
  editingId: string | null
  setEditingId: (id: string | null) => void
  formSectors: string[]
  setFormSectors: Dispatch<SetStateAction<string[]>>
}

export const emptyRoundForm = (serviceAreaId = ''): RoundForm => ({
  serviceAreaId,
  name: '',
  defaultDay: '',
  frequency: null,
})

/** Holds the Add-a-round form above the step so leaving and returning keeps what was typed. */
export function useRoundsDraft(): RoundsDraft {
  const [form, setForm] = useState<RoundForm>(() => emptyRoundForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formSectors, setFormSectors] = useState<string[]>([])
  return { form, setForm, editingId, setEditingId, formSectors, setFormSectors }
}

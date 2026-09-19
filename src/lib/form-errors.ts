export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

/**
 * Scrolls to and focuses the first `aria-invalid` field inside `root`. Deferred a
 * frame so it runs after React commits the error state that sets the attribute.
 */
export function focusFirstInvalid(root: HTMLElement | null) {
  requestAnimationFrame(() => {
    const target = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
  })
}

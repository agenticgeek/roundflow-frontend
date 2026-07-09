import { useCallback, useState } from 'react'

/** Toggle password visibility for any password input. */
export function usePasswordVisibility(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible)

  const toggle = useCallback(() => setVisible((v) => !v), [])

  return {
    visible,
    toggle,
    inputType: visible ? ('text' as const) : ('password' as const),
  }
}

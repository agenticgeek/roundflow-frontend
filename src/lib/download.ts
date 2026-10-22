/**
 * Browser helpers for files fetched as a Blob (invoice PDFs, report CSVs).
 * The bytes come from an authenticated `apiBlob()` call, so we can't just point
 * an <a href> at the API URL — we turn the Blob into a temporary object URL.
 */

/** Triggers a "Save as" download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // Revoke on the next tick so the download has a chance to start.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

/**
 * Opens a Blob (e.g. a PDF) in a new tab and asks that tab to print it.
 * Falls back to a plain download if the popup is blocked.
 */
export function printBlob(blob: Blob, fallbackFilename: string): void {
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    // Popup blocked — at least give the user the file.
    URL.revokeObjectURL(url)
    downloadBlob(blob, fallbackFilename)
    return
  }
  const triggerPrint = () => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch {
      // Some browsers block print() on cross-origin blob frames — the file is
      // still open in the tab for the user to print manually.
    }
  }
  printWindow.addEventListener('load', triggerPrint)
  // Safari sometimes fires load before the listener attaches; nudge it.
  window.setTimeout(triggerPrint, 1_000)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

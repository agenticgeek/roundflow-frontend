/** App-wide failure copy: route crashes (GAP-024) and an unreachable API (GAP-005). */
export const appErrorsContent = {
  route: {
    title: 'This page hit a problem',
    description: 'Something on this page failed to load. Your data is safe — try again, or go back to the dashboard.',
    retry: 'Try again',
    home: 'Go to dashboard',
    notFound: 'This page doesn’t exist.',
  },
  network: {
    /** Shown when fetch itself fails (offline, DNS, CORS, server down) — never for an API error. */
    message: 'Can’t reach RoundFlow',
    description: 'Check your connection and try again.',
    retry: 'Retry',
    /** Splash / spinner fallback after the timeout below. */
    timeoutTitle: 'Can’t reach RoundFlow',
    timeoutDescription: 'This is taking longer than it should. Check your connection, then retry.',
  },
} as const

/** Splash and page spinners give up waiting after this long (GAP-005). */
export const LOADING_TIMEOUT_MS = 15_000

export interface SiteContent {
  name: string
  logo: {
    /** Colored wordmark for light backgrounds. */
    src: string
    /** Colored wordmark for dark backgrounds (keeps teal accents). */
    darkSrc: string
    alt: string
  }
  favicon: string
  footerText: string
  legal: { termsHref: string; privacyHref: string }
  ui: {
    closeDialog: string
  }
}

export const site = {
  name: 'RoundFlow',
  logo: {
    src: '/assets/logo_roundflow.svg',
    darkSrc: '/assets/logo_roundflow_dark.svg',
    alt: 'RoundFlow',
  },
  favicon: '/favicon.svg',
  footerText: `© ${new Date().getFullYear()} RoundFlow Ltd. All rights reserved.`,
  legal: {
    termsHref: 'https://roundflow.example/terms',
    privacyHref: 'https://roundflow.example/privacy',
  },
  ui: {
    closeDialog: 'Close dialog',
  },
} satisfies SiteContent

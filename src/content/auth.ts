import { site } from '@/content/site'

/** Copy for the auth split-screen and each auth screen. */
export const authContent = {
  aside: {
    headlineLines: ['Manage your rounds.', 'Empower your team.'],
    subheadline: 'Track jobs, technicians, payments and complaints — all in one place.',
    features: ['Live GPS tracking', 'Automated scheduling', 'Instant payments'],
    footerText: site.footerText,
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your RoundFlow account',
  },
  errors: {
    invalidCredentials: 'Wrong email or password',
    signInFailed: 'Unable to sign in. Please try again.',
  },
  signup: {
    title: 'Get started free',
    subtitle: 'Create your RoundFlow account',
  },
  signupMagicLink: {
    title: 'Check your email',
    subtitle: 'A confirmation link has been sent to {email}. Check your inbox and click the link to continue.',
    action: 'Back to log in',
    resend: 'Resend confirmation link',
    sent: 'Confirmation link sent. Check your inbox.',
  },
  forgotPassword: {
    title: 'Forgot password?',
    subtitle: "Enter your work email and we'll send you a reset link.",
  },
  resetMagicLink: {
    title: 'Check your email',
    subtitle: 'A password reset link has been sent to {email}. Click it to set a new password.',
    action: 'Back to log in',
    resend: 'Resend reset link',
    sent: 'Reset link sent. Check your inbox.',
  },
  resetPassword: {
    title: 'Set new password',
    subtitle: 'Your new password must be at least 8 characters and include a number.',
  },
  ui: {
    tabLogin: 'Log in',
    tabSignup: 'Sign up',
    orDivider: 'or',
    googleLabel: 'Continue with Google',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
} as const

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
    alreadyRegistered: 'This email is already registered. Log in instead.',
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
  acceptInvite: {
    title: 'Accept your invite',
    subtitle: 'Create your RoundFlow account to join the team.',
    missingToken: 'This invite link is missing a token. Ask your admin to resend the invite.',
    expired: 'This invite has expired or was already used. Ask your admin to send a new one.',
    notFound: 'This invite link is invalid. Ask your admin to resend the invite.',
    emailLabel: 'Work email',
    nameLabel: 'Full name',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm password',
    roleLabel: 'Role',
    submit: 'Create account & join',
    submitting: 'Creating account…',
    accepting: 'Finishing invite…',
    alreadySignedIn: 'You’re signed in. Confirm your name to join this team.',
    acceptExisting: 'Accept invite',
    successRedirect: 'Invite accepted — taking you in…',
    magicTitle: 'Confirm your email',
    magicSubtitle:
      'We sent a confirmation link to {email}. Open it on this device to finish joining.',
    loginInstead: 'Already have an account? Log in',
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

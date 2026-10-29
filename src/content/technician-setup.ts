/** Copy for `/app-invite` — a technician's first visit from their invite email. */
export const technicianSetupContent = {
  steps: ['Welcome', 'Your login', 'All set'],
  welcome: {
    eyebrow: 'Technician invite',
    title: 'You’ve been invited to join your team on RoundFlow',
    body: 'RoundFlow is where your rounds, jobs and customer notes live. Set up your login once and you’ll use it in the RoundFlow app.',
    invitedAs: 'Invited as',
    email: 'Your login email',
    expires: 'Invite valid until {date}',
    points: [
      'See each day’s round and jobs in order',
      'Mark visits done, add photos and notes',
      'Get told when a job changes',
    ],
    start: 'Set up my login',
  },
  credentials: {
    title: 'Create your login',
    body: 'You’ll sign in to the RoundFlow app with this email and password.',
    name: { label: 'Full name', placeholder: 'e.g. Sarah Johnson', hint: 'Shown to your manager and on job notes.' },
    email: { label: 'Email' },
    password: { label: 'Password', placeholder: 'At least 8 characters' },
    confirm: { label: 'Confirm password', placeholder: 'Type it again' },
    rules: {
      length: 'At least 8 characters',
      letter: 'A letter',
      number: 'A number',
    },
    submit: 'Create login',
    submitting: 'Setting up…',
    back: 'Back',
    errors: {
      nameRequired: 'Enter your full name.',
      passwordWeak: 'Use at least 8 characters with a letter and a number.',
      mismatch: 'Passwords don’t match.',
    },
  },
  done: {
    title: 'You’re all set, {name}',
    body: 'Your login is ready. Now get the RoundFlow app on your phone and sign in.',
    nextTitle: 'What to do next',
    steps: {
      download: {
        title: 'Download the RoundFlow app',
        body: 'Free on iPhone and Android.',
      },
      signIn: {
        title: 'Sign in with your email',
        body: '{email}',
      },
      password: {
        title: 'Use the password you just created',
        body: 'Your rounds and jobs will be waiting.',
      },
    },
    stores: {
      ios: { overline: 'Download on the', name: 'App Store' },
      android: { overline: 'Get it on', name: 'Google Play' },
      comingSoon: 'Coming soon',
      notLive: 'The app isn’t in the stores just yet. Your manager will send you the link as soon as it’s live.',
    },
    continue: 'Continue',
  },
  thanks: {
    eyebrow: 'Welcome aboard',
    title: 'Thanks for joining RoundFlow, {name}',
    body: 'We’re glad to have you on the team. You can close this page now — everything you need for your rounds is in the RoundFlow app.',
    highlights: ['Your daily round', 'Job notes & photos', 'Live updates'],
    signoff: 'Have a great first round.',
    leave: 'Go to RoundFlow',
    restart: 'Start the preview again',
  },
  states: {
    loading: 'Checking your invite…',
    missingToken: {
      title: 'This link is incomplete',
      body: 'The invite link is missing part of its address. Open it again from your email, or ask your manager to resend it.',
    },
    invalid: {
      title: 'This invite isn’t valid',
      body: 'We couldn’t find this invite. Ask your manager to send you a new one.',
    },
    used: {
      title: 'This invite has already been used or has expired',
      body: 'If you’ve already set up your login, sign in. Otherwise ask your manager to send a new invite.',
      action: 'Go to sign in',
    },
    wrongAccount: {
      title: 'You’re signed in as someone else',
      body: 'You’re signed in as {current}, but this invite is for {invited}. Sign out, then open the invite again.',
      action: 'Sign out',
      signingOut: 'Signing out…',
    },
    linkExpired: {
      title: 'Your email link has expired',
      body: 'Email links only work for a short time. We can send a fresh one to {email}.',
    },
    needsLink: {
      title: 'Open the link from your email',
      body: 'Your account was created with the invite, so it needs the link from your email to finish. Open the invite email on this device, or we can send a fresh link to {email}.',
    },
    sendLink: 'Email me a new link',
    sendingLink: 'Sending…',
    linkSent: {
      title: 'Check your email',
      body: 'We sent a link to {email}. Open it on this device to finish setting up your login.',
    },
    confirmEmail: {
      title: 'Confirm your email',
      body: 'We sent a confirmation link to {email}. Open it on this device to finish joining your team.',
    },
    backToLogin: 'Back to sign in',
  },
  roles: {
    TECHNICIAN: 'Technician',
    MANAGER: 'Manager',
    ADMIN: 'Admin',
  } as Record<string, string>,
} as const

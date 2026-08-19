import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { AcceptInviteSkeleton } from '@/components/auth/AcceptInviteSkeleton'
import {
  Field,
  FieldError,
  Input,
  PrimaryButton,
} from '@/components/ui'
import { ROUTES } from '@/config/routes'
import { authContent } from '@/content/auth'
import { useAcceptInvite, useInvitePreview } from '@/features/invites/hooks/useInvites'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { stashPendingInvite } from '@/lib/pending-invite'
import { supabase } from '@/lib/supabase'

function inviteErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 410) return authContent.acceptInvite.expired
    if (error.status === 404) return authContent.acceptInvite.notFound
    if (error.status === 403) return error.message
    if (error.status === 400) return error.message
  }
  return error instanceof Error ? error.message : 'Could not load this invite.'
}

/** Public invite accept page — `/accept-invite?token=…` per INVITES_HANDOFF. */
export default function AcceptInvite() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const { session, loading: authLoading } = useAuth()
  const previewQuery = useInvitePreview(token, Boolean(token))
  const acceptInvite = useAcceptInvite()

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const invite = previewQuery.data
  const content = authContent.acceptInvite

  useEffect(() => {
    if (!invite?.email || fullName) return
    const local = invite.email.split('@')[0] ?? ''
    if (local) setFullName(local.replace(/[._-]+/g, ' '))
  }, [fullName, invite?.email])

  useEffect(() => {
    if (!accepted || authLoading || !session) return
    navigate(ROUTES.dashboard, { replace: true })
  }, [accepted, authLoading, navigate, session])

  async function acceptWithSession(accessToken: string, name: string) {
    await acceptInvite.mutateAsync({
      token,
      input: { name },
      accessToken,
    })
    setAccepted(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !invite || loading || acceptInvite.isPending) return

    setError(null)
    setConfirmError(null)

    const name = fullName.trim()
    if (!name) {
      setError('Enter your full name.')
      return
    }

    // Already authenticated — accept without creating another Supabase user.
    if (session?.access_token) {
      setLoading(true)
      try {
        stashPendingInvite(token, name)
        await acceptWithSession(session.access_token, name)
      } catch (err) {
        setError(inviteErrorMessage(err))
      } finally {
        setLoading(false)
      }
      return
    }

    if (!password) {
      setError('Choose a password to create your account.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      stashPendingInvite(token, name)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: name,
            invite_token: token,
          },
          emailRedirectTo: `${window.location.origin}${ROUTES.authCallback}?invite_token=${encodeURIComponent(token)}`,
        },
      })

      if (signUpError) {
        setError(
          /already registered|already been registered/i.test(signUpError.message)
            ? authContent.errors.alreadyRegistered
            : signUpError.message,
        )
        return
      }

      const alreadyRegistered =
        Boolean(data.user) && (data.user?.identities?.length ?? 0) === 0
      if (alreadyRegistered) {
        setError(authContent.errors.alreadyRegistered)
        return
      }

      // Confirm-email OFF: session present — AuthProvider ensureProfile accepts via stash.
      if (data.session?.access_token) {
        // Prefer explicit accept here so UI can show errors before splash navigates.
        try {
          await acceptWithSession(data.session.access_token, name)
        } catch (err) {
          // AuthProvider may still retry via stash; surface the error.
          setError(inviteErrorMessage(err))
        }
        return
      }

      setMagicLinkSent(true)
    } catch (err) {
      setError(inviteErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <InviteState
          title={content.title}
          body={content.missingToken}
          actionHref={ROUTES.login}
          actionLabel="Back to log in"
        />
      </AuthLayout>
    )
  }

  if (previewQuery.isPending) {
    return (
      <AuthLayout>
        <AcceptInviteSkeleton />
      </AuthLayout>
    )
  }

  if (previewQuery.isError || !invite) {
    return (
      <AuthLayout>
        <InviteState
          title={content.title}
          body={inviteErrorMessage(previewQuery.error)}
          actionHref={ROUTES.login}
          actionLabel="Back to log in"
        />
      </AuthLayout>
    )
  }

  if (accepted) {
    return (
      <AuthLayout>
        <p className="text-center text-sm text-muted">{content.successRedirect}</p>
      </AuthLayout>
    )
  }

  if (magicLinkSent) {
    return (
      <AuthLayout>
        <InviteState
          title={content.magicTitle}
          body={content.magicSubtitle.replace('{email}', invite.email)}
          actionHref={ROUTES.login}
          actionLabel={authContent.signupMagicLink.action}
        />
      </AuthLayout>
    )
  }

  const pending = loading || acceptInvite.isPending || authLoading

  return (
    <AuthLayout>
      <div className="space-y-6">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {content.title}
          </h1>
          <p className="text-sm text-muted">{content.subtitle}</p>
          <p className="text-xs font-medium text-primary">
            Invited as {invite.role.replaceAll('_', ' ').toLowerCase()}
          </p>
        </header>

        {session ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            {content.alreadySignedIn}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Field label={content.emailLabel} size="sm" labelWeight="medium">
            <Input
              type="email"
              inputSize="sm"
              value={invite.email}
              readOnly
              className="bg-surface text-muted"
            />
          </Field>

          <Field label={content.nameLabel} required size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Dave Smith"
              disabled={pending}
              autoComplete="name"
            />
          </Field>

          {!session ? (
            <>
              <Field label={content.passwordLabel} required size="sm" labelWeight="medium">
                <Input
                  type="password"
                  inputSize="sm"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                  autoComplete="new-password"
                />
              </Field>
              <Field
                label={content.confirmPasswordLabel}
                required
                size="sm"
                labelWeight="medium"
              >
                <Input
                  type="password"
                  inputSize="sm"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={pending}
                  autoComplete="new-password"
                />
                {confirmError ? <FieldError message={confirmError} /> : null}
              </Field>
            </>
          ) : null}

          {error ? <FieldError message={error} /> : null}

          <PrimaryButton type="submit" disabled={pending} className="w-full">
            {pending
              ? session
                ? content.accepting
                : content.submitting
              : session
                ? content.acceptExisting
                : content.submit}
          </PrimaryButton>
        </form>

        {!session ? (
          <p className="text-center text-xs text-muted">
            <Link to={ROUTES.login} className="font-semibold text-foreground underline">
              {content.loginInstead}
            </Link>
          </p>
        ) : null}
      </div>
    </AuthLayout>
  )
}

function InviteState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string
  body: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted">{body}</p>
      <Link
        to={actionHref}
        className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        {actionLabel}
      </Link>
    </div>
  )
}

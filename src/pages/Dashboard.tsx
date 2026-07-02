import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const user = session?.user
  const displayName = (user?.user_metadata?.full_name as string | undefined) || user?.email

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="h-6 w-6 rounded-[7px] bg-brand" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight text-neutral-900">RoundFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-neutral-500 sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="animate-fade-in-up text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Welcome{displayName ? `, ${displayName}` : ''} 👋
          </h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            You're signed in. Your dashboard is empty for now.
          </p>
        </div>
      </main>
    </div>
  )
}

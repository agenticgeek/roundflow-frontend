import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthAside } from '@/components/AuthAside'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <AuthAside />

      <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 sm:px-10 lg:py-16">
        <div key={pathname} className="w-full max-w-md animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  )
}

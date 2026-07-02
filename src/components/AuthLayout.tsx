import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

const FEATURES = ['Live GPS tracking', 'Automated scheduling', 'Instant payments']

function CheckBadge() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-brand" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="flex flex-col bg-[#0a0a0a] px-6 py-6 text-white sm:px-10 lg:sticky lg:top-0 lg:h-svh lg:w-[38.5%] lg:shrink-0 lg:px-14 lg:py-10 xl:px-16 2xl:px-20">
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 rounded-[7px] bg-brand" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">RoundFlow</span>
        </div>

        <div className="mt-10 mb-4 flex flex-1 flex-col justify-center lg:my-0">
          <h1 className="text-[28px] leading-[1.2] font-bold tracking-tight sm:text-4xl xl:text-[42px]">
            Manage your rounds.
            <br />
            Empower your team.
          </h1>
          <p className="mt-5 max-w-md text-base text-neutral-400 xl:text-lg">
            Track jobs, technicians, payments and complaints — all in one place.
          </p>
          <ul className="mt-8 space-y-4 xl:mt-10">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-[15px] font-medium xl:text-[17px]">
                <CheckBadge />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-sm text-neutral-500 lg:block">
          © 2026 RoundFlow Ltd. All rights reserved.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10 lg:py-16">
        <div key={pathname} className="w-full max-w-md animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  )
}

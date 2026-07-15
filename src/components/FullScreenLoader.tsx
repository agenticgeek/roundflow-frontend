import { site } from '@/content/site'

/** App boot / auth splash — colored RoundFlow wordmark. */
export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center bg-background">
      <div className="flex animate-pulse flex-col items-center gap-4">
        <img
          src={site.logo.src}
          alt={site.logo.alt}
          className="h-12 w-auto sm:h-14"
        />
      </div>
    </div>
  )
}

import { HttpResponse, http } from 'msw'
import type { paths } from '@/api/types.gen'

/**
 * MSW helpers typed from `src/api/types.gen.ts` — a mock body that drifts from the OpenAPI
 * spec fails `tsc`, so handlers can't silently disagree with the backend contract.
 */

/** Same prefix the app uses in dev/test (`apiBaseUrl()` → `/__rf`). */
export const API = '/__rf'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

type Operation<P extends keyof paths, M extends Method> = NonNullable<paths[P][M]>

type ResponsesOf<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { responses: infer R } ? R : never

/** JSON body of the `S` response of `M P`, straight from the spec. */
export type ResponseBody<
  P extends keyof paths,
  M extends Method,
  S extends keyof ResponsesOf<P, M>,
> = ResponsesOf<P, M>[S] extends { content: { 'application/json': infer B } } ? B : never

/** JSON request body of `M P`, straight from the spec. */
export type RequestBody<P extends keyof paths, M extends Method> =
  Operation<P, M> extends { requestBody?: { content: { 'application/json': infer B } } } ? B : never

/** `/payments/{id}/status` → `/__rf/payments/:id/status` (MSW path params). */
export function mswPath(path: string): string {
  return `${API}${path.replace(/\{(\w+)\}/g, ':$1')}`
}

/** A JSON response whose body must match the spec for that status. */
export function specJson<
  P extends keyof paths,
  M extends Method,
  S extends keyof ResponsesOf<P, M> & number,
>(_path: P, _method: M, status: S, body: ResponseBody<P, M, S>) {
  return HttpResponse.json(body as never, { status })
}

/** The `{ error, code? }` envelope every non-2xx uses. */
export function apiError(status: number, error: string, code?: string) {
  return HttpResponse.json({ error, ...(code ? { code } : {}) }, { status })
}

/** `http[method]` on a spec path, with the path rewritten for MSW. */
export function on<P extends keyof paths, M extends Method>(
  method: M,
  path: P,
  resolver: Parameters<(typeof http)[M]>[1],
) {
  return http[method](mswPath(path as string), resolver)
}

/**
 * Holds a handler's response until the test calls `release()`, so a pending state ("Saving…")
 * can be asserted without racing a short `delay()` on a loaded machine.
 */
export function gate() {
  let release!: () => void
  const opened = new Promise<void>((resolve) => (release = resolve))
  return { wait: () => opened, release }
}

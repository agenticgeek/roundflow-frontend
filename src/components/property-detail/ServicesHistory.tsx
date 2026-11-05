import { useState } from 'react'
import type { ServiceSnapshot } from '@/api/properties.api'
import { Pager } from '@/components/ui/pager'
import { propertyDetailContent } from '@/content/property-detail'
import { usePropertyServicesHistory } from '@/features/properties/hooks/useProperties'
import { errorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/utils'

function describe(services: readonly ServiceSnapshot[], none: string) {
  if (services.length === 0) return none
  return services
    .map((service) => `${service.serviceName ?? '—'}${service.price != null ? ` (${formatCurrency(service.price)})` : ''}`)
    .join(', ')
}

/** Service-change log for a property — GET /properties/:id/services/history, newest first. */
export function ServicesHistory({ propertyId }: { propertyId: string }) {
  const copy = propertyDetailContent.servicesHistory
  const [page, setPage] = useState(1)
  const query = usePropertyServicesHistory(propertyId, page)

  return (
    <section className="mt-8 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
      {query.isPending ? (
        <p className="mt-3 text-sm text-muted">{copy.loading}</p>
      ) : query.isError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {errorMessage(query.error)}
        </p>
      ) : query.data.rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{copy.empty}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {query.data.rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  {new Date(row.changedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  {row.actorRole ? <span className="font-normal text-muted"> · {row.actorRole}</span> : null}
                </p>
                <p className="mt-1 text-muted">
                  {copy.before}: {describe(row.oldServices, copy.none)}
                </p>
                <p className="text-foreground">
                  {copy.after}: {describe(row.newServices, copy.none)}
                </p>
              </li>
            ))}
          </ul>
          {query.data.pagination.totalPages > 1 ? (
            <Pager pagination={query.data.pagination} loading={query.isFetching} onPage={setPage} />
          ) : null}
        </>
      )}
    </section>
  )
}

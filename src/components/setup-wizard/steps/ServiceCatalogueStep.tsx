import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { CatalogueService, ServiceCatalogueData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { AddServiceModal } from '@/components/setup-wizard/AddServiceModal'
import { FilterPills } from '@/components/setup-wizard/FilterPills'
import { Input, Toggle } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface ServiceCatalogueStepProps {
  initialValues: ServiceCatalogueData
  onSubmit: (values: ServiceCatalogueData) => void
}

type CategoryFilter = string
type StatusFilter = 'all' | 'active' | 'inactive'

function ServiceCatalogueIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-primary" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.594A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function ServiceCatalogueStep({ initialValues, onSubmit }: ServiceCatalogueStepProps) {
  const { serviceCatalogue } = setupWizardContent
  const { categories, statusFilters, columns, tags, actions } = serviceCatalogue

  const [services, setServices] = useState<CatalogueService[]>(initialValues.services)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<CatalogueService | null>(null)

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.id !== 'all')
        .map((category) => ({ value: category.id, label: category.label })),
    [categories],
  )

  const categoryLabels = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories],
  )

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase()
    return services.filter((service) => {
      const matchesSearch =
        !query ||
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
      const matchesCategory =
        categoryFilter === 'all' || service.categoryId === categoryFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && service.active) ||
        (statusFilter === 'inactive' && !service.active)
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [services, search, categoryFilter, statusFilter])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ services })
  }

  function toggleActive(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
    )
  }

  function deleteService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  function openAddModal() {
    setEditingService(null)
    setModalOpen(true)
  }

  function openEditModal(service: CatalogueService) {
    setEditingService(service)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingService(null)
  }

  function saveService(service: CatalogueService) {
    setServices((prev) => {
      const exists = prev.some((item) => item.id === service.id)
      const next = exists
        ? prev.map((item) => (item.id === service.id ? service : item))
        : [...prev, service]

      if (!service.isDefault) return next

      return next.map((item) =>
        item.id === service.id ? item : { ...item, isDefault: false },
      )
    })
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <ServiceCatalogueIcon />
          <div>
            <h2 className="text-xl font-semibold text-foreground">{serviceCatalogue.heading}</h2>
            <p className="mt-1 text-sm text-muted">{serviceCatalogue.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <span aria-hidden="true">+</span>
          {serviceCatalogue.addService}
        </button>
      </div>

      <Input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={serviceCatalogue.searchPlaceholder}
        aria-label={serviceCatalogue.searchPlaceholder}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          options={categories}
          value={categoryFilter}
          onChange={setCategoryFilter}
          variant="filled"
        />
        <FilterPills
          options={statusFilters as readonly { id: StatusFilter; label: string }[]}
          value={statusFilter}
          onChange={setStatusFilter}
          variant="outline"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[1fr_7rem_6rem_8.5rem] gap-4 border-b border-border bg-surface px-5 py-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
          <span>{columns.service}</span>
          <span className="text-right">{columns.defaultPrice}</span>
          <span className="text-center">{columns.active}</span>
          <span />
        </div>

        <ul className="divide-y divide-border">
          {filteredServices.map((service) => (
            <li
              key={service.id}
              className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_7rem_6rem_8.5rem] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{service.name}</span>
                  {service.isDefault ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      {tags.default}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {categoryLabels[service.categoryId]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{service.description}</p>
              </div>

              <p className="font-semibold text-foreground sm:text-right">
                {formatCurrency(service.price)}
              </p>

              <div className="flex sm:justify-center">
                <Toggle
                  checked={service.active}
                  onChange={() => toggleActive(service.id)}
                  ariaLabel={`${service.name} active`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(service)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                >
                  {actions.edit}
                </button>
                <button
                  type="button"
                  onClick={() => deleteService(service.id)}
                  className="rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/15"
                >
                  {actions.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filteredServices.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">{serviceCatalogue.emptyResults}</p>
        ) : null}
      </div>

      <AddServiceModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveService}
        editingService={editingService}
        categoryOptions={categoryOptions}
      />

      <div className="flex items-start gap-3 rounded-xl bg-primary/10 px-4 py-3.5">
        <InfoIcon />
        <p className="text-sm text-foreground">{serviceCatalogue.infoBanner}</p>
      </div>
    </form>
  )
}

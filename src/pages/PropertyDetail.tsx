import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { CustomerPropertyRecord } from '@/content/customers'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { AppShell } from '@/components/app/AppShell'
import {
  PropertyDetailNotFound,
  PropertyDetailScreen,
} from '@/components/property-detail/PropertyDetailScreen'
import { PropertyDetailSkeleton } from '@/components/property-detail/PropertyDetailSkeleton'
import { useCustomer } from '@/features/customers/hooks/useCustomers'
import { useProperty } from '@/features/properties/hooks/useProperties'
import { ApiError } from '@/lib/errors'
import {
  customerDetailToNotes,
  customerDetailToPayments,
  customerDetailToPropertyRecord,
  customerDetailToVisits,
  mergePropertyIntoCustomerDetail,
} from '@/features/customers/lib/mappers'
import { mapCustomerPaymentBadge } from '@/features/customers/lib/payment-status'
import { useCustomerInvoices } from '@/features/invoices/hooks/useInvoices'
import {
  applyCustomerInvoicesToPayments,
  applyCustomerInvoicesToVisits,
} from '@/features/invoices/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

type LocationState = {
  from?: string
  customerId?: string
}

export default function PropertyDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { propertyId } = useParams()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const state = (location.state as LocationState | null) ?? null

  // GET /properties/:id is this page's source for the property; it also names the customer.
  const propertyQuery = useProperty(propertyId ?? '')
  const customerId = propertyQuery.data?.customerId ?? state?.customerId ?? ''

  const { canMutate } = useAppBootstrap()
  const detailQuery = useCustomer(customerId, Boolean(customerId))
  const invoicesQuery = useCustomerInvoices(customerId, Boolean(customerId) && canMutate)

  const mergedDetail = useMemo(
    () =>
      detailQuery.data && propertyQuery.data
        ? mergePropertyIntoCustomerDetail(detailQuery.data, propertyQuery.data)
        : null,
    [detailQuery.data, propertyQuery.data],
  )
  const property = useMemo(
    () => (mergedDetail ? customerDetailToPropertyRecord(mergedDetail) : null),
    [mergedDetail],
  )

  const tabData = useMemo(() => {
    if (!detailQuery.data) return null
    const payments = customerDetailToPayments(detailQuery.data)
    return {
      visits: applyCustomerInvoicesToVisits(
        customerDetailToVisits(detailQuery.data),
        invoicesQuery.data,
      ),
      // null = TECHNICIAN (endpoint omits payments); array = loaded
      payments:
        payments === undefined
          ? null
          : applyCustomerInvoicesToPayments(payments, invoicesQuery.data),
      notes: customerDetailToNotes(detailQuery.data),
    }
  }, [detailQuery.data, invoicesQuery.data])

  const customerRecordForModal = useMemo((): CustomerPropertyRecord | null => {
    if (!detailQuery.data?.customer?.id || !property) return null
    return {
      id: detailQuery.data.customer.id,
      propertyId: property.id,
      customer: property.customerName,
      address: property.fullAddress,
      status: property.serviceStatus === 'hold' ? 'hold' : 'active',
      round: property.assignedRound,
      frequency: property.frequency,
      price: property.price,
      technician: property.technician,
      nextDue: property.nextDue,
      paymentStatus: mapCustomerPaymentBadge(detailQuery.data.standingInfo?.paymentStatus),
      needsAssignment: property.needsAssignment,
    }
  }, [detailQuery.data, property])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  function handleBack() {
    // Deep links and cancelled records land on the customer list, not the planner.
    navigate(state?.from === 'round-planner' ? ROUTES.roundPlanner : ROUTES.customers, {
      state: state?.from === 'round-planner' ? { view: 'list' } : undefined,
    })
  }

  const resolving =
    propertyQuery.isPending ||
    (Boolean(customerId) && detailQuery.isPending)

  return (
    <AppShell
      quickActions={quickActions}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      mainMaxWidthClass="max-w-7xl"
    >
      {resolving ? (
        <PropertyDetailSkeleton />
      ) : detailQuery.isError || (propertyQuery.isError && !(propertyQuery.error instanceof ApiError && propertyQuery.error.status === 404)) ? (
        <PanelCard interactive={false} className="py-16 text-center text-sm text-muted">
          <p>Could not load this customer.</p>
          <button
            type="button"
            className={cn(dashboardCtaClass, 'mt-3')}
            onClick={() => void detailQuery.refetch()}
          >
            Retry
          </button>
        </PanelCard>
      ) : property && customerId ? (
        <PropertyDetailScreen
          property={property}
          customerRecord={customerRecordForModal}
          customerId={customerId}
          tabData={tabData}
          badDebt={Boolean(detailQuery.data?.customer?.badDebt)}
          onBack={handleBack}
        />
      ) : (
        <PropertyDetailNotFound onBack={handleBack} />
      )}
    </AppShell>
  )
}

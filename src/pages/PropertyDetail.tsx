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
import { useCustomer, useCustomers } from '@/features/customers/hooks/useCustomers'
import {
  customerDetailToNotes,
  customerDetailToPayments,
  customerDetailToPropertyRecord,
  customerDetailToVisits,
  customerListRowToRecord,
} from '@/features/customers/lib/mappers'
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

  // Resolve customerId from navigation state, or look up by propertyId in the list.
  const listQuery = useCustomers({ pageSize: 100 }, !state?.customerId && Boolean(propertyId))
  const customerId = useMemo(() => {
    if (state?.customerId) return state.customerId
    const match = (listQuery.data?.customers ?? []).find((row) => row.propertyId === propertyId)
    return match?.customerId ?? ''
  }, [listQuery.data?.customers, propertyId, state?.customerId])

  const { canMutate } = useAppBootstrap()
  const detailQuery = useCustomer(customerId, Boolean(customerId))
  const invoicesQuery = useCustomerInvoices(customerId, Boolean(customerId) && canMutate)

  const property = useMemo(
    () => (detailQuery.data ? customerDetailToPropertyRecord(detailQuery.data) : null),
    [detailQuery.data],
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
    const listRow = (listQuery.data?.customers ?? []).find(
      (row) => row.customerId === detailQuery.data?.customer?.id,
    )
    if (listRow) return customerListRowToRecord(listRow)
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
      paymentStatus: property.paymentStatus,
      needsAssignment: property.needsAssignment,
    }
  }, [detailQuery.data, listQuery.data?.customers, property])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  function handleBack() {
    if (state?.from === 'customers') {
      navigate(ROUTES.customers)
      return
    }
    navigate(ROUTES.roundPlanner, { state: { view: 'list' } })
  }

  const resolving =
    (!state?.customerId && listQuery.isPending) ||
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
      ) : detailQuery.isError ? (
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
          onBack={handleBack}
        />
      ) : (
        <PropertyDetailNotFound onBack={handleBack} />
      )}
    </AppShell>
  )
}

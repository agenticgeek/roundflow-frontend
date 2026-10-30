/* eslint-disable react-refresh/only-export-components -- route module: lazy page
   consts live beside the `router` export; this file isn't hot-reloaded as a component. */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import {
  GuestRoute,
  IntegrationsReturnRoute,
  ProtectedRoute,
  SetupRoute,
  StripeCallbackRoute,
  TechnicianAppRoute,
} from '@/providers/RouteGuards'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { RouteError } from '@/components/RouteError'

// Auth / entry pages stay eager — they're the first paint for a logged-out user,
// and small, so a lazy chunk would only add a loading flash.
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import AuthCallback from '@/pages/AuthCallback'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import AcceptInvite from '@/pages/AcceptInvite'

// Authenticated app pages are code-split — each becomes its own chunk, so the
// initial load only pulls the page you land on instead of the whole app.
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Emergencies = lazy(() => import('@/pages/Emergencies'))
const RoundPlanner = lazy(() => import('@/pages/RoundPlanner'))
const PropertyDetail = lazy(() => import('@/pages/PropertyDetail'))
const TodaysWork = lazy(() => import('@/pages/TodaysWork'))
const Customers = lazy(() => import('@/pages/Customers'))
const DebtPayment = lazy(() => import('@/pages/DebtPayment'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const Reports = lazy(() => import('@/pages/Reports'))
const Complaints = lazy(() => import('@/pages/Complaints'))
const Settings = lazy(() => import('@/pages/Settings'))
const StripeCallback = lazy(() => import('@/pages/StripeCallback'))
const Technicians = lazy(() => import('@/pages/Technicians'))
const SetupWizard = lazy(() => import('@/pages/SetupWizard'))
const SetupLive = lazy(() => import('@/pages/SetupLive'))
const AssignTechnicians = lazy(() => import('@/pages/AssignTechnicians'))
const TechnicianApp = lazy(() => import('@/pages/TechnicianApp'))
const TechnicianSetup = lazy(() => import('@/pages/TechnicianSetup'))

/** Wrap a lazy page element in a Suspense boundary with the app's loader. */
function page(node: ReactNode) {
  return <Suspense fallback={<FullScreenLoader />}>{node}</Suspense>
}

const technicianRoutes = [
  ROUTES.technicianNew,
  ROUTES.technicianEdit,
  ROUTES.technicianConversation,
  ROUTES.technicianPhotos,
  ROUTES.technicianDetail,
  ROUTES.technicians,
] as const

/** Route config built entirely from ROUTES constants — no path strings inline. */
export const routes: RouteObject[] = [
  { path: ROUTES.home, element: <Navigate to={ROUTES.dashboard} replace /> },
  {
    path: ROUTES.technicianApp,
    element: <TechnicianAppRoute>{page(<TechnicianApp />)}</TechnicianAppRoute>,
  },
  {
    path: ROUTES.setupWizard,
    element: <SetupRoute>{page(<SetupWizard />)}</SetupRoute>,
  },
  {
    // Outside SetupRoute: setup is complete by the time this opens.
    path: ROUTES.setupLive,
    element: <ProtectedRoute>{page(<SetupLive />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.dashboard,
    element: <ProtectedRoute>{page(<Dashboard />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.emergencies,
    element: <ProtectedRoute>{page(<Emergencies />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.roundPlanner,
    element: <ProtectedRoute>{page(<RoundPlanner />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.roundPlannerAssign,
    element: <ProtectedRoute>{page(<AssignTechnicians />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.propertyDetail,
    element: <ProtectedRoute>{page(<PropertyDetail />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.todaysWork,
    element: <ProtectedRoute>{page(<TodaysWork />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.customers,
    element: <ProtectedRoute>{page(<Customers />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.settings,
    element: <ProtectedRoute>{page(<Settings />)}</ProtectedRoute>,
  },
  {
    // Stripe's OAuth return lands here — Settings opens on the Payment section, or the setup
    // wizard's Payments step when setup isn't finished yet.
    path: ROUTES.settingsIntegrations,
    element: <IntegrationsReturnRoute>{page(<Settings />)}</IntegrationsReturnRoute>,
  },
  {
    // Stripe Connect redirect URI — finishes the OAuth exchange with the bearer token.
    path: ROUTES.stripeCallback,
    element: <StripeCallbackRoute>{page(<StripeCallback />)}</StripeCallbackRoute>,
  },
  {
    path: ROUTES.debtPayment,
    element: <ProtectedRoute>{page(<DebtPayment />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.invoices,
    element: <ProtectedRoute>{page(<Invoices />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.reportsHistory,
    element: <ProtectedRoute>{page(<Reports />)}</ProtectedRoute>,
  },
  {
    path: ROUTES.complaints,
    element: <ProtectedRoute>{page(<Complaints />)}</ProtectedRoute>,
  },
  ...technicianRoutes.map((path) => ({
    path,
    element: <ProtectedRoute>{page(<Technicians />)}</ProtectedRoute>,
  })),
  {
    path: ROUTES.login,
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    ),
  },
  {
    path: ROUTES.signup,
    element: (
      <GuestRoute>
        <Signup />
      </GuestRoute>
    ),
  },
  { path: ROUTES.authCallback, element: <AuthCallback /> },
  {
    path: ROUTES.acceptInvite,
    element: <AcceptInvite />,
  },
  {
    // Public: reached from a technician's invite email, signed in or not.
    path: ROUTES.technicianSetup,
    element: page(<TechnicianSetup />),
  },
  {
    path: ROUTES.forgotPassword,
    element: (
      <GuestRoute>
        <ForgotPassword />
      </GuestRoute>
    ),
  },
  { path: ROUTES.resetPassword, element: <ResetPassword /> },
  { path: '*', element: <Navigate to={ROUTES.home} replace /> },
].map((route) => ({ ...route, errorElement: <RouteError /> })) // GAP-024: a crash never blanks the app

export const router = createBrowserRouter(routes)

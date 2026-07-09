import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { GuestRoute, ProtectedRoute, SetupRoute } from '@/lib/auth'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import RoundPlanner from '@/pages/RoundPlanner'
import PropertyDetail from '@/pages/PropertyDetail'
import TodaysWork from '@/pages/TodaysWork'
import { AppModulePlaceholder } from '@/pages/AppModulePlaceholder'
import SetupWizard from '@/pages/SetupWizard'

const placeholderModules = [
  { path: ROUTES.customers, moduleId: 'customers' },
  { path: ROUTES.debtPayment, moduleId: 'debt-payment' },
  { path: ROUTES.reportsHistory, moduleId: 'reports-history' },
  { path: ROUTES.complaints, moduleId: 'complaints' },
  { path: ROUTES.settings, moduleId: 'settings' },
  { path: ROUTES.technicians, moduleId: 'technicians' },
] as const

/** Router config built entirely from ROUTES constants — no path strings inline. */
export const router = createBrowserRouter([
  { path: ROUTES.home, element: <Navigate to={ROUTES.dashboard} replace /> },
  {
    path: ROUTES.setupWizard,
    element: (
      <SetupRoute>
        <SetupWizard />
      </SetupRoute>
    ),
  },
  {
    path: ROUTES.dashboard,
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.roundPlanner,
    element: (
      <ProtectedRoute>
        <RoundPlanner />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.propertyDetail,
    element: (
      <ProtectedRoute>
        <PropertyDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.todaysWork,
    element: (
      <ProtectedRoute>
        <TodaysWork />
      </ProtectedRoute>
    ),
  },
  ...placeholderModules.map(({ path, moduleId }) => ({
    path,
    element: (
      <ProtectedRoute>
        <AppModulePlaceholder moduleId={moduleId} />
      </ProtectedRoute>
    ),
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
  { path: ROUTES.forgotPassword, element: <ForgotPassword /> },
  { path: ROUTES.resetPassword, element: <ResetPassword /> },
  { path: '*', element: <Navigate to={ROUTES.home} replace /> },
])

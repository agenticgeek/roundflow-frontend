import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { GuestRoute, ProtectedRoute, SetupRoute } from '@/providers/RouteGuards'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import AuthCallback from '@/pages/AuthCallback'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import RoundPlanner from '@/pages/RoundPlanner'
import PropertyDetail from '@/pages/PropertyDetail'
import TodaysWork from '@/pages/TodaysWork'
import Customers from '@/pages/Customers'
import DebtPayment from '@/pages/DebtPayment'
import Reports from '@/pages/Reports'
import Complaints from '@/pages/Complaints'
import Settings from '@/pages/Settings'
import Technicians from '@/pages/Technicians'
import SetupWizard from '@/pages/SetupWizard'

const technicianRoutes = [
  ROUTES.technicianNew,
  ROUTES.technicianEdit,
  ROUTES.technicianConversation,
  ROUTES.technicianPhotos,
  ROUTES.technicianDetail,
  ROUTES.technicians,
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
  {
    path: ROUTES.customers,
    element: (
      <ProtectedRoute>
        <Customers />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.settings,
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.debtPayment,
    element: (
      <ProtectedRoute>
        <DebtPayment />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.reportsHistory,
    element: (
      <ProtectedRoute>
        <Reports />
      </ProtectedRoute>
    ),
  },
  {
    path: ROUTES.complaints,
    element: (
      <ProtectedRoute>
        <Complaints />
      </ProtectedRoute>
    ),
  },
  ...technicianRoutes.map((path) => ({
    path,
    element: (
      <ProtectedRoute>
        <Technicians />
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
  { path: ROUTES.authCallback, element: <AuthCallback /> },
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
])

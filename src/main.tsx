import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@/styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { AppBootstrapProvider } from '@/providers/AppBootstrapProvider'
import { QueryProvider } from '@/providers/QueryProvider'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <AppBootstrapProvider>
            <RouterProvider router={router} />
          </AppBootstrapProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  </StrictMode>,
)

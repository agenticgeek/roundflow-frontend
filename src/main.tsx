import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@/styles/globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)

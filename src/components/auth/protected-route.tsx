import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { useAuth } from '@/components/auth/use-auth'

export function ProtectedRoute() {
  const location = useLocation()
  const { status, user } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

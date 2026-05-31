import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { useAuth } from '@/components/auth/use-auth'

export function GuestRoute() {
  const location = useLocation()
  const { status, user } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (user) {
    const nextPath =
      typeof location.state === 'object' &&
      location.state &&
      'from' in location.state &&
      typeof location.state.from === 'object' &&
      location.state.from &&
      'pathname' in location.state.from &&
      typeof location.state.from.pathname === 'string'
        ? location.state.from.pathname
        : '/'

    return <Navigate to={nextPath} replace />
  }

  return <Outlet />
}

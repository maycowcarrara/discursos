import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { RouteLoadingScreen } from '@/components/app/route-loading-screen'
import { GuestRoute } from '@/components/auth/guest-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import {
  AppShell,
  AssignmentsPage,
  CongregationsPage,
  DashboardPage,
  HistoryPage,
  LoginPage,
  PublicAssignmentConfirmationPage,
  SettingsPage,
  SpeakersPage,
  ThemesPage,
} from '@/router/lazy-pages'

function withRouteLoadingFallback(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingScreen />}>{element}</Suspense>
}

export const appRouter = createBrowserRouter([
  {
    path: '/confirmacao/designacao',
    element: withRouteLoadingFallback(<PublicAssignmentConfirmationPage />),
  },
  {
    path: '/login',
    element: <GuestRoute />,
    children: [
      {
        index: true,
        element: withRouteLoadingFallback(<LoginPage />),
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: withRouteLoadingFallback(<AppShell />),
        children: [
          {
            index: true,
            element: withRouteLoadingFallback(<DashboardPage />),
          },
          {
            path: 'congregacoes',
            element: withRouteLoadingFallback(<CongregationsPage />),
          },
          {
            path: 'oradores',
            element: withRouteLoadingFallback(<SpeakersPage />),
          },
          {
            path: 'temas',
            element: withRouteLoadingFallback(<ThemesPage />),
          },
          {
            path: 'designacoes',
            element: withRouteLoadingFallback(<AssignmentsPage />),
          },
          {
            path: 'historico',
            element: withRouteLoadingFallback(<HistoryPage />),
          },
          {
            path: 'configuracoes',
            element: withRouteLoadingFallback(<SettingsPage />),
          },
        ],
      },
    ],
  },
])

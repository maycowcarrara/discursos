import { createBrowserRouter } from 'react-router-dom'

import { GuestRoute } from '@/components/auth/guest-route'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppShell } from '@/components/layout/app-shell'
import { AssignmentsPage } from '@/pages/assignments-page'
import { CalendarPage } from '@/pages/calendar-page'
import { CongregationsPage } from '@/pages/congregations-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { HistoryPage } from '@/pages/history-page'
import { LoginPage } from '@/pages/login-page'
import { SettingsPage } from '@/pages/settings-page'
import { SpeakersPage } from '@/pages/speakers-page'
import { ThemesPage } from '@/pages/themes-page'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <GuestRoute />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'congregacoes',
            element: <CongregationsPage />,
          },
          {
            path: 'oradores',
            element: <SpeakersPage />,
          },
          {
            path: 'temas',
            element: <ThemesPage />,
          },
          {
            path: 'agenda',
            element: <CalendarPage />,
          },
          {
            path: 'designacoes',
            element: <AssignmentsPage />,
          },
          {
            path: 'historico',
            element: <HistoryPage />,
          },
          {
            path: 'configuracoes',
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
])

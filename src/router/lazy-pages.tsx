import { lazy } from 'react'

export const AppShell = lazy(() =>
  import('@/components/layout/app-shell').then((module) => ({
    default: module.AppShell,
  })),
)

export const AssignmentsPage = lazy(() =>
  import('@/pages/assignments-page').then((module) => ({
    default: module.AssignmentsPage,
  })),
)

export const CongregationsPage = lazy(() =>
  import('@/pages/congregations-page').then((module) => ({
    default: module.CongregationsPage,
  })),
)

export const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
)

export const HistoryPage = lazy(() =>
  import('@/pages/history-page').then((module) => ({
    default: module.HistoryPage,
  })),
)

export const LoginPage = lazy(() =>
  import('@/pages/login-page').then((module) => ({
    default: module.LoginPage,
  })),
)

export const PublicAssignmentConfirmationPage = lazy(() =>
  import('@/pages/public-assignment-confirmation-page').then((module) => ({
    default: module.PublicAssignmentConfirmationPage,
  })),
)

export const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const SpeakersPage = lazy(() =>
  import('@/pages/speakers-page').then((module) => ({
    default: module.SpeakersPage,
  })),
)

export const ThemesPage = lazy(() =>
  import('@/pages/themes-page').then((module) => ({
    default: module.ThemesPage,
  })),
)

import type { User } from 'firebase/auth'

import { env } from '@/config/env'
import { firebaseAuth } from '@/lib/firebase-auth'

export const adminAccessRequiredErrorCode = 'auth/admin-access-required'

export class AdminAccessRequiredError extends Error {
  readonly code = adminAccessRequiredErrorCode
}

export type AdminUser = {
  displayName: string | null
  email: string
  hasAdminClaim: boolean
  hasFirebaseAccount: boolean
}

type AdminUsersResponse = {
  users: AdminUser[]
}

function getWorkerBaseUrl() {
  const workerBaseUrl = env.VITE_PUBLIC_NOTIFICATION_WORKER_URL?.trim()

  if (!workerBaseUrl) {
    throw new Error(
      'Configure VITE_PUBLIC_NOTIFICATION_WORKER_URL para habilitar a gestão administrativa.',
    )
  }

  return workerBaseUrl.replace(/\/+$/, '')
}

function buildWorkerUrl(path: string) {
  return new URL(path, `${getWorkerBaseUrl()}/`)
}

function isAdminUser(value: unknown): value is AdminUser {
  return (
    value !== null &&
    typeof value === 'object' &&
    'displayName' in value &&
    (value.displayName === null || typeof value.displayName === 'string') &&
    'email' in value &&
    typeof value.email === 'string' &&
    'hasAdminClaim' in value &&
    typeof value.hasAdminClaim === 'boolean' &&
    'hasFirebaseAccount' in value &&
    typeof value.hasFirebaseAccount === 'boolean'
  )
}

function isAdminUsersResponse(value: unknown): value is AdminUsersResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'users' in value &&
    Array.isArray(value.users) &&
    value.users.every((user) => isAdminUser(user))
  )
}

function getWorkerErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Não foi possível concluir a operação administrativa.'
}

function waitForAdminClaimRetry(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

async function refreshUntilAdminClaimIsAvailable(user: User) {
  const retryDelaysMs = [0, 300, 900, 1800] as const

  for (const retryDelayMs of retryDelaysMs) {
    if (retryDelayMs > 0) {
      await waitForAdminClaimRetry(retryDelayMs)
    }

    const tokenResult = await user.getIdTokenResult(true)

    if (tokenResult.claims.admin === true) {
      return
    }
  }

  throw new AdminAccessRequiredError(
    'A conta foi aprovada, mas a claim administrativa ainda não ficou disponível. Tente entrar novamente.',
  )
}

async function requestAdminUsers(
  init?: RequestInit,
): Promise<AdminUsersResponse> {
  const user = firebaseAuth.currentUser

  if (!user) {
    throw new AdminAccessRequiredError('Sessão administrativa ausente.')
  }

  const response = await fetch(buildWorkerUrl('/api/admin/users'), {
    ...init,
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const payload = (await response.json()) as unknown

  if (!response.ok) {
    throw new Error(getWorkerErrorMessage(payload))
  }

  if (!isAdminUsersResponse(payload)) {
    throw new Error('Resposta invalida do worker administrativo.')
  }

  return payload
}

export async function reconcileAdminAccess(user: User) {
  const currentTokenResult = await user.getIdTokenResult()
  const hadAdminClaim = currentTokenResult.claims.admin === true
  const response = await fetch(
    buildWorkerUrl('/api/public/admin-access/reconcile'),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentTokenResult.token}`,
        'Content-Type': 'application/json',
      },
    },
  )
  const payload = (await response.json()) as unknown

  if (!response.ok) {
    throw new AdminAccessRequiredError(getWorkerErrorMessage(payload))
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'tokenRefreshRequired' in payload &&
    payload.tokenRefreshRequired === true
  ) {
    await refreshUntilAdminClaimIsAvailable(user)
    return
  }

  if (!hadAdminClaim) {
    await refreshUntilAdminClaimIsAvailable(user)
  }
}

export async function getAdminUsers() {
  return (await requestAdminUsers()).users
}

export async function addAdminUser(email: string) {
  return (
    await requestAdminUsers({
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
  ).users
}

export async function removeAdminUser(email: string) {
  return (
    await requestAdminUsers({
      method: 'DELETE',
      body: JSON.stringify({
        email,
      }),
    })
  ).users
}

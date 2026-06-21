import { env } from '@/config/env'
import { firebaseAuth } from '@/lib/firebase-auth'

export type ImmediateCalendarSyncResult =
  | 'created'
  | 'deleted'
  | 'skipped'
  | 'updated'

function getWorkerUrl() {
  const workerBaseUrl = env.VITE_PUBLIC_NOTIFICATION_WORKER_URL?.trim()

  if (!workerBaseUrl) {
    throw new Error(
      'Configure VITE_PUBLIC_NOTIFICATION_WORKER_URL para habilitar a sincronização imediata.',
    )
  }

  return new URL(
    '/api/admin/process-calendar-sync',
    `${workerBaseUrl.replace(/\/+$/, '')}/`,
  )
}

function getResponseMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Não foi possível sincronizar a agenda.'
}

function getProcessResult(payload: unknown): ImmediateCalendarSyncResult | null {
  if (!payload || typeof payload !== 'object' || !('result' in payload)) {
    return null
  }

  return payload.result === 'created' ||
    payload.result === 'deleted' ||
    payload.result === 'skipped' ||
    payload.result === 'updated'
    ? payload.result
    : null
}

export async function processGoogleCalendarSyncImmediately(calendarEventId: string) {
  const user = firebaseAuth.currentUser

  if (!user) {
    throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  }

  const response = await fetch(getWorkerUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ calendarEventId }),
  })
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getResponseMessage(payload))
  }

  const result = getProcessResult(payload)

  if (!result) {
    throw new Error('O Worker retornou uma resposta de sincronização inválida.')
  }

  return result
}

import { env } from '@/config/env'
import { firebaseAuth } from '@/lib/firebase-auth'

export type ImmediateEmailProcessResult = 'requeued' | 'sent'

function getWorkerUrl() {
  const workerBaseUrl = env.VITE_PUBLIC_NOTIFICATION_WORKER_URL?.trim()

  if (!workerBaseUrl) {
    throw new Error(
      'Configure VITE_PUBLIC_NOTIFICATION_WORKER_URL para habilitar o envio imediato.',
    )
  }

  return new URL(
    '/api/admin/process-manual-notification',
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

  return 'Não foi possível enviar o e-mail de confirmação.'
}

function getProcessResult(payload: unknown): ImmediateEmailProcessResult | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'result' in payload &&
    (payload.result === 'sent' || payload.result === 'requeued')
  ) {
    return payload.result
  }

  return null
}

export async function processManualNotificationImmediately(notificationId: string) {
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
    body: JSON.stringify({ notificationId }),
  })
  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(getResponseMessage(payload))
  }

  const result = getProcessResult(payload)

  if (!result) {
    throw new Error('O worker retornou uma resposta de envio inválida.')
  }

  return result
}

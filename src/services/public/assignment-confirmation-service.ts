import type { AssignmentStatus } from '@/types/firestore'

import { env } from '@/config/env'

export type PublicAssignmentConfirmationState =
  | 'pending'
  | 'confirmed'
  | 'inactive'
  | 'invalid'
  | 'conflict'

export type PublicAssignmentConfirmationSummary = {
  assignmentId: string
  eventDateLabel: string
  localCongregationName: string
  originCongregationName: string
  speakerName: string
  status: AssignmentStatus
  themeNumber: number
  themeTitle: string
}

export type PublicAssignmentConfirmationResponse = {
  assignment: PublicAssignmentConfirmationSummary | null
  message: string
  state: PublicAssignmentConfirmationState
}

type ConfirmationRequestInput = {
  assignmentId: string
  token: string
}

const confirmationEndpointPath = '/api/public/assignment-confirmation'

function isStructuredConfirmationResponse(
  payload: unknown,
): payload is PublicAssignmentConfirmationResponse {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  return (
    'message' in payload &&
    typeof payload.message === 'string' &&
    'state' in payload &&
    typeof payload.state === 'string'
  )
}

function getWorkerBaseUrl() {
  const workerBaseUrl = env.VITE_PUBLIC_NOTIFICATION_WORKER_URL?.trim()

  if (!workerBaseUrl) {
    throw new Error(
      'Configure VITE_PUBLIC_NOTIFICATION_WORKER_URL para habilitar a confirmação pública por link.',
    )
  }

  return workerBaseUrl.replace(/\/+$/, '')
}

function buildEndpointUrl(input: ConfirmationRequestInput) {
  const endpointUrl = new URL(
    confirmationEndpointPath,
    `${getWorkerBaseUrl()}/`,
  )

  endpointUrl.searchParams.set('assignmentId', input.assignmentId.trim())
  endpointUrl.searchParams.set('token', input.token.trim())

  return endpointUrl
}

async function parseResponse(response: Response) {
  const payload = (await response.json()) as unknown

  if (!isStructuredConfirmationResponse(payload)) {
    throw new Error('Resposta inválida do worker de confirmação pública.')
  }

  if (!response.ok && payload.state !== 'invalid' && payload.state !== 'conflict') {
    throw new Error(payload.message)
  }

  return payload
}

export async function getPublicAssignmentConfirmation(
  input: ConfirmationRequestInput,
) {
  const response = await fetch(buildEndpointUrl(input), {
    method: 'GET',
  })

  return parseResponse(response)
}

export async function confirmAssignmentByPublicLink(
  input: ConfirmationRequestInput,
) {
  const response = await fetch(buildEndpointUrl(input), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assignmentId: input.assignmentId.trim(),
      token: input.token.trim(),
    }),
  })

  return parseResponse(response)
}

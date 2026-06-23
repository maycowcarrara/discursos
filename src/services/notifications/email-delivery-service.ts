import { Timestamp, doc, writeBatch } from 'firebase/firestore'

import { env } from '@/config/env'
import { firebaseDb } from '@/lib/firebase-db'
import { appendAuditLogToBatch } from '@/services/firestore/audit-log-writes'
import type { ManualAssignmentEmailDelivery } from '@/services/firestore/assignments-service'
import { assignmentStatusLabels, calendarEventTypeLabels } from '@/utils/calendar-events'

export type ImmediateEmailProcessResult = 'sent'

const emailJsSendUrl = 'https://api.emailjs.com/api/v1.0/email/send'
const confirmationBaseUrl = 'https://discursos-15891.web.app/confirmacao/designacao'

function getEmailJsConfiguration() {
  const serviceId = env.VITE_EMAILJS_SERVICE_ID?.trim()
  const templateId = env.VITE_EMAILJS_TEMPLATE_ID?.trim()
  const publicKey = env.VITE_EMAILJS_PUBLIC_KEY?.trim()

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configure as credenciais do EmailJS para habilitar o envio imediato.')
  }

  return { publicKey, serviceId, templateId }
}

function buildConfirmationUrl(delivery: ManualAssignmentEmailDelivery) {
  const url = new URL(confirmationBaseUrl)

  url.searchParams.set('assignmentId', delivery.assignmentId)
  url.searchParams.set('token', delivery.confirmationToken)

  return url.toString()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildMapLinkHtml(mapsUrl: string) {
  const normalizedMapsUrl = mapsUrl.trim()

  if (!normalizedMapsUrl) {
    return ''
  }

  return `<a href="${escapeHtml(normalizedMapsUrl)}" target="_blank" rel="noopener noreferrer">Ver mapa</a>`
}

function buildCongregationNameTemplateValue(name: string, mapsUrl: string) {
  const mapLinkHtml = buildMapLinkHtml(mapsUrl)

  if (!mapLinkHtml) {
    return name
  }

  return `${escapeHtml(name)} ${mapLinkHtml}`
}

async function updateDeliveryStatus(
  delivery: ManualAssignmentEmailDelivery,
  result: { errorMessage: string | null; status: 'failed' | 'sent' },
) {
  const now = Timestamp.now()
  const batch = writeBatch(firebaseDb)
  const notificationRef = doc(firebaseDb, 'notifications', delivery.notificationId)

  batch.update(notificationRef, {
    errorMessage: result.errorMessage,
    retryCount: result.status === 'failed' ? 1 : 0,
    sentAt: result.status === 'sent' ? now : null,
    status: result.status,
    updatedAt: now,
  })
  appendAuditLogToBatch(batch, {
    entityType: 'notification',
    entityId: delivery.notificationId,
    action: 'sync',
    actorUid: delivery.actorUid,
    actorName: delivery.actorName,
    before: { status: 'pending' },
    after: {
      errorMessage: result.errorMessage,
      status: result.status,
    },
    metadata: {
      source: 'assignments-phase-11',
      trigger: 'manual-confirmation-email-browser',
    },
    createdAt: now,
  })

  await batch.commit()
}

export async function processManualNotificationImmediately(
  delivery: ManualAssignmentEmailDelivery,
): Promise<ImmediateEmailProcessResult> {
  const configuration = getEmailJsConfiguration()
  let response: Response

  try {
    response = await fetch(emailJsSendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: configuration.serviceId,
        template_id: configuration.templateId,
        user_id: configuration.publicKey,
        template_params: {
          email_subject: delivery.subject,
          confirmation_url: buildConfirmationUrl(delivery),
          event_date: new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'full',
            timeZone: 'America/Sao_Paulo',
          }).format(delivery.eventDate),
          event_type_label: calendarEventTypeLabels[delivery.eventType],
          local_congregation_map_link: buildMapLinkHtml(
            delivery.localCongregationMapsUrl,
          ),
          local_congregation_maps_url: delivery.localCongregationMapsUrl,
          local_congregation_name: buildCongregationNameTemplateValue(
            delivery.localCongregationName,
            delivery.localCongregationMapsUrl,
          ),
          notes: delivery.notes,
          notification_type_label: 'Envio manual',
          organization_name: delivery.organizationName.trim() || 'Congregação local',
          origin_congregation_name: delivery.originCongregationName,
          reply_to: '',
          speaker_name: delivery.speakerName,
          status_label: assignmentStatusLabels[delivery.status],
          theme_number: String(delivery.themeNumber),
          theme_title: delivery.themeTitle,
          to_email: delivery.recipientEmail,
        },
      }),
    })
  } catch {
    const message = 'Não foi possível acessar o serviço de e-mail.'
    await updateDeliveryStatus(delivery, { errorMessage: message, status: 'failed' })
    throw new Error(message)
  }

  if (!response.ok) {
    const message = (await response.text()).trim() || 'Falha ao enviar e-mail pelo EmailJS.'
    await updateDeliveryStatus(delivery, { errorMessage: message, status: 'failed' })
    throw new Error(message)
  }

  await updateDeliveryStatus(delivery, { errorMessage: null, status: 'sent' })

  return 'sent'
}

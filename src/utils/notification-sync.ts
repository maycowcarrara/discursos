import type { NotificationDocument } from '../types/firestore.js'

function hasNotificationDeliveryIdentityChanged(
  existingNotification: NotificationDocument,
  nextNotification: NotificationDocument,
) {
  return (
    existingNotification.recipientEmail !== nextNotification.recipientEmail ||
    existingNotification.subject !== nextNotification.subject ||
    (existingNotification.speakerId ?? null) !== (nextNotification.speakerId ?? null) ||
    existingNotification.scheduledFor.toMillis() !== nextNotification.scheduledFor.toMillis()
  )
}

export function mergeNotificationDocumentForSync(
  existingNotification: NotificationDocument | null,
  nextNotification: NotificationDocument,
): NotificationDocument {
  if (!existingNotification) {
    return nextNotification
  }

  if (hasNotificationDeliveryIdentityChanged(existingNotification, nextNotification)) {
    return nextNotification
  }

  const mergedLifecycleState = {
    errorMessage: existingNotification.errorMessage ?? null,
    retryCount: existingNotification.retryCount,
    sentAt: existingNotification.sentAt ?? null,
  }

  if (nextNotification.status === 'cancelled') {
    if (
      existingNotification.status === 'sent' ||
      existingNotification.status === 'failed' ||
      existingNotification.status === 'cancelled'
    ) {
      return {
        ...nextNotification,
        ...mergedLifecycleState,
        status: existingNotification.status,
      }
    }

    return nextNotification
  }

  if (existingNotification.status === 'cancelled') {
    return nextNotification
  }

  return {
    ...nextNotification,
    ...mergedLifecycleState,
    status: existingNotification.status,
  }
}

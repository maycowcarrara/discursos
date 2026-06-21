import type { NotificationDocument } from '../types/firestore.js'

type TimestampLike = {
  toMillis(): number
}

export function isTimestampInCurrentAssignmentRevision(
  candidateTimestamp: TimestampLike | null | undefined,
  assignmentUpdatedAt: TimestampLike,
) {
  return (
    candidateTimestamp !== null &&
    candidateTimestamp !== undefined &&
    candidateTimestamp.toMillis() >= assignmentUpdatedAt.toMillis()
  )
}

function hasNotificationDeliveryIdentityChanged(
  existingNotification: NotificationDocument,
  nextNotification: NotificationDocument,
) {
  return (
    existingNotification.recipientEmail !== nextNotification.recipientEmail ||
    existingNotification.subject !== nextNotification.subject ||
    (existingNotification.speakerId ?? null) !== (nextNotification.speakerId ?? null)
  )
}

export function mergeNotificationDocumentForSync(
  existingNotification: NotificationDocument | null,
  nextNotification: NotificationDocument,
  options: {
    forceRestart?: boolean
  } = {},
): NotificationDocument {
  if (!existingNotification) {
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
      return existingNotification
    }

    return nextNotification
  }

  if (
    options.forceRestart ||
    hasNotificationDeliveryIdentityChanged(existingNotification, nextNotification)
  ) {
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

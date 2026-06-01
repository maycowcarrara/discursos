import type {
  AssignmentStatus,
  NotificationStatus,
  NotificationType,
} from '../types/firestore.js'

type AutomatedNotificationType = Extract<
  NotificationType,
  'confirmation' | 'reminder7d' | 'reminder1d'
>

export type AssignmentNotificationRecipient = {
  email: string
  speakerName: string
}

export type AssignmentNotificationPlanInput = {
  assignmentId: string
  eventDate: Date
  status: AssignmentStatus
  recipient: AssignmentNotificationRecipient
  organizationName: string
  now: Date
}

export type AssignmentNotificationPlanItem = {
  documentId: string
  status: NotificationStatus
  type: NotificationType
  scheduledFor: Date
  subject: string
  recipientEmail: string
}

const automatedNotificationTypes: AutomatedNotificationType[] = [
  'confirmation',
  'reminder7d',
  'reminder1d',
]

const reminderSendHour = 9

function isAssignmentCoveringCalendarSlot(status: AssignmentStatus) {
  return status === 'pending' || status === 'confirmed'
}

export function getAssignmentNotificationDocumentId(
  assignmentId: string,
  type: NotificationType,
) {
  return `${assignmentId}__${type}`
}

export function buildAssignmentNotificationPlan(
  input: AssignmentNotificationPlanInput,
): AssignmentNotificationPlanItem[] {
  const recipientEmail = input.recipient.email.trim()
  const organizationName = input.organizationName.trim() || 'Organizacao'
  const eventHasNotEnded = toStartOfLocalDay(input.eventDate) >= toStartOfLocalDay(input.now)
  const canOperateNotifications =
    isAssignmentCoveringCalendarSlot(input.status) &&
    eventHasNotEnded &&
    recipientEmail.length > 0

  return automatedNotificationTypes.map((type) => {
    const isConfirmation = type === 'confirmation'
    const subject = getNotificationSubject(type, organizationName)
    const scheduledFor = canOperateNotifications
      ? getScheduledDateForType(type, input.eventDate, input.now)
      : input.now
    const shouldStayPending =
      canOperateNotifications && (!isConfirmation || input.status === 'pending')

    return {
      documentId: getAssignmentNotificationDocumentId(input.assignmentId, type),
      type,
      scheduledFor,
      subject,
      recipientEmail,
      status: shouldStayPending ? 'pending' : 'cancelled',
    }
  })
}

function getNotificationSubject(
  type: AutomatedNotificationType,
  organizationName: string,
) {
  if (type === 'confirmation') {
    return `Confirmacao de designacao - ${organizationName}`
  }

  if (type === 'reminder7d') {
    return `Lembrete de designacao em 7 dias - ${organizationName}`
  }

  return `Lembrete de designacao para amanha - ${organizationName}`
}

function getScheduledDateForType(
  type: AutomatedNotificationType,
  eventDate: Date,
  now: Date,
) {
  if (type === 'confirmation') {
    return new Date(now)
  }

  const reminderDate = new Date(eventDate)
  reminderDate.setDate(reminderDate.getDate() - (type === 'reminder7d' ? 7 : 1))
  reminderDate.setHours(reminderSendHour, 0, 0, 0)

  if (reminderDate.getTime() < now.getTime()) {
    return new Date(now)
  }

  return reminderDate
}

function toStartOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

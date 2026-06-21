import type {
  AssignmentStatus,
  NotificationStatus,
  NotificationType,
} from '../types/firestore.js'

type AutomatedNotificationType = Extract<
  NotificationType,
  'confirmation' | 'reminder4d'
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
  automaticEmailsEnabled: boolean
  isAssignmentUpdate?: boolean
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
  'reminder4d',
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
  const organizationName = input.organizationName.trim() || 'Organização'
  const eventHasNotEnded = toStartOfLocalDay(input.eventDate) >= toStartOfLocalDay(input.now)
  const canOperateNotifications =
    isAssignmentCoveringCalendarSlot(input.status) &&
    eventHasNotEnded &&
    recipientEmail.length > 0 &&
    input.automaticEmailsEnabled
  const reminderScheduledFor = getReminderScheduledDate(input.eventDate)
  const canScheduleReminder = reminderScheduledFor.getTime() >= input.now.getTime()

  return automatedNotificationTypes.map((type) => {
    const isConfirmation = type === 'confirmation'
    const subject = getNotificationSubject(
      type,
      organizationName,
      isConfirmation && input.isAssignmentUpdate === true,
    )
    const scheduledFor = canOperateNotifications
      ? isConfirmation
        ? new Date(input.now)
        : reminderScheduledFor
      : input.now
    const shouldStayPending =
      canOperateNotifications &&
      !isConfirmation &&
      canScheduleReminder

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
  isUpdate: boolean,
) {
  if (type === 'confirmation') {
    const prefix = isUpdate ? 'ATUALIZAÇÃO - ' : ''

    return `${prefix}Confirmação de designação - ${organizationName}`
  }

  return `Lembrete de designação em 4 dias - ${organizationName}`
}

function getReminderScheduledDate(eventDate: Date) {
  const reminderDate = new Date(eventDate)
  reminderDate.setDate(reminderDate.getDate() - 4)
  reminderDate.setHours(reminderSendHour, 0, 0, 0)

  return reminderDate
}

function toStartOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

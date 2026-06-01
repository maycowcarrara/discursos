import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

export const timestampSchema = z.custom<Timestamp>(
  (value) => value instanceof Timestamp,
  {
    message: 'Timestamp invalido do Firestore',
  },
)

const baseDocumentSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

const authoredDocumentSchema = z.object({
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
})

const activatableDocumentSchema = z.object({
  isActive: z.boolean(),
})

const managedDocumentSchema = baseDocumentSchema
  .merge(authoredDocumentSchema)
  .merge(activatableDocumentSchema)

export const speakerTypeSchema = z.enum(['local', 'visitor'])
export const speakerStatusSchema = z.enum([
  'active',
  'vacation',
  'unavailable',
  'transferred',
  'inactive',
])

export const calendarEventTypeSchema = z.enum([
  'publicTalk',
  'congress',
  'assembly',
  'visit',
  'special',
])

export const assignmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'declined',
  'cancelled',
  'replaced',
])

export const notificationTypeSchema = z.enum([
  'reminder7d',
  'reminder1d',
  'confirmation',
  'manual',
])

export const notificationChannelSchema = z.enum(['email'])
export const notificationStatusSchema = z.enum([
  'pending',
  'sent',
  'failed',
  'cancelled',
])
export const notificationProviderSchema = z.enum(['emailjs', 'worker'])
export const googleCalendarSyncStatusSchema = z.enum([
  'pending',
  'synced',
  'error',
])
export const calendarSyncRunStatusSchema = z.enum([
  'idle',
  'running',
  'success',
  'error',
])

export const auditEntityTypeSchema = z.enum([
  'congregation',
  'speaker',
  'theme',
  'calendarEvent',
  'assignment',
  'settings',
  'notification',
])

export const auditActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'statusChange',
  'sync',
])

export const appSettingsSchema = baseDocumentSchema.extend({
  organizationName: z.string(),
  defaultYear: z.number().int(),
  locale: z.string(),
  timezone: z.string(),
})

export const calendarSettingsSchema = baseDocumentSchema
  .merge(authoredDocumentSchema)
  .extend({
    enabled: z.boolean(),
    calendarId: z.string(),
    defaultStartTime: z.string(),
    defaultDurationMinutes: z.number().int(),
    configurationUpdatedAt: timestampSchema.nullable().optional(),
    lastSyncAt: timestampSchema.nullable().optional(),
    lastSyncStatus: calendarSyncRunStatusSchema.optional(),
    lastSyncMessage: z.string().nullable().optional(),
  })

export const congregationSchema = managedDocumentSchema.extend({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  mapsUrl: z.string(),
  meetingDay: z.string(),
  meetingTime: z.string(),
  notes: z.string(),
  isLocal: z.boolean(),
})

export const speakerSchema = managedDocumentSchema.extend({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  congregationId: z.string(),
  congregationName: z.string().optional(),
  type: speakerTypeSchema,
  themeIds: z.array(z.string()),
  status: speakerStatusSchema,
  unavailableStart: timestampSchema.nullable().optional(),
  unavailableEnd: timestampSchema.nullable().optional(),
  notes: z.string(),
})

export const themeSchema = managedDocumentSchema.extend({
  number: z.number().int(),
  title: z.string(),
  notes: z.string(),
})

export const themeNumberReservationSchema = baseDocumentSchema.extend({
  number: z.number().int(),
  themeId: z.string(),
})

export const calendarEventSchema = managedDocumentSchema.extend({
  year: z.number().int(),
  date: timestampSchema,
  type: calendarEventTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  congregationId: z.string().nullable().optional(),
  congregationName: z.string().nullable().optional(),
  blocksAssignments: z.boolean(),
  googleCalendarEventId: z.string().nullable().optional(),
  googleCalendarCalendarId: z.string().nullable().optional(),
  googleCalendarSyncStatus: googleCalendarSyncStatusSchema.optional(),
  googleCalendarSyncError: z.string().nullable().optional(),
  googleCalendarManualSyncRequestedAt: timestampSchema.nullable().optional(),
  googleCalendarClaimId: z.string().nullable().optional(),
  googleCalendarClaimedAt: timestampSchema.nullable().optional(),
  googleCalendarRetryCount: z.number().int().nonnegative().optional(),
  googleCalendarSyncScheduledFor: timestampSchema.nullable().optional(),
  googleCalendarSyncUpdatedAt: timestampSchema.nullable().optional(),
})

export const assignmentSchema = baseDocumentSchema
  .merge(authoredDocumentSchema)
  .extend({
    calendarEventId: z.string(),
    eventDate: timestampSchema,
    eventType: calendarEventTypeSchema,
    localCongregationId: z.string(),
    localCongregationName: z.string(),
    speakerId: z.string(),
    speakerName: z.string(),
    speakerType: speakerTypeSchema,
    originCongregationId: z.string(),
    originCongregationName: z.string(),
    themeId: z.string(),
    themeNumber: z.number().int(),
    themeTitle: z.string(),
    status: assignmentStatusSchema,
    notes: z.string(),
    confirmationToken: z.string().nullable().optional(),
    confirmedAt: timestampSchema.nullable().optional(),
    responseAt: timestampSchema.nullable().optional(),
  })

export const notificationSchema = baseDocumentSchema.extend({
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  assignmentId: z.string().nullable().optional(),
  speakerId: z.string().nullable().optional(),
  recipientEmail: z.string(),
  subject: z.string(),
  status: notificationStatusSchema,
  scheduledFor: timestampSchema,
  sentAt: timestampSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  retryCount: z.number().int(),
  provider: notificationProviderSchema,
})

const auditPayloadSchema = z.record(z.string(), z.unknown())

export const auditLogSchema = z.object({
  entityType: auditEntityTypeSchema,
  entityId: z.string(),
  action: auditActionSchema,
  actorUid: z.string(),
  actorName: z.string().nullable().optional(),
  before: auditPayloadSchema.nullable().optional(),
  after: auditPayloadSchema.nullable().optional(),
  metadata: auditPayloadSchema.nullable().optional(),
  createdAt: timestampSchema,
})

export type FirestoreRecord<T> = T & {
  id: string
}

export type AppSettingsDocument = z.infer<typeof appSettingsSchema>
export type CalendarSettingsDocument = z.infer<typeof calendarSettingsSchema>
export type CongregationDocument = z.infer<typeof congregationSchema>
export type SpeakerDocument = z.infer<typeof speakerSchema>
export type ThemeDocument = z.infer<typeof themeSchema>
export type ThemeNumberReservationDocument = z.infer<
  typeof themeNumberReservationSchema
>
export type CalendarEventDocument = z.infer<typeof calendarEventSchema>
export type AssignmentDocument = z.infer<typeof assignmentSchema>
export type NotificationDocument = z.infer<typeof notificationSchema>
export type AuditLogDocument = z.infer<typeof auditLogSchema>

export type SpeakerType = z.infer<typeof speakerTypeSchema>
export type SpeakerStatus = z.infer<typeof speakerStatusSchema>
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationStatus = z.infer<typeof notificationStatusSchema>
export type NotificationProvider = z.infer<typeof notificationProviderSchema>
export type GoogleCalendarSyncStatus = z.infer<
  typeof googleCalendarSyncStatusSchema
>
export type CalendarSyncRunStatus = z.infer<typeof calendarSyncRunStatusSchema>
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>
export type AuditAction = z.infer<typeof auditActionSchema>

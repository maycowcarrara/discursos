import {
  buildGoogleCalendarEventIdFromDigest,
  resolveGoogleCalendarAssignmentKind,
  resolveCalendarRetryDecision,
  shouldProcessManualCalendarSync,
  shouldPublishStandaloneCalendarEvent,
  type GoogleCalendarAssignmentKind,
} from './google-calendar-sync.js'

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void
}

type ScheduledController = {
  readonly cron: string
  readonly scheduledTime: number
}

type Env = {
  APP_CONFIRMATION_BASE_URL: string
  CALENDAR_SYNC_BATCH_SIZE?: string
  EMAILJS_PRIVATE_KEY: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  FIREBASE_PROJECT_ID: string
  GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: string
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string
  INTERNAL_API_TOKEN?: string
  NOTIFICATION_BATCH_SIZE?: string
  REMINDER_SEND_HOUR_LOCAL?: string
  WORKER_ACTOR_NAME?: string
  WORKER_ACTOR_UID?: string
}

type FirestoreScalarValue =
  | { booleanValue: boolean }
  | { integerValue: string }
  | { nullValue: null }
  | { stringValue: string }
  | { timestampValue: string }

type FirestoreMapValue = {
  mapValue: {
    fields?: Record<string, FirestoreValue>
  }
}

type FirestoreArrayValue = {
  arrayValue: {
    values?: FirestoreValue[]
  }
}

type FirestoreValue = FirestoreScalarValue | FirestoreMapValue | FirestoreArrayValue

type FirestoreDocument = {
  createTime?: string
  fields?: Record<string, FirestoreValue>
  name: string
  updateTime?: string
}

type FirestoreRunQueryRow = {
  document?: FirestoreDocument
}

type FirestoreCommitWrite = {
  currentDocument?: {
    exists?: boolean
    updateTime?: string
  }
  update: FirestoreDocument
  updateMask?: {
    fieldPaths: string[]
  }
}

type JsonPrimitive = boolean | null | number | string
type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
type JsonObject = {
  [key: string]: JsonValue
}

type AssignmentStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'replaced'
type SpeakerType = 'local' | 'visitor'

type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'
type NotificationType =
  | 'confirmation'
  | 'reminder4d'
  | 'reminder7d'
  | 'reminder1d'
  | 'manual'
type GoogleCalendarSyncStatus = 'pending' | 'synced' | 'error'
type CalendarSyncRunStatus = 'idle' | 'running' | 'success' | 'error'

type AssignmentRecord = {
  calendarEventId: string
  confirmationToken: string | null
  documentUpdateTime: string | null
  eventDate: Date
  eventType: string
  id: string
  localCongregationId: string
  localCongregationName: string
  notes: string
  originCongregationId: string
  originCongregationName: string
  speakerId: string
  speakerName: string
  speakerType: SpeakerType
  status: AssignmentStatus
  themeNumber: number
  themeTitle: string
  updatedAt: Date
}

type NotificationRecord = {
  assignmentId: string | null
  documentUpdateTime: string | null
  id: string
  recipientEmail: string
  retryCount: number
  scheduledFor: Date
  status: NotificationStatus
  subject: string
  type: NotificationType
}

type AdminAccessSettingsRecord = {
  adminEmails: string[]
  createdAt: Date | null
  createdBy: string | null
  documentUpdateTime: string | null
}

type FirebaseAuthUserRecord = {
  customAttributes?: string
  displayName?: string
  email?: string
  localId: string
}

type IdentityToolkitUsersResponse = {
  users?: FirebaseAuthUserRecord[]
}

type CalendarSettingsRecord = {
  calendarId: string
  configurationUpdatedAt: Date | null
  defaultDurationMinutes: number
  defaultStartTime: string
  enabled: boolean
  exists: boolean
  lastSyncMessage: string | null
  lastSyncStatus: CalendarSyncRunStatus
}

type CalendarEventRecord = {
  congregationId: string | null
  congregationName: string | null
  date: Date
  description: string | null
  documentUpdateTime: string | null
  googleCalendarCalendarId: string | null
  googleCalendarClaimedAt: Date | null
  googleCalendarClaimId: string | null
  googleCalendarEventId: string | null
  googleCalendarManualSyncRequestedAt: Date | null
  googleCalendarRetryCount: number
  googleCalendarSyncError: string | null
  googleCalendarSyncScheduledFor: Date | null
  googleCalendarSyncStatus: GoogleCalendarSyncStatus
  id: string
  isActive: boolean
  title: string
  type: string
  updatedAt: Date
}

type CongregationRecord = {
  address: string
  city: string
  id: string
  isLocal: boolean
  meetingTime: string
  name: string
  state: string
}

type SpeakerRecord = {
  email: string
  id: string
  name: string
}

type CalendarSyncEntryKind = GoogleCalendarAssignmentKind | 'specialEvent'

type CalendarSyncEntry = {
  assignment: AssignmentRecord | null
  attendeeEmail: string | null
  congregation: CongregationRecord | null
  kind: CalendarSyncEntryKind
}

type CalendarEventAssignmentContext = {
  latestAssignment: AssignmentRecord | null
  operationalAssignment: AssignmentRecord | null
}

type PublicConfirmationResponse = {
  assignment: {
    assignmentId: string
    eventDateLabel: string
    localCongregationName: string
    originCongregationName: string
    speakerName: string
    status: AssignmentStatus
    themeNumber: number
    themeTitle: string
  } | null
  message: string
  state: 'pending' | 'confirmed' | 'inactive' | 'invalid' | 'conflict'
}

type NotificationProcessResult = 'cancelled' | 'failed' | 'requeued' | 'sent' | 'skipped'
type CalendarSyncProcessResult =
  | 'created'
  | 'deleted'
  | 'failed'
  | 'skipped'
  | 'updated'

type GoogleAccessTokenSession = {
  accessToken: string
  expiresAt: number
}

const firestoreDatabaseId = '(default)'
const firestoreBaseUrl = 'https://firestore.googleapis.com/v1'
const emailJsSendUrl = 'https://api.emailjs.com/api/v1.0/email/send'
const googleCalendarBaseUrl = 'https://www.googleapis.com/calendar/v3'
const googleOauthTokenUrl = 'https://oauth2.googleapis.com/token'
const identityToolkitBaseUrl = 'https://identitytoolkit.googleapis.com/v1'
const googleDatastoreScope = 'https://www.googleapis.com/auth/datastore'
const googleCalendarScope = 'https://www.googleapis.com/auth/calendar'
const googleIdentityToolkitScope = 'https://www.googleapis.com/auth/identitytoolkit'
const googleWorkerScopes =
  `${googleDatastoreScope} ${googleCalendarScope} ${googleIdentityToolkitScope}`
const defaultBatchSize = 10
const defaultCalendarSyncBatchSize = 10
const defaultLocale = 'pt-BR'
const defaultCalendarZoneId = 'America/Sao_Paulo'
const maxRetryCount = 3
const processingLeaseMinutes = 5
const retryDelayMinutes = 30
const notificationTypeLabels: Record<NotificationType, string> = {
  confirmation: 'Confirmação',
  reminder4d: 'Lembrete de 4 dias',
  reminder7d: 'Lembrete de 7 dias',
  reminder1d: 'Lembrete de 1 dia',
  manual: 'Envio manual',
}
const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  replaced: 'Substituído',
}
const eventTypeLabels: Record<string, string> = {
  publicTalk: 'Discurso público',
  congress: 'Congresso',
  assembly: 'Assembleia',
  visit: 'Visita',
  special: 'Evento especial',
}

let googleAccessTokenSession: GoogleAccessTokenSession | null = null

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const requestUrl = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: buildCorsHeaders(),
      })
    }

    if (requestUrl.pathname === '/api/public/assignment-confirmation') {
      if (request.method === 'GET') {
        return handlePublicAssignmentPreview(requestUrl, env)
      }

      if (request.method === 'POST') {
        return handlePublicAssignmentConfirmation(request, env)
      }
    }

    if (requestUrl.pathname === '/api/internal/process-notifications') {
      if (!isInternalRequestAuthorized(request, env)) {
        return jsonResponse(
          {
            error: 'unauthorized',
            message: 'Token interno ausente ou inválido.',
          },
          401,
        )
      }

      const processingPromise = processDueNotifications(env)

      ctx.waitUntil(processingPromise)

      const summary = await processingPromise

      return jsonResponse(summary)
    }

    if (
      requestUrl.pathname === '/api/public/admin-access/reconcile' &&
      request.method === 'POST'
    ) {
      return handleAdminAccessReconcile(request, env)
    }

    if (requestUrl.pathname === '/api/admin/users') {
      if (request.method === 'GET') {
        return handleListAdminUsers(request, env)
      }

      if (request.method === 'POST') {
        return handleAddAdminUser(request, env)
      }

      if (request.method === 'DELETE') {
        return handleRemoveAdminUser(request, env)
      }
    }

    if (
      requestUrl.pathname === '/api/admin/process-manual-notification' &&
      request.method === 'POST'
    ) {
      try {
        return await handleProcessManualNotification(request, env)
      } catch (error) {
        console.error('Falha no envio manual imediato.', error)

        return jsonResponse(
          {
            error: 'manual_notification_internal_error',
            message: getErrorMessage(error),
          },
          500,
        )
      }
    }

    if (
      requestUrl.pathname === '/api/admin/process-calendar-sync' &&
      request.method === 'POST'
    ) {
      try {
        return await handleProcessManualCalendarSync(request, env)
      } catch (error) {
        console.error('Falha na sincronização imediata da agenda.', error)

        return jsonResponse(
          {
            error: 'calendar_sync_internal_error',
            message: getErrorMessage(error),
          },
          500,
        )
      }
    }

    if (requestUrl.pathname === '/api/internal/process-calendar-sync') {
      if (!isInternalRequestAuthorized(request, env)) {
        return jsonResponse(
          {
            error: 'unauthorized',
            message: 'Token interno ausente ou inválido.',
          },
          401,
        )
      }

      const processingPromise = processPendingCalendarSync(env)

      ctx.waitUntil(processingPromise)

      const summary = await processingPromise

      return jsonResponse(summary)
    }

    if (requestUrl.pathname === '/health') {
      return jsonResponse({
        ok: true,
        service: 'discursos-email-automation',
      })
    }

    return jsonResponse(
      {
        error: 'not_found',
        message: 'Rota não encontrada.',
      },
      404,
    )
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processDueNotifications(env, 'reminder4d'))
  },
}

async function handlePublicAssignmentPreview(requestUrl: URL, env: Env) {
  const assignmentId = requestUrl.searchParams.get('assignmentId')?.trim() ?? ''
  const token = requestUrl.searchParams.get('token')?.trim() ?? ''

  if (!assignmentId || !token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link de confirmação está incompleto.',
        state: 'invalid',
      }),
      400,
    )
  }

  const preview = await buildAssignmentPreview(env, assignmentId, token)
  const statusCode = preview.state === 'invalid' ? 400 : preview.state === 'conflict' ? 409 : 200

  return jsonResponse(preview, statusCode)
}

async function handlePublicAssignmentConfirmation(request: Request, env: Env) {
  const body = (await request.json()) as Partial<{
    assignmentId: string
    token: string
  }>
  const assignmentId = body.assignmentId?.trim() ?? ''
  const token = body.token?.trim() ?? ''

  if (!assignmentId || !token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link de confirmação está incompleto.',
        state: 'invalid',
      }),
      400,
    )
  }

  const preview = await buildAssignmentPreview(env, assignmentId, token)

  if (preview.state !== 'pending' || !preview.assignment) {
    const statusCode =
      preview.state === 'invalid' ? 400 : preview.state === 'conflict' ? 409 : 200

    return jsonResponse(preview, statusCode)
  }

  const assignmentDocument = await getDocument(env, `assignments/${assignmentId}`)

  if (!assignmentDocument) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link não corresponde mais a uma designação ativa.',
        state: 'invalid',
      }),
      400,
    )
  }

  const assignment = parseAssignmentDocument(assignmentDocument)

  if (assignment.confirmationToken !== token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link não corresponde mais a uma designação ativa.',
        state: 'invalid',
      }),
      400,
    )
  }

  const conflictingAssignment = await findConflictingOperationalAssignment(
    env,
    assignment.calendarEventId,
    assignment.id,
  )

  if (conflictingAssignment) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: mapAssignmentSummary(assignment),
        message: 'Este horário já foi ocupado por outra designação operacional.',
        state: 'conflict',
      }),
      409,
    )
  }

  const now = new Date()
  const writes: FirestoreCommitWrite[] = [
    buildUpdateWrite(
      `assignments/${assignment.id}`,
      {
        confirmedAt: toTimestampValue(now),
        responseAt: toTimestampValue(now),
        status: toStringValue('confirmed'),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(resolveWorkerActorUid(env)),
      },
      undefined,
      assignment.documentUpdateTime
        ? {
            exists: true,
            updateTime: assignment.documentUpdateTime,
          }
        : true,
      env,
    ),
  ]
  const confirmationNotificationDocument = await getDocument(
    env,
    `notifications/${assignment.id}__confirmation`,
  )

  if (confirmationNotificationDocument) {
    writes.push(
      buildUpdateWrite(
        `notifications/${assignment.id}__confirmation`,
        {
          errorMessage: toNullValue(),
          status: toStringValue('cancelled'),
          updatedAt: toTimestampValue(now),
        },
        ['errorMessage', 'status', 'updatedAt'],
        confirmationNotificationDocument.updateTime
          ? {
              exists: true,
              updateTime: confirmationNotificationDocument.updateTime,
            }
          : true,
        env,
      ),
    )
  }

  writes.push(
    buildUpdateWrite(
      `auditLogs/${crypto.randomUUID()}`,
      {
        action: toStringValue('statusChange'),
        actorName: toStringValue(resolveWorkerActorName(env)),
        actorUid: toStringValue(resolveWorkerActorUid(env)),
        after: toJsonValue({
          confirmedAt: now.toISOString(),
          responseAt: now.toISOString(),
          status: 'confirmed',
        }),
        before: toJsonValue({
          status: assignment.status,
        }),
        createdAt: toTimestampValue(now),
        entityId: toStringValue(assignment.id),
        entityType: toStringValue('assignment'),
        metadata: toJsonValue({
          source: 'phase-11-worker',
          trigger: 'public-confirmation-link',
        }),
      },
      undefined,
      false,
      env,
    ),
  )

  try {
    await commitWrites(env, writes)
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      const updatedPreview = await buildAssignmentPreview(env, assignmentId, token)
      const statusCode =
        updatedPreview.state === 'invalid' ? 400 : updatedPreview.state === 'conflict' ? 409 : 200

      return jsonResponse(updatedPreview, statusCode)
    }

    throw error
  }

  return jsonResponse(
    buildPublicConfirmationResponse({
      assignment: {
        ...mapAssignmentSummary(assignment),
        status: 'confirmed',
      },
      message: 'Designação confirmada com sucesso.',
      state: 'confirmed',
    }),
  )
}

async function buildAssignmentPreview(
  env: Env,
  assignmentId: string,
  token: string,
): Promise<PublicConfirmationResponse> {
  const assignment = await getAssignmentById(env, assignmentId)

  if (!assignment || !assignment.confirmationToken || assignment.confirmationToken !== token) {
    return buildPublicConfirmationResponse({
      assignment: null,
      message: 'Este link não é mais válido para confirmação.',
      state: 'invalid',
    })
  }

  if (assignment.status === 'confirmed') {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: 'Esta designação já havia sido confirmada anteriormente.',
      state: 'confirmed',
    })
  }

  if (!isOperationalAssignmentStatus(assignment.status)) {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: 'Esta designação não está mais ativa para confirmação.',
      state: 'inactive',
    })
  }

  const conflictingAssignment = await findConflictingOperationalAssignment(
    env,
    assignment.calendarEventId,
    assignment.id,
  )

  if (conflictingAssignment) {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: 'Este horário já foi remanejado para outra designação.',
      state: 'conflict',
    })
  }

  return buildPublicConfirmationResponse({
    assignment: mapAssignmentSummary(assignment),
    message: 'Tudo certo. Você pode confirmar esta designação agora.',
    state: 'pending',
  })
}

async function processDueNotifications(
  env: Env,
  type?: NotificationType,
) {
  const dueNotifications = await listDueNotifications(env, type)
  const summary = {
    cancelled: 0,
    failed: 0,
    processed: 0,
    requeued: 0,
    sent: 0,
  }

  for (let index = 0; index < dueNotifications.length; index += 1) {
    const notification = dueNotifications[index]

    if (!notification) {
      continue
    }

    summary.processed += 1

    const result = await processSingleNotification(env, notification)

    if (result === 'sent') {
      summary.sent += 1
    } else if (result === 'failed') {
      summary.failed += 1
    } else if (result === 'requeued') {
      summary.requeued += 1
    } else if (result === 'skipped') {
      summary.processed -= 1
    } else {
      summary.cancelled += 1
    }

    if (index < dueNotifications.length - 1) {
      await sleep(1100)
    }
  }

  return summary
}

async function processPendingCalendarSync(env: Env) {
  const calendarSettings = await getCalendarSettingsRecord(env)
  const summary = {
    created: 0,
    deleted: 0,
    failed: 0,
    processed: 0,
    updated: 0,
  }

  if (!calendarSettings.exists || !calendarSettings.enabled) {
    return summary
  }

  if (!calendarSettings.calendarId) {
    await writeCalendarSyncRunState(
      env,
      'error',
      'Calendar ID ausente. Revise settings/calendar antes de sincronizar.',
    )

    summary.failed = 1

    return summary
  }

  await writeCalendarSyncRunState(
    env,
    'running',
    'Processando eventos pendentes do Google Calendar.',
  )

  const pendingCalendarEvents = await listPendingCalendarEvents(env)
  const congregationCache = new Map<string, CongregationRecord | null>()
  const speakerCache = new Map<string, SpeakerRecord | null>()

  for (let index = 0; index < pendingCalendarEvents.length; index += 1) {
    const calendarEvent = pendingCalendarEvents[index]

    if (!calendarEvent) {
      continue
    }

    const claimedCalendarEvent = await claimCalendarEventForProcessing(
      env,
      calendarEvent,
    )

    if (!claimedCalendarEvent) {
      continue
    }

    summary.processed += 1

    const result = await processSingleCalendarEventSync(
      env,
      calendarSettings,
      claimedCalendarEvent,
      congregationCache,
      speakerCache,
    )

    if (result === 'created') {
      summary.created += 1
    } else if (result === 'updated') {
      summary.updated += 1
    } else if (result === 'deleted') {
      summary.deleted += 1
    } else if (result === 'failed') {
      summary.failed += 1
    } else {
      summary.processed -= 1
    }

    if (index < pendingCalendarEvents.length - 1) {
      await sleep(350)
    }
  }

  const message =
    summary.processed === 0
      ? 'Nenhum evento pendente para sincronizar com o Google Calendar.'
      : `Google Calendar: ${summary.created} criados, ${summary.updated} atualizados, ${summary.deleted} removidos e ${summary.failed} falhas.`

  await writeCalendarSyncRunState(
    env,
    summary.failed > 0 ? 'error' : 'success',
    message,
  )

  return summary
}

async function processSingleCalendarEventSync(
  env: Env,
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  congregationCache: Map<string, CongregationRecord | null>,
  speakerCache: Map<string, SpeakerRecord | null>,
  options: {
    allowRetry?: boolean
  } = {},
): Promise<CalendarSyncProcessResult> {
  try {
    const assignments = await listAssignmentsForCalendarEvent(
      env,
      calendarEvent.id,
    )
    const assignmentContext = buildCalendarEventAssignmentContext(assignments)
    const syncEntry = await resolveCalendarSyncEntry(
      env,
      calendarSettings,
      calendarEvent,
      assignmentContext.operationalAssignment,
      congregationCache,
      speakerCache,
    )

    if (!calendarEvent.isActive) {
      if (
        calendarEvent.googleCalendarEventId &&
        calendarEvent.googleCalendarCalendarId
      ) {
        await deleteGoogleCalendarEvent(
          env,
          calendarEvent.googleCalendarCalendarId,
          calendarEvent.googleCalendarEventId,
        )

        await markCalendarEventSyncSuccess(
          env,
          calendarEvent,
          {
            calendarId: null,
            eventId: null,
            result: 'deleted',
          },
        )

        return 'deleted'
      }

      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: null,
          eventId: null,
          result: 'skipped',
        },
      )

      return 'skipped'
    }

    if (
      calendarEvent.type === 'publicTalk' &&
      !shouldProcessOperationalCalendarSync(
        calendarSettings,
        calendarEvent,
        assignmentContext,
        syncEntry,
      )
    ) {
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarEvent.googleCalendarCalendarId,
          eventId: calendarEvent.googleCalendarEventId,
          result: 'skipped',
        },
      )

      return 'skipped'
    }

    if (!syncEntry) {
      if (
        calendarEvent.googleCalendarEventId &&
        calendarEvent.googleCalendarCalendarId
      ) {
        await deleteGoogleCalendarEvent(
          env,
          calendarEvent.googleCalendarCalendarId,
          calendarEvent.googleCalendarEventId,
        )

        await markCalendarEventSyncSuccess(
          env,
          calendarEvent,
          {
            calendarId: null,
            eventId: null,
            result: 'deleted',
          },
        )

        return 'deleted'
      }

      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: null,
          eventId: null,
          result: 'skipped',
        },
      )

      return 'skipped'
    }

    const eventPayload = buildGoogleCalendarEventPayload(
      calendarSettings,
      calendarEvent,
      syncEntry,
    )

    if (
      calendarEvent.googleCalendarEventId &&
      calendarEvent.googleCalendarCalendarId &&
      calendarEvent.googleCalendarCalendarId !== calendarSettings.calendarId
    ) {
      await deleteGoogleCalendarEvent(
        env,
        calendarEvent.googleCalendarCalendarId,
        calendarEvent.googleCalendarEventId,
      )

      const createdEventId = await createGoogleCalendarEvent(
        env,
        calendarSettings.calendarId,
        await buildDeterministicGoogleCalendarEventId(calendarEvent.id),
        eventPayload,
      )

      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarSettings.calendarId,
          eventId: createdEventId,
          result: 'created',
        },
      )

      return 'created'
    }

    if (calendarEvent.googleCalendarEventId) {
      await updateGoogleCalendarEvent(
        env,
        calendarSettings.calendarId,
        calendarEvent.googleCalendarEventId,
        eventPayload,
      )

      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarSettings.calendarId,
          eventId: calendarEvent.googleCalendarEventId,
          result: 'updated',
        },
      )

      return 'updated'
    }

    const createdEventId = await createGoogleCalendarEvent(
      env,
      calendarSettings.calendarId,
      await buildDeterministicGoogleCalendarEventId(calendarEvent.id),
      eventPayload,
    )

    await markCalendarEventSyncSuccess(
      env,
      calendarEvent,
      {
        calendarId: calendarSettings.calendarId,
        eventId: createdEventId,
        result: 'created',
      },
    )

    return 'created'
  } catch (error) {
    await markCalendarEventSyncFailure(
      env,
      calendarEvent,
      getErrorMessage(error),
      options.allowRetry ?? true,
    )

    return 'failed'
  }
}

async function processSingleNotification(
  env: Env,
  notification: NotificationRecord,
  options: {
    allowRetry?: boolean
  } = {},
): Promise<NotificationProcessResult> {
  const wasClaimed = await claimNotificationForProcessing(env, notification)

  if (!wasClaimed) {
    return 'skipped'
  }

  if (!notification.assignmentId) {
    await markNotificationCancelled(env, notification, 'Notificação sem assignmentId ativo.')
    return 'cancelled'
  }

  const assignment = await getAssignmentById(env, notification.assignmentId)

  if (!assignment) {
    await markNotificationFailed(
      env,
      notification,
      'A designação vinculada a esta notificação não foi encontrada.',
    )
    return 'failed'
  }

  const isConfirmationUpdate =
    notification.type === 'confirmation' &&
    notification.subject.startsWith('ATUALIZAÇÃO - ')

  if (
    notification.type === 'confirmation' &&
    assignment.status !== 'pending' &&
    !(isConfirmationUpdate && assignment.status === 'confirmed')
  ) {
    await markNotificationCancelled(
      env,
      notification,
      'Confirmação automática cancelada porque a designação não está mais pendente.',
    )
    return 'cancelled'
  }

  if (notification.type !== 'confirmation' && !isOperationalAssignmentStatus(assignment.status)) {
    await markNotificationCancelled(
      env,
      notification,
      'Notificação cancelada porque a designação não está mais operacional.',
    )
    return 'cancelled'
  }

  if (
    notification.type !== 'confirmation' &&
    toStartOfDay(assignment.eventDate).getTime() < toStartOfDay(new Date()).getTime()
  ) {
    await markNotificationCancelled(
      env,
      notification,
      'Notificação cancelada porque a data do evento já passou.',
    )
    return 'cancelled'
  }

  const emailJsConfigurationError = getEmailJsConfigurationError(env)

  if (emailJsConfigurationError) {
    await markNotificationFailed(env, notification, emailJsConfigurationError)
    return 'failed'
  }

  const emailResponse = await sendEmail(env, notification, assignment)

  if (emailResponse.ok) {
    await markNotificationSent(env, notification)
    return 'sent'
  }

  if (!(options.allowRetry ?? true) || notification.retryCount + 1 >= maxRetryCount) {
    await markNotificationFailed(env, notification, emailResponse.errorMessage)
    return 'failed'
  }

  await requeueNotification(env, notification, emailResponse.errorMessage)
  return 'requeued'
}

async function resolveCalendarSyncEntry(
  env: Env,
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  assignment: AssignmentRecord | null,
  congregationCache: Map<string, CongregationRecord | null>,
  speakerCache: Map<string, SpeakerRecord | null>,
): Promise<CalendarSyncEntry | null> {
  if (shouldPublishStandaloneCalendarEvent(calendarEvent.type)) {
    const congregation = await resolveCalendarSyncCongregation(
      env,
      calendarEvent.congregationId,
      calendarEvent.congregationName,
      congregationCache,
    )

    return {
      assignment: null,
      attendeeEmail: null,
      congregation,
      kind: 'specialEvent',
    }
  }

  if (calendarEvent.type !== 'publicTalk') {
    return null
  }

  if (!assignment) {
    return null
  }

  const speaker = await getSpeakerById(env, assignment.speakerId, speakerCache)
  const attendeeEmail = normalizeEmailValue(speaker?.email ?? null)

  const destinationCongregation = await resolveCalendarSyncCongregation(
    env,
    assignment.localCongregationId,
    assignment.localCongregationName,
    congregationCache,
  )

  const assignmentKind = resolveGoogleCalendarAssignmentKind({
    destinationIsLocal: destinationCongregation?.isLocal ?? null,
    speakerType: assignment.speakerType,
  })

  if (assignmentKind) {
    return {
      assignment,
      attendeeEmail,
      congregation: destinationCongregation,
      kind: assignmentKind,
    }
  }

  return null
}

function resolveManualSyncRelevantAssignment(
  syncEntry: CalendarSyncEntry | null,
  assignmentContext: CalendarEventAssignmentContext,
) {
  if (syncEntry?.assignment) {
    return syncEntry.assignment
  }

  return assignmentContext.latestAssignment
}

function getLatestOperationalSyncRelevantChangeAt(
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  assignment: AssignmentRecord | null,
) {
  const timestamps = [
    calendarSettings.configurationUpdatedAt?.getTime() ?? 0,
    calendarEvent.updatedAt.getTime(),
    assignment?.updatedAt.getTime() ?? 0,
  ]

  return Math.max(...timestamps)
}

function shouldProcessOperationalCalendarSync(
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  assignmentContext: CalendarEventAssignmentContext,
  syncEntry: CalendarSyncEntry | null,
) {
  const hasRemoteEvent = Boolean(
    calendarEvent.googleCalendarEventId && calendarEvent.googleCalendarCalendarId,
  )
  const relevantAssignment = resolveManualSyncRelevantAssignment(syncEntry, assignmentContext)

  const requestedAt = calendarEvent.googleCalendarManualSyncRequestedAt?.getTime() ?? 0
  const lastRelevantChangeAt = getLatestOperationalSyncRelevantChangeAt(
    calendarSettings,
    calendarEvent,
    relevantAssignment,
  )

  return shouldProcessManualCalendarSync({
    hasLatestAssignment: Boolean(assignmentContext.latestAssignment),
    hasRemoteEvent,
    hasSyncEntry: Boolean(syncEntry),
    lastRelevantChangeAt,
    requestedAt,
  })
}

function buildGoogleCalendarEventPayload(
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  syncEntry: CalendarSyncEntry,
) {
  const meetingTime = syncEntry.congregation?.meetingTime.trim() || calendarSettings.defaultStartTime
  const dateRange = buildCalendarDateRange(
    calendarEvent.date,
    meetingTime,
    calendarSettings.defaultDurationMinutes,
  )
  const location = buildGoogleCalendarLocation(syncEntry.congregation)

  return {
    attendees: buildGoogleCalendarAttendees(syncEntry),
    description: buildGoogleCalendarDescription(
      calendarSettings,
      calendarEvent,
      syncEntry,
    ),
    end: {
      dateTime: dateRange.endDateTime,
      timeZone: defaultCalendarZoneId,
    },
    location,
    summary: buildGoogleCalendarSummary(calendarEvent, syncEntry),
    start: {
      dateTime: dateRange.startDateTime,
      timeZone: defaultCalendarZoneId,
    },
  }
}

function buildGoogleCalendarAttendees(syncEntry: CalendarSyncEntry) {
  if (!syncEntry.attendeeEmail) {
    return []
  }

  const attendee: JsonObject = {
    email: syncEntry.attendeeEmail,
  }

  if (syncEntry.assignment?.speakerName.trim()) {
    attendee.displayName = syncEntry.assignment.speakerName.trim()
  }

  return [attendee]
}

function buildGoogleCalendarSummary(
  calendarEvent: CalendarEventRecord,
  syncEntry: CalendarSyncEntry,
) {
  if (syncEntry.kind === 'incomingVisitor' && syncEntry.assignment) {
    return `Orador visitante - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`
  }

  if (syncEntry.kind === 'outgoingTalk' && syncEntry.assignment) {
    return `Discurso fora - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`
  }

  if (syncEntry.kind === 'localTalk' && syncEntry.assignment) {
    return `Designação local - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`
  }

  return `Evento especial - ${calendarEvent.title}`
}

function buildGoogleCalendarDescription(
  calendarSettings: CalendarSettingsRecord,
  calendarEvent: CalendarEventRecord,
  syncEntry: CalendarSyncEntry,
) {
  const meetingTime = syncEntry.congregation?.meetingTime.trim() || calendarSettings.defaultStartTime
  const organizationName = resolveOrganizationName(calendarEvent, syncEntry)
  const locationName =
    syncEntry.congregation?.name?.trim() ||
    calendarEvent.congregationName?.trim() ||
    organizationName
  const lines = [
    `Congregação local: ${organizationName}`,
    `Tipo: ${getCalendarSyncKindLabel(syncEntry.kind)}`,
    `Local: ${locationName}`,
    `Hora da reunião: ${meetingTime}`,
  ]

  if (syncEntry.congregation) {
    lines.push(`Endereço: ${buildGoogleCalendarLocation(syncEntry.congregation)}`)
  }

  if (syncEntry.assignment) {
    lines.push(`Status: ${assignmentStatusLabels[syncEntry.assignment.status]}`)
    lines.push(`Orador: ${syncEntry.assignment.speakerName}`)
    lines.push(`Tema: ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.themeTitle}`)
    lines.push(`Congregação de origem: ${syncEntry.assignment.originCongregationName}`)
    lines.push(`Congregação de destino: ${syncEntry.assignment.localCongregationName}`)

    if (syncEntry.assignment.notes.trim()) {
      lines.push(`Observações: ${syncEntry.assignment.notes.trim()}`)
    }
  }

  if (calendarEvent.description?.trim()) {
    lines.push(`Agenda: ${calendarEvent.description.trim()}`)
  }

  return lines.join('\n')
}

function resolveOrganizationName(
  calendarEvent: CalendarEventRecord,
  syncEntry: CalendarSyncEntry,
) {
  const assignmentOrganizationName = syncEntry.assignment?.localCongregationName.trim()

  if (assignmentOrganizationName) {
    return assignmentOrganizationName
  }

  const syncCongregationName = syncEntry.congregation?.name.trim()

  if (syncCongregationName) {
    return syncCongregationName
  }

  const calendarCongregationName = calendarEvent.congregationName?.trim()

  if (calendarCongregationName) {
    return calendarCongregationName
  }

  return 'Congregação local'
}

function buildGoogleCalendarLocation(
  congregation: CongregationRecord | null,
) {
  if (!congregation) {
    return null
  }

  const addressParts = [
    congregation.name.trim(),
    congregation.address.trim(),
    `${congregation.city.trim()}/${congregation.state.trim()}`.trim(),
  ].filter(Boolean)

  return addressParts.join(' - ') || congregation.name
}

function getCalendarSyncKindLabel(kind: CalendarSyncEntryKind) {
  if (kind === 'incomingVisitor') {
    return 'Orador visitante'
  }

  if (kind === 'outgoingTalk') {
    return 'Discurso fora'
  }

  if (kind === 'localTalk') {
    return 'Designação local'
  }

  return 'Evento especial'
}

function buildCalendarDateRange(
  eventDate: Date,
  startTime: string,
  durationMinutes: number,
) {
  const [hourValue, minuteValue] = startTime.split(':')
  const hours = Number.parseInt(hourValue ?? '', 10)
  const minutes = Number.parseInt(minuteValue ?? '', 10)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error('Horário padrão inválido em settings/calendar.')
  }

  const totalStartMinutes = hours * 60 + minutes
  const totalEndMinutes = totalStartMinutes + durationMinutes

  return {
    endDateTime: buildLocalDateTimeString(eventDate, totalEndMinutes),
    startDateTime: buildLocalDateTimeString(eventDate, totalStartMinutes),
  }
}

function buildLocalDateTimeString(date: Date, totalMinutes: number) {
  const extraDays = Math.floor(totalMinutes / (24 * 60))
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + extraDays,
    12,
    0,
    0,
    0,
  )
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  const datePart = [
    String(targetDate.getFullYear()),
    String(targetDate.getMonth() + 1).padStart(2, '0'),
    String(targetDate.getDate()).padStart(2, '0'),
  ].join('-')

  return `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

async function createGoogleCalendarEvent(
  env: Env,
  calendarId: string,
  eventId: string,
  payload: JsonObject,
) {
  let response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: await buildGoogleApiHeaders(env),
      body: JSON.stringify({
        ...payload,
        id: eventId,
      }),
    },
  )

  if (await shouldRetryCalendarRequestWithoutAttendees(response)) {
    response = await fetch(
      `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
      {
        method: 'POST',
        headers: await buildGoogleApiHeaders(env),
        body: JSON.stringify({
          ...removeCalendarAttendees(payload),
          id: eventId,
        }),
      },
    )
  }

  if (response.status === 409) {
    await updateGoogleCalendarEvent(env, calendarId, eventId, payload)

    return eventId
  }

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao criar evento no Google Calendar: ${errorText}`)
  }

  const responsePayload = (await response.json()) as Partial<{ id: string }>

  if (!responsePayload.id) {
    throw new Error('Google Calendar não retornou o id do evento criado.')
  }

  return responsePayload.id
}

async function buildDeterministicGoogleCalendarEventId(calendarEventId: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(calendarEventId),
  )

  return buildGoogleCalendarEventIdFromDigest(digest)
}

async function updateGoogleCalendarEvent(
  env: Env,
  calendarId: string,
  eventId: string,
  payload: JsonObject,
) {
  let response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'PATCH',
      headers: await buildGoogleApiHeaders(env),
      body: JSON.stringify(payload),
    },
  )

  if (await shouldRetryCalendarRequestWithoutAttendees(response)) {
    response = await fetch(
      `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
      {
        method: 'PATCH',
        headers: await buildGoogleApiHeaders(env),
        body: JSON.stringify(removeCalendarAttendees(payload)),
      },
    )
  }

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao atualizar evento no Google Calendar: ${errorText}`)
  }
}

async function shouldRetryCalendarRequestWithoutAttendees(response: Response) {
  if (response.status !== 403) {
    return false
  }

  const errorText = await response.clone().text()

  return errorText.includes('forbiddenForServiceAccounts')
}

function removeCalendarAttendees(payload: JsonObject) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== 'attendees'),
  ) as JsonObject
}

async function deleteGoogleCalendarEvent(
  env: Env,
  calendarId: string,
  eventId: string,
) {
  const response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: 'DELETE',
      headers: await buildGoogleApiHeaders(env),
    },
  )

  if (response.status === 404) {
    return
  }

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao excluir evento no Google Calendar: ${errorText}`)
  }
}

async function sendEmail(env: Env, notification: NotificationRecord, assignment: AssignmentRecord) {
  const emailJsConfigurationError = getEmailJsConfigurationError(env)

  if (emailJsConfigurationError) {
    return {
      errorMessage: emailJsConfigurationError,
      ok: false as const,
    }
  }

  const confirmationUrl = buildConfirmationUrl(env, assignment)
  const organizationName = assignment.localCongregationName.trim() || 'Congregação local'
  const response = await fetch(emailJsSendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken: env.EMAILJS_PRIVATE_KEY,
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      template_params: {
        email_subject: notification.subject,
        confirmation_url: confirmationUrl,
        event_date: formatEventDateLabel(assignment.eventDate, defaultLocale),
        event_type_label: eventTypeLabels[assignment.eventType] ?? assignment.eventType,
        local_congregation_name: assignment.localCongregationName,
        notes: assignment.notes,
        notification_type_label: notificationTypeLabels[notification.type],
        organization_name: organizationName,
        origin_congregation_name: assignment.originCongregationName,
        reply_to: '',
        speaker_name: assignment.speakerName,
        status_label: assignmentStatusLabels[assignment.status],
        theme_number: String(assignment.themeNumber),
        theme_title: assignment.themeTitle,
        to_email: notification.recipientEmail,
      },
      user_id: env.EMAILJS_PUBLIC_KEY,
    }),
  })

  if (response.ok) {
    return {
      ok: true as const,
    }
  }

  const responseText = await response.text()

  return {
    errorMessage: responseText || 'Falha ao enviar e-mail pelo EmailJS.',
    ok: false as const,
  }
}

async function claimNotificationForProcessing(env: Env, notification: NotificationRecord) {
  const now = new Date()
  const leaseUntil = new Date(now.getTime() + processingLeaseMinutes * 60_000)

  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `notifications/${notification.id}`,
        {
          scheduledFor: toTimestampValue(leaseUntil),
          updatedAt: toTimestampValue(now),
        },
        undefined,
        notification.documentUpdateTime
          ? {
              exists: true,
              updateTime: notification.documentUpdateTime,
            }
          : true,
        env,
      ),
    ])

    return true
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      return false
    }

    throw error
  }
}

async function listDueNotifications(env: Env, type?: NotificationType) {
  const nowIso = new Date().toISOString()
  const filters = [
    buildFieldFilter('status', 'EQUAL', toStringValue('pending')),
    buildFieldFilter('scheduledFor', 'LESS_THAN_OR_EQUAL', toTimestampValue(new Date(nowIso))),
  ]

  if (type) {
    filters.push(buildFieldFilter('type', 'EQUAL', toStringValue(type)))
  }

  const rows = await runQuery(env, {
    from: [
      {
        collectionId: 'notifications',
      },
    ],
    limit: resolveNotificationBatchSize(env),
    orderBy: [
      {
        direction: 'ASCENDING',
        field: {
          fieldPath: 'scheduledFor',
        },
      },
    ],
    where: {
      compositeFilter: {
        filters,
        op: 'AND',
      },
    },
  })

  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map(parseNotificationDocument)
}

function getEmailJsConfigurationError(env: Env) {
  const missingCredentials = [
    ['EMAILJS_PRIVATE_KEY', env.EMAILJS_PRIVATE_KEY],
    ['EMAILJS_PUBLIC_KEY', env.EMAILJS_PUBLIC_KEY],
    ['EMAILJS_SERVICE_ID', env.EMAILJS_SERVICE_ID],
    ['EMAILJS_TEMPLATE_ID', env.EMAILJS_TEMPLATE_ID],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name)

  if (missingCredentials.length === 0) {
    return null
  }

  return `Credenciais do EmailJS não configuradas: ${missingCredentials.join(', ')}.`
}

async function listPendingCalendarEvents(env: Env) {
  const now = new Date()
  const batchSize = resolveCalendarSyncBatchSize(env)
  const [scheduledRows, compatibilityRows] = await Promise.all([
    runQuery(env, {
      from: [
        {
          collectionId: 'calendarEvents',
        },
      ],
      limit: batchSize,
      orderBy: [
        {
          direction: 'ASCENDING',
          field: {
            fieldPath: 'googleCalendarSyncScheduledFor',
          },
        },
      ],
      where: {
        compositeFilter: {
          filters: [
            buildFieldFilter(
              'googleCalendarSyncStatus',
              'EQUAL',
              toStringValue('pending'),
            ),
            buildFieldFilter(
              'googleCalendarSyncScheduledFor',
              'LESS_THAN_OR_EQUAL',
              toTimestampValue(now),
            ),
          ],
          op: 'AND',
        },
      },
    }),
    runQuery(env, {
    from: [
      {
        collectionId: 'calendarEvents',
      },
    ],
    limit: batchSize * 3,
    orderBy: [
      {
        direction: 'ASCENDING',
        field: {
          fieldPath: 'date',
        },
      },
    ],
    where: buildFieldFilter(
      'googleCalendarSyncStatus',
      'EQUAL',
      toStringValue('pending'),
    ),
    }),
  ])
  const documentsByName = new Map<string, FirestoreDocument>()

  for (const row of [...scheduledRows, ...compatibilityRows]) {
    if (row.document) {
      documentsByName.set(row.document.name, row.document)
    }
  }

  return [...documentsByName.values()]
    .map(parseCalendarEventDocument)
    .filter(
      (calendarEvent) =>
        !calendarEvent.googleCalendarSyncScheduledFor ||
        calendarEvent.googleCalendarSyncScheduledFor.getTime() <= now.getTime(),
    )
    .slice(0, batchSize)
}

async function claimCalendarEventForProcessing(
  env: Env,
  calendarEvent: CalendarEventRecord,
) {
  const now = new Date()
  const claimedAt = calendarEvent.googleCalendarClaimedAt?.getTime() ?? 0
  const leaseStartedAfter =
    now.getTime() - processingLeaseMinutes * 60_000

  if (claimedAt > leaseStartedAfter) {
    return null
  }

  const claimId = crypto.randomUUID()

  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `calendarEvents/${calendarEvent.id}`,
        {
          googleCalendarClaimedAt: toTimestampValue(now),
          googleCalendarClaimId: toStringValue(claimId),
        },
        undefined,
        calendarEvent.documentUpdateTime
          ? {
              exists: true,
              updateTime: calendarEvent.documentUpdateTime,
            }
          : true,
        env,
      ),
    ])
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      return null
    }

    throw error
  }

  const claimedDocument = await getDocument(env, `calendarEvents/${calendarEvent.id}`)

  if (!claimedDocument) {
    return null
  }

  const claimedCalendarEvent = parseCalendarEventDocument(claimedDocument)

  return claimedCalendarEvent.googleCalendarClaimId === claimId
    ? claimedCalendarEvent
    : null
}

async function findConflictingOperationalAssignment(
  env: Env,
  calendarEventId: string,
  excludeAssignmentId: string,
) {
  const rows = await runQuery(env, {
    from: [
      {
        collectionId: 'assignments',
      },
    ],
    limit: 10,
    where: buildFieldFilter('calendarEventId', 'EQUAL', toStringValue(calendarEventId)),
  })

  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map(parseAssignmentDocument)
    .find(
      (assignment) =>
        assignment.id !== excludeAssignmentId && isOperationalAssignmentStatus(assignment.status),
    ) ?? null
}

async function listAssignmentsForCalendarEvent(
  env: Env,
  calendarEventId: string,
) {
  const rows = await runQuery(env, {
    from: [
      {
        collectionId: 'assignments',
      },
    ],
    limit: 50,
    where: buildFieldFilter(
      'calendarEventId',
      'EQUAL',
      toStringValue(calendarEventId),
    ),
  })

  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map(parseAssignmentDocument)
}

function sortAssignmentsByMostRecent(
  assignments: AssignmentRecord[],
) {
  return [...assignments].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
}

function buildCalendarEventAssignmentContext(
  assignments: AssignmentRecord[],
): CalendarEventAssignmentContext {
  const sortedAssignments = sortAssignmentsByMostRecent(assignments)
  const operationalAssignment =
    sortedAssignments.find((assignment) => isOperationalAssignmentStatus(assignment.status)) ??
    null

  return {
    latestAssignment: sortedAssignments[0] ?? null,
    operationalAssignment,
  }
}

async function getAssignmentById(env: Env, assignmentId: string) {
  const document = await getDocument(env, `assignments/${assignmentId}`)

  if (!document) {
    return null
  }

  return parseAssignmentDocument(document)
}

async function getCongregationById(
  env: Env,
  congregationId: string,
) {
  const document = await getDocument(env, `congregations/${congregationId}`)

  if (!document) {
    return null
  }

  return parseCongregationDocument(document)
}

async function resolveCalendarSyncCongregation(
  env: Env,
  congregationId: string | null,
  congregationName: string | null,
  congregationCache: Map<string, CongregationRecord | null>,
) {
  const normalizedCongregationId = congregationId?.trim() ?? ''

  if (normalizedCongregationId) {
    if (congregationCache.has(normalizedCongregationId)) {
      return congregationCache.get(normalizedCongregationId) ?? null
    }

    const congregation = await getCongregationById(env, normalizedCongregationId)
    congregationCache.set(normalizedCongregationId, congregation)

    return congregation
  }

  if (!congregationName?.trim()) {
    return null
  }

  return {
    address: '',
    city: '',
    id: '',
    isLocal: true,
    meetingTime: '',
    name: congregationName.trim(),
    state: '',
  }
}

async function getCalendarSettingsRecord(
  env: Env,
): Promise<CalendarSettingsRecord> {
  const document = await getDocument(env, 'settings/calendar')

  if (!document) {
    return {
      calendarId: '',
      configurationUpdatedAt: null,
      defaultDurationMinutes: 90,
      defaultStartTime: '19:30',
      enabled: false,
      exists: false,
      lastSyncMessage: null,
      lastSyncStatus: 'idle',
    }
  }

  return {
    calendarId: getStringField(document, 'calendarId') ?? '',
    configurationUpdatedAt:
      getTimestampField(document, 'configurationUpdatedAt') ??
      getTimestampField(document, 'updatedAt'),
    defaultDurationMinutes:
      getIntegerField(document, 'defaultDurationMinutes') ?? 90,
    defaultStartTime: getStringField(document, 'defaultStartTime') ?? '19:30',
    enabled: getBooleanField(document, 'enabled') ?? false,
    exists: true,
    lastSyncMessage: getNullableStringField(document, 'lastSyncMessage'),
    lastSyncStatus:
      (getStringField(document, 'lastSyncStatus') as CalendarSyncRunStatus | null) ??
      'idle',
  }
}

async function writeCalendarSyncRunState(
  env: Env,
  status: CalendarSyncRunStatus,
  message: string,
) {
  const now = new Date()

  await commitWrites(env, [
    buildUpdateWrite(
      'settings/calendar',
      {
        lastSyncAt: toTimestampValue(now),
        lastSyncMessage: toStringValue(message),
        lastSyncStatus: toStringValue(status),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(resolveWorkerActorUid(env)),
      },
      undefined,
      {},
      env,
    ),
  ])
}

async function markCalendarEventSyncSuccess(
  env: Env,
  calendarEvent: CalendarEventRecord,
  result: {
    calendarId: string | null
    eventId: string | null
    result: 'created' | 'deleted' | 'skipped' | 'updated'
  },
) {
  const now = new Date()

  await commitWrites(env, [
    buildUpdateWrite(
      `calendarEvents/${calendarEvent.id}`,
      {
        googleCalendarCalendarId: result.calendarId
          ? toStringValue(result.calendarId)
          : toNullValue(),
        googleCalendarEventId: result.eventId
          ? toStringValue(result.eventId)
          : toNullValue(),
        googleCalendarClaimedAt: toNullValue(),
        googleCalendarClaimId: toNullValue(),
        googleCalendarRetryCount: toIntegerValue(0),
        googleCalendarSyncError: toNullValue(),
        googleCalendarSyncScheduledFor: toNullValue(),
        googleCalendarSyncStatus: toStringValue('synced'),
        googleCalendarSyncUpdatedAt: toTimestampValue(now),
      },
      undefined,
      calendarEvent.documentUpdateTime
        ? {
            exists: true,
            updateTime: calendarEvent.documentUpdateTime,
          }
        : true,
      env,
    ),
    buildCalendarEventSyncAuditWrite(env, calendarEvent.id, result.result, now, {
      googleCalendarCalendarId: result.calendarId,
      googleCalendarEventId: result.eventId,
      previousGoogleCalendarCalendarId: calendarEvent.googleCalendarCalendarId,
      previousGoogleCalendarEventId: calendarEvent.googleCalendarEventId,
    }),
  ])
}

async function markCalendarEventSyncFailure(
  env: Env,
  calendarEvent: CalendarEventRecord,
  reason: string,
  allowRetry = true,
) {
  const now = new Date()
  const retryDecision = allowRetry
    ? resolveCalendarRetryDecision(calendarEvent.googleCalendarRetryCount, now)
    : {
        nextRetryCount: calendarEvent.googleCalendarRetryCount + 1,
        scheduledFor: null,
        status: 'error' as const,
      }

  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `calendarEvents/${calendarEvent.id}`,
        {
          googleCalendarClaimedAt: toNullValue(),
          googleCalendarClaimId: toNullValue(),
          googleCalendarRetryCount: toIntegerValue(retryDecision.nextRetryCount),
          googleCalendarSyncError: toStringValue(reason),
          googleCalendarSyncScheduledFor: retryDecision.scheduledFor
            ? toTimestampValue(retryDecision.scheduledFor)
            : toNullValue(),
          googleCalendarSyncStatus: toStringValue(retryDecision.status),
          googleCalendarSyncUpdatedAt: toTimestampValue(now),
        },
        undefined,
        calendarEvent.documentUpdateTime
          ? {
              exists: true,
              updateTime: calendarEvent.documentUpdateTime,
            }
          : true,
        env,
      ),
      buildCalendarEventSyncAuditWrite(
        env,
        calendarEvent.id,
        retryDecision.status === 'pending' ? 'requeued' : 'failed',
        now,
        {
          reason,
          googleCalendarCalendarId: calendarEvent.googleCalendarCalendarId,
          googleCalendarEventId: calendarEvent.googleCalendarEventId,
          googleCalendarRetryCount: retryDecision.nextRetryCount,
        },
      ),
    ])
  } catch (error) {
    if (!isFirestorePreconditionError(error)) {
      throw error
    }
  }
}

function buildCalendarEventSyncAuditWrite(
  env: Env,
  calendarEventId: string,
  result: string,
  now: Date,
  metadata: JsonObject,
) {
  return buildUpdateWrite(
    `auditLogs/${crypto.randomUUID()}`,
    {
      action: toStringValue('sync'),
      actorName: toStringValue(resolveWorkerActorName(env)),
      actorUid: toStringValue(resolveWorkerActorUid(env)),
      after: toJsonValue({
        result,
      }),
      before: toNullValue(),
      createdAt: toTimestampValue(now),
      entityId: toStringValue(calendarEventId),
      entityType: toStringValue('calendarEvent'),
      metadata: toJsonValue({
        source: 'phase-12-worker',
        ...metadata,
      }),
    },
    undefined,
    false,
    env,
  )
}

async function markNotificationSent(env: Env, notification: NotificationRecord) {
  const now = new Date()

  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toNullValue(),
      retryCount: toIntegerValue(notification.retryCount),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toTimestampValue(now),
      status: toStringValue('sent'),
      updatedAt: toTimestampValue(now),
    }, undefined, true, env),
    buildNotificationAuditWrite(env, notification.id, 'sent', now, {
      type: notification.type,
    }),
  ])
}

async function markNotificationCancelled(
  env: Env,
  notification: NotificationRecord,
  reason: string,
) {
  const now = new Date()

  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toNullValue(),
      status: toStringValue('cancelled'),
      updatedAt: toTimestampValue(now),
    }, undefined, true, env),
    buildNotificationAuditWrite(env, notification.id, 'cancelled', now, {
      reason,
      type: notification.type,
    }),
  ])
}

async function requeueNotification(
  env: Env,
  notification: NotificationRecord,
  reason: string,
) {
  const now = new Date()
  const nextAttemptAt = new Date(now.getTime() + retryDelayMinutes * 60_000)

  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      retryCount: toIntegerValue(notification.retryCount + 1),
      scheduledFor: toTimestampValue(nextAttemptAt),
      sentAt: toNullValue(),
      status: toStringValue('pending'),
      updatedAt: toTimestampValue(now),
    }, undefined, true, env),
    buildNotificationAuditWrite(env, notification.id, 'requeued', now, {
      nextAttemptAt: nextAttemptAt.toISOString(),
      reason,
      retryCount: notification.retryCount + 1,
      type: notification.type,
    }),
  ])
}

async function markNotificationFailed(
  env: Env,
  notification: NotificationRecord,
  reason: string,
) {
  const now = new Date()

  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      retryCount: toIntegerValue(notification.retryCount + 1),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toNullValue(),
      status: toStringValue('failed'),
      updatedAt: toTimestampValue(now),
    }, undefined, true, env),
    buildNotificationAuditWrite(env, notification.id, 'failed', now, {
      reason,
      retryCount: notification.retryCount + 1,
      type: notification.type,
    }),
  ])
}

function buildNotificationAuditWrite(
  env: Env,
  notificationId: string,
  action: string,
  now: Date,
  metadata: JsonObject,
) {
  return buildUpdateWrite(
    `auditLogs/${crypto.randomUUID()}`,
    {
      action: toStringValue('statusChange'),
      actorName: toStringValue(resolveWorkerActorName(env)),
      actorUid: toStringValue(resolveWorkerActorUid(env)),
      after: toJsonValue({
        action,
      }),
      before: toNullValue(),
      createdAt: toTimestampValue(now),
      entityId: toStringValue(notificationId),
      entityType: toStringValue('notification'),
      metadata: toJsonValue({
        source: 'phase-11-worker',
        ...metadata,
      }),
    },
    undefined,
    false,
    env,
  )
}

function buildPublicConfirmationResponse(
  input: PublicConfirmationResponse,
): PublicConfirmationResponse {
  return input
}

function mapAssignmentSummary(assignment: AssignmentRecord) {
  return {
    assignmentId: assignment.id,
    eventDateLabel: formatEventDateLabel(
      assignment.eventDate,
      'pt-BR',
    ),
    localCongregationName: assignment.localCongregationName,
    originCongregationName: assignment.originCongregationName,
    speakerName: assignment.speakerName,
    status: assignment.status,
    themeNumber: assignment.themeNumber,
    themeTitle: assignment.themeTitle,
  }
}

function parseAssignmentDocument(document: FirestoreDocument): AssignmentRecord {
  return {
    calendarEventId: getRequiredStringField(document, 'calendarEventId'),
    confirmationToken: getNullableStringField(document, 'confirmationToken'),
    documentUpdateTime: document.updateTime ?? null,
    eventDate: getRequiredTimestampField(document, 'eventDate'),
    eventType: getRequiredStringField(document, 'eventType'),
    id: getDocumentId(document.name),
    localCongregationId: getRequiredStringField(document, 'localCongregationId'),
    localCongregationName: getRequiredStringField(document, 'localCongregationName'),
    notes: getStringField(document, 'notes') ?? '',
    originCongregationId: getRequiredStringField(document, 'originCongregationId'),
    originCongregationName: getRequiredStringField(document, 'originCongregationName'),
    speakerId: getRequiredStringField(document, 'speakerId'),
    speakerName: getRequiredStringField(document, 'speakerName'),
    speakerType: getRequiredStringField(document, 'speakerType') as SpeakerType,
    status: getRequiredStringField(document, 'status') as AssignmentStatus,
    themeNumber: getRequiredIntegerField(document, 'themeNumber'),
    themeTitle: getRequiredStringField(document, 'themeTitle'),
    updatedAt: getRequiredTimestampField(document, 'updatedAt'),
  }
}

function parseNotificationDocument(document: FirestoreDocument): NotificationRecord {
  return {
    assignmentId: getNullableStringField(document, 'assignmentId'),
    documentUpdateTime: document.updateTime ?? null,
    id: getDocumentId(document.name),
    recipientEmail: getStringField(document, 'recipientEmail') ?? '',
    retryCount: getRequiredIntegerField(document, 'retryCount'),
    scheduledFor: getRequiredTimestampField(document, 'scheduledFor'),
    status: getRequiredStringField(document, 'status') as NotificationStatus,
    subject: getStringField(document, 'subject') ?? '',
    type: getRequiredStringField(document, 'type') as NotificationType,
  }
}

function parseCalendarEventDocument(document: FirestoreDocument): CalendarEventRecord {
  return {
    congregationId: getNullableStringField(document, 'congregationId'),
    congregationName: getNullableStringField(document, 'congregationName'),
    date: getRequiredTimestampField(document, 'date'),
    description: getNullableStringField(document, 'description'),
    documentUpdateTime: document.updateTime ?? null,
    googleCalendarCalendarId: getNullableStringField(
      document,
      'googleCalendarCalendarId',
    ),
    googleCalendarClaimedAt: getTimestampField(document, 'googleCalendarClaimedAt'),
    googleCalendarClaimId: getNullableStringField(document, 'googleCalendarClaimId'),
    googleCalendarEventId: getNullableStringField(document, 'googleCalendarEventId'),
    googleCalendarManualSyncRequestedAt: getTimestampField(
      document,
      'googleCalendarManualSyncRequestedAt',
    ),
    googleCalendarSyncError: getNullableStringField(
      document,
      'googleCalendarSyncError',
    ),
    googleCalendarRetryCount: getIntegerField(document, 'googleCalendarRetryCount') ?? 0,
    googleCalendarSyncScheduledFor: getTimestampField(
      document,
      'googleCalendarSyncScheduledFor',
    ),
    googleCalendarSyncStatus:
      (getStringField(document, 'googleCalendarSyncStatus') as GoogleCalendarSyncStatus | null) ??
      'pending',
    id: getDocumentId(document.name),
    isActive: getRequiredBooleanField(document, 'isActive'),
    title: getRequiredStringField(document, 'title'),
    type: getRequiredStringField(document, 'type'),
    updatedAt: getRequiredTimestampField(document, 'updatedAt'),
  }
}

function parseCongregationDocument(document: FirestoreDocument): CongregationRecord {
  return {
    address: getStringField(document, 'address') ?? '',
    city: getStringField(document, 'city') ?? '',
    id: getDocumentId(document.name),
    isLocal: getRequiredBooleanField(document, 'isLocal'),
    meetingTime: getStringField(document, 'meetingTime') ?? '',
    name: getRequiredStringField(document, 'name'),
    state: getStringField(document, 'state') ?? '',
  }
}

function parseSpeakerDocument(document: FirestoreDocument): SpeakerRecord {
  return {
    email: getStringField(document, 'email') ?? '',
    id: getDocumentId(document.name),
    name: getRequiredStringField(document, 'name'),
  }
}

async function getSpeakerById(
  env: Env,
  speakerId: string,
  speakerCache: Map<string, SpeakerRecord | null>,
) {
  if (speakerCache.has(speakerId)) {
    return speakerCache.get(speakerId) ?? null
  }

  const speakerDocument = await getDocument(env, `speakers/${speakerId}`)
  const speaker = speakerDocument ? parseSpeakerDocument(speakerDocument) : null

  speakerCache.set(speakerId, speaker)

  return speaker
}

function normalizeEmailValue(email: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() ?? ''

  return normalizedEmail ? normalizedEmail : null
}

async function handleAdminAccessReconcile(request: Request, env: Env) {
  const caller = await getFirebaseUserFromRequest(request, env)
  const callerEmail = normalizeEmailValue(caller?.email ?? null)

  if (!caller || !callerEmail) {
    return jsonResponse(
      {
        authorized: false,
        message: 'Sessao Google invalida.',
      },
      401,
    )
  }

  const settings = await getAdminAccessSettingsRecord(env)

  if (!settings.adminEmails.includes(callerEmail)) {
    return jsonResponse(
      {
        authorized: false,
        message: 'Este e-mail não possui acesso administrativo.',
      },
      403,
    )
  }

  const tokenRefreshRequired = !hasFirebaseAdminClaim(caller)

  if (tokenRefreshRequired) {
    await setFirebaseAdminClaim(env, caller, true)
  }

  return jsonResponse({
    authorized: true,
    email: callerEmail,
    tokenRefreshRequired,
  })
}

async function handleListAdminUsers(request: Request, env: Env) {
  const caller = await getAuthorizedAdminCaller(request, env)

  if (!caller) {
    return buildUnauthorizedAdminResponse()
  }

  return jsonResponse(await buildAdminUsersResponse(env))
}

async function handleProcessManualNotification(request: Request, env: Env) {
  const caller = await getAuthorizedAdminCaller(request, env)

  if (!caller) {
    return buildUnauthorizedAdminResponse()
  }

  const notificationId = await readNotificationIdFromRequest(request)

  if (!notificationId) {
    return jsonResponse(
      {
        error: 'invalid_notification',
        message: 'A notificação informada é inválida.',
      },
      400,
    )
  }

  const notificationDocument = await getDocument(env, `notifications/${notificationId}`)

  if (!notificationDocument) {
    return jsonResponse(
      {
        error: 'notification_not_found',
        message: 'A notificação de e-mail não foi encontrada.',
      },
      404,
    )
  }

  const notification = parseNotificationDocument(notificationDocument)

  if (notification.type !== 'manual') {
    return jsonResponse(
      {
        error: 'invalid_notification_type',
        message: 'Este endpoint processa apenas envios manuais.',
      },
      400,
    )
  }

  if (notification.status === 'sent') {
    return jsonResponse({ result: 'sent' })
  }

  if (notification.status !== 'pending') {
    return jsonResponse(
      {
        error: 'notification_not_pending',
        message: 'Este e-mail não está disponível para processamento.',
      },
      409,
    )
  }

  const result = await processSingleNotification(env, notification, {
    allowRetry: false,
  })

  if (result === 'sent') {
    return jsonResponse({ result })
  }

  const updatedDocument = await getDocument(env, `notifications/${notificationId}`)
  const errorMessage = updatedDocument
    ? getNullableStringField(updatedDocument, 'errorMessage')
    : null

  if (result === 'requeued') {
    return jsonResponse({
      message:
        errorMessage ??
        'O provedor não concluiu o envio. Uma nova tentativa foi agendada.',
      result,
    }, 202)
  }

  return jsonResponse(
    {
      error: `notification_${result}`,
      message:
        errorMessage ??
        (result === 'cancelled'
          ? 'O envio foi cancelado porque a designação não está mais disponível.'
          : result === 'skipped'
            ? 'O e-mail já está sendo processado.'
            : 'Não foi possível enviar o e-mail de confirmação.'),
      result,
    },
    result === 'failed' ? 422 : 409,
  )
}

async function handleProcessManualCalendarSync(request: Request, env: Env) {
  const caller = await getAuthorizedAdminCaller(request, env)

  if (!caller) {
    return buildUnauthorizedAdminResponse()
  }

  const calendarEventId = await readCalendarEventIdFromRequest(request)

  if (!calendarEventId) {
    return jsonResponse(
      {
        error: 'invalid_calendar_event',
        message: 'O evento informado para sincronização é inválido.',
      },
      400,
    )
  }

  const calendarEventDocument = await getDocument(
    env,
    `calendarEvents/${calendarEventId}`,
  )

  if (!calendarEventDocument) {
    return jsonResponse(
      {
        error: 'calendar_event_not_found',
        message: 'O evento informado não foi encontrado.',
      },
      404,
    )
  }

  const calendarEvent = parseCalendarEventDocument(calendarEventDocument)
  const calendarSettings = await getCalendarSettingsRecord(env)
  const configurationError = !calendarSettings.exists || !calendarSettings.enabled
    ? 'Ative a integração com Google Calendar nas configurações antes de sincronizar.'
    : !calendarSettings.calendarId
      ? 'Calendar ID ausente. Revise as configurações antes de sincronizar.'
      : null

  if (configurationError) {
    await markCalendarEventSyncFailure(
      env,
      calendarEvent,
      configurationError,
      false,
    )

    return jsonResponse(
      {
        error: 'calendar_configuration_error',
        message: configurationError,
      },
      422,
    )
  }

  const claimedCalendarEvent = await claimCalendarEventForProcessing(
    env,
    calendarEvent,
  )

  if (!claimedCalendarEvent) {
    return jsonResponse(
      {
        error: 'calendar_sync_in_progress',
        message: 'Este evento já está sendo sincronizado. Aguarde a conclusão.',
      },
      409,
    )
  }

  const result = await processSingleCalendarEventSync(
    env,
    calendarSettings,
    claimedCalendarEvent,
    new Map<string, CongregationRecord | null>(),
    new Map<string, SpeakerRecord | null>(),
    { allowRetry: false },
  )

  if (result === 'failed') {
    const updatedDocument = await getDocument(
      env,
      `calendarEvents/${calendarEventId}`,
    )
    const errorMessage = updatedDocument
      ? getNullableStringField(updatedDocument, 'googleCalendarSyncError')
      : null

    return jsonResponse(
      {
        error: 'calendar_sync_failed',
        message: errorMessage ?? 'Não foi possível sincronizar a agenda.',
      },
      422,
    )
  }

  return jsonResponse({ result })
}

async function handleAddAdminUser(request: Request, env: Env) {
  const caller = await getAuthorizedAdminCaller(request, env)

  if (!caller) {
    return buildUnauthorizedAdminResponse()
  }

  const callerEmail = normalizeEmailValue(caller.email ?? null)
  const email = await readAdminEmailFromRequest(request)

  if (!callerEmail || !email) {
    return jsonResponse(
      {
        error: 'invalid_email',
        message: 'Informe um e-mail valido.',
      },
      400,
    )
  }

  const settings = await getAdminAccessSettingsRecord(env)

  if (!settings.adminEmails.includes(email)) {
    await saveAdminAccessSettings(env, settings, {
      action: 'add',
      actorEmail: callerEmail,
      adminEmails: [...settings.adminEmails, email].sort(),
      targetEmail: email,
    })
  }

  return jsonResponse(await buildAdminUsersResponse(env))
}

async function handleRemoveAdminUser(request: Request, env: Env) {
  const caller = await getAuthorizedAdminCaller(request, env)

  if (!caller) {
    return buildUnauthorizedAdminResponse()
  }

  const callerEmail = normalizeEmailValue(caller.email ?? null)
  const email = await readAdminEmailFromRequest(request)

  if (!callerEmail || !email) {
    return jsonResponse(
      {
        error: 'invalid_email',
        message: 'Informe um e-mail valido.',
      },
      400,
    )
  }

  if (callerEmail === email) {
    return jsonResponse(
      {
        error: 'self_removal_not_allowed',
        message: 'Você não pode remover o próprio acesso administrativo.',
      },
      400,
    )
  }

  const settings = await getAdminAccessSettingsRecord(env)
  const nextAdminEmails = settings.adminEmails.filter(
    (adminEmail) => adminEmail !== email,
  )

  if (nextAdminEmails.length === 0) {
    return jsonResponse(
      {
        error: 'last_admin_removal_not_allowed',
        message: 'O sistema precisa manter pelo menos um administrador.',
      },
      400,
    )
  }

  if (nextAdminEmails.length !== settings.adminEmails.length) {
    await saveAdminAccessSettings(env, settings, {
      action: 'remove',
      actorEmail: callerEmail,
      adminEmails: nextAdminEmails,
      targetEmail: email,
    })
  }

  const targetUser = await lookupFirebaseUserByEmail(env, email)

  if (targetUser && hasFirebaseAdminClaim(targetUser)) {
    await setFirebaseAdminClaim(env, targetUser, false)
  }

  return jsonResponse(await buildAdminUsersResponse(env))
}

function buildUnauthorizedAdminResponse() {
  return jsonResponse(
    {
      error: 'unauthorized',
      message: 'Sessao administrativa ausente ou invalida.',
    },
    401,
  )
}

async function getAuthorizedAdminCaller(request: Request, env: Env) {
  const caller = await getFirebaseUserFromRequest(request, env)
  const callerEmail = normalizeEmailValue(caller?.email ?? null)

  if (!caller || !callerEmail || !hasFirebaseAdminClaim(caller)) {
    return null
  }

  const settings = await getAdminAccessSettingsRecord(env)

  if (!settings.adminEmails.includes(callerEmail)) {
    return null
  }

  return caller
}

async function getFirebaseUserFromRequest(request: Request, env: Env) {
  const idToken = getBearerToken(request)

  if (!idToken) {
    return null
  }

  try {
    const response = await callIdentityToolkit<IdentityToolkitUsersResponse>(
      env,
      `/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
      {
        idToken,
      },
    )

    return response.users?.[0] ?? null
  } catch (error) {
    if (
      error instanceof IdentityToolkitRequestError &&
      (error.status === 400 || error.status === 401)
    ) {
      return null
    }

    throw error
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')?.trim() ?? ''

  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

async function readAdminEmailFromRequest(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('email' in payload) ||
    typeof payload.email !== 'string'
  ) {
    return null
  }

  const email = normalizeEmailValue(payload.email)

  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

async function readNotificationIdFromRequest(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('notificationId' in payload) ||
    typeof payload.notificationId !== 'string'
  ) {
    return null
  }

  const notificationId = payload.notificationId.trim()

  return /^[A-Za-z0-9_-]+__manual$/.test(notificationId) ? notificationId : null
}

async function readCalendarEventIdFromRequest(request: Request) {
  const payload = (await request.json().catch(() => null)) as unknown

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('calendarEventId' in payload) ||
    typeof payload.calendarEventId !== 'string'
  ) {
    return null
  }

  const calendarEventId = payload.calendarEventId.trim()

  return /^[A-Za-z0-9_-]+$/.test(calendarEventId) ? calendarEventId : null
}

async function getAdminAccessSettingsRecord(
  env: Env,
): Promise<AdminAccessSettingsRecord> {
  const document = await getDocument(env, 'settings/adminAccess')

  if (!document) {
    return {
      adminEmails: [],
      createdAt: null,
      createdBy: null,
      documentUpdateTime: null,
    }
  }

  return {
    adminEmails: getStringArrayField(document, 'adminEmails')
      .map((email) => normalizeEmailValue(email))
      .filter((email): email is string => Boolean(email)),
    createdAt: getTimestampField(document, 'createdAt'),
    createdBy: getStringField(document, 'createdBy'),
    documentUpdateTime: document.updateTime ?? null,
  }
}

async function saveAdminAccessSettings(
  env: Env,
  settings: AdminAccessSettingsRecord,
  input: {
    action: 'add' | 'remove'
    actorEmail: string
    adminEmails: string[]
    targetEmail: string
  },
) {
  const now = new Date()
  const normalizedAdminEmails = Array.from(new Set(input.adminEmails)).sort()

  await commitWrites(env, [
    buildUpdateWrite(
      'settings/adminAccess',
      {
        adminEmails: toJsonValue(normalizedAdminEmails),
        createdAt: toTimestampValue(settings.createdAt ?? now),
        createdBy: toStringValue(settings.createdBy ?? input.actorEmail),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(input.actorEmail),
      },
      undefined,
      settings.documentUpdateTime
        ? {
            exists: true,
            updateTime: settings.documentUpdateTime,
          }
        : false,
      env,
    ),
    buildUpdateWrite(
      `auditLogs/${crypto.randomUUID()}`,
      {
        action: toStringValue('update'),
        actorName: toStringValue(input.actorEmail),
        actorUid: toStringValue(input.actorEmail),
        after: toJsonValue({
          adminEmails: normalizedAdminEmails,
        }),
        before: toJsonValue({
          adminEmails: settings.adminEmails,
        }),
        createdAt: toTimestampValue(now),
        entityId: toStringValue('adminAccess'),
        entityType: toStringValue('settings'),
        metadata: toJsonValue({
          action: input.action,
          source: 'admin-access-panel',
          targetEmail: input.targetEmail,
        }),
      },
      undefined,
      false,
      env,
    ),
  ])
}

async function buildAdminUsersResponse(env: Env) {
  const settings = await getAdminAccessSettingsRecord(env)
  const users = await lookupFirebaseUsersByEmail(env, settings.adminEmails)
  const usersByEmail = new Map(
    users.flatMap((user) => {
      const email = normalizeEmailValue(user.email ?? null)

      return email ? [[email, user] as const] : []
    }),
  )

  return {
    users: settings.adminEmails.map((email) => {
      const user = usersByEmail.get(email)

      return {
        displayName: user?.displayName ?? null,
        email,
        hasAdminClaim: user ? hasFirebaseAdminClaim(user) : false,
        hasFirebaseAccount: Boolean(user),
      }
    }),
  }
}

async function lookupFirebaseUserByEmail(env: Env, email: string) {
  const users = await lookupFirebaseUsersByEmail(env, [email])

  return users[0] ?? null
}

async function lookupFirebaseUsersByEmail(env: Env, emails: string[]) {
  if (emails.length === 0) {
    return []
  }

  const response = await callIdentityToolkit<IdentityToolkitUsersResponse>(
    env,
    `/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    {
      email: emails,
    },
  )

  return response.users ?? []
}

function hasFirebaseAdminClaim(user: FirebaseAuthUserRecord) {
  return parseFirebaseCustomAttributes(user.customAttributes).admin === true
}

async function setFirebaseAdminClaim(
  env: Env,
  user: FirebaseAuthUserRecord,
  isAdmin: boolean,
) {
  const customAttributes = parseFirebaseCustomAttributes(user.customAttributes)

  if (isAdmin) {
    customAttributes.admin = true
  } else {
    delete customAttributes.admin
  }

  await callIdentityToolkit(
    env,
    `/projects/${env.FIREBASE_PROJECT_ID}/accounts:update`,
    {
      customAttributes: JSON.stringify(customAttributes),
      localId: user.localId,
      validSince: String(Math.floor(Date.now() / 1000)),
    },
  )
}

function parseFirebaseCustomAttributes(customAttributes?: string): JsonObject {
  if (!customAttributes) {
    return {}
  }

  try {
    const parsed = JSON.parse(customAttributes) as unknown

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      !isJsonValue(parsed)
    ) {
      return {}
    }

    return parsed as JsonObject
  } catch {
    return {}
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry))
  }

  if (typeof value === 'object') {
    return Object.values(value).every((entry) => isJsonValue(entry))
  }

  return false
}

class IdentityToolkitRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function callIdentityToolkit<T = JsonObject>(
  env: Env,
  path: string,
  body: JsonObject,
) {
  const response = await fetch(`${identityToolkitBaseUrl}${path}`, {
    method: 'POST',
    headers: await buildGoogleApiHeaders(env),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()

    throw new IdentityToolkitRequestError(
      response.status,
      `Falha ao consultar Firebase Auth: ${errorText}`,
    )
  }

  return (await response.json()) as T
}

async function getDocument(env: Env, path: string) {
  const response = await fetch(buildFirestoreUrl(env, `/documents/${path}`), {
    method: 'GET',
    headers: await buildFirestoreHeaders(env),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao ler ${path}: ${errorText}`)
  }

  return (await response.json()) as FirestoreDocument
}

async function runQuery(
  env: Env,
  structuredQuery: JsonObject,
) {
  const response = await fetch(
    buildFirestoreUrl(env, '/documents:runQuery'),
    {
      method: 'POST',
      headers: await buildFirestoreHeaders(env),
      body: JSON.stringify({
        structuredQuery,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao consultar Firestore: ${errorText}`)
  }

  return (await response.json()) as FirestoreRunQueryRow[]
}

async function commitWrites(env: Env, writes: FirestoreCommitWrite[]) {
  const response = await fetch(
    buildFirestoreUrl(env, '/documents:commit'),
    {
      method: 'POST',
      headers: await buildFirestoreHeaders(env),
      body: JSON.stringify({
        writes,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao gravar no Firestore: ${errorText}`)
  }
}

function isFirestorePreconditionError(error: unknown) {
  return error instanceof Error && error.message.includes('FAILED_PRECONDITION')
}

function buildUpdateWrite(
  path: string,
  fields: Record<string, FirestoreValue>,
  fieldPaths = Object.keys(fields),
  currentDocument: { exists?: boolean; updateTime?: string } | boolean = true,
  env?: Env,
): FirestoreCommitWrite {
  if (!env) {
    throw new Error('Env ausente ao montar write do Firestore.')
  }

  const normalizedCurrentDocument =
    typeof currentDocument === 'boolean'
      ? {
          exists: currentDocument,
        }
      : currentDocument.updateTime
        ? {
            updateTime: currentDocument.updateTime,
          }
        : typeof currentDocument.exists === 'boolean'
          ? {
              exists: currentDocument.exists,
            }
          : undefined

  return {
    ...(normalizedCurrentDocument
      ? {
          currentDocument: normalizedCurrentDocument,
        }
      : {}),
    update: {
      fields,
      name: buildDocumentName(env, path),
    },
    updateMask: {
      fieldPaths,
    },
  }
}

function buildDocumentName(env: Env, path: string) {
  const normalizedPath = path.replace(/^\/+/, '')

  return `projects/${env.FIREBASE_PROJECT_ID}/databases/${firestoreDatabaseId}/documents/${normalizedPath}`
}

async function buildFirestoreHeaders(env: Env) {
  const accessToken = await getGoogleAccessToken(env)

  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function buildGoogleApiHeaders(env: Env) {
  const accessToken = await getGoogleAccessToken(env)

  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

function buildFirestoreUrl(env: Env, suffix: string) {
  return `${firestoreBaseUrl}/projects/${env.FIREBASE_PROJECT_ID}/databases/${firestoreDatabaseId}${suffix}`
}

async function getGoogleAccessToken(env: Env) {
  const now = Date.now()

  if (googleAccessTokenSession && googleAccessTokenSession.expiresAt - 60_000 > now) {
    return googleAccessTokenSession.accessToken
  }

  const jwtAssertion = await buildServiceAccountJwtAssertion(env)
  const response = await fetch(googleOauthTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      assertion: jwtAssertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao autenticar o worker com service account: ${errorText}`)
  }

  const payload = (await response.json()) as {
    access_token: string
    expires_in: number
    token_type?: string
  }
  const expiresInSeconds = payload.expires_in

  googleAccessTokenSession = {
    accessToken: payload.access_token,
    expiresAt: now + expiresInSeconds * 1000,
  }

  return payload.access_token
}

async function buildServiceAccountJwtAssertion(env: Env) {
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
  }
  const jwtPayload = {
    aud: googleOauthTokenUrl,
    exp: nowInSeconds + 3600,
    iat: nowInSeconds,
    iss: env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope: googleWorkerScopes,
  }
  const encodedHeader = base64UrlEncodeJson(jwtHeader)
  const encodedPayload = base64UrlEncodeJson(jwtPayload)
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = await signJwtWithServiceAccountKey(
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    signingInput,
  )

  return `${signingInput}.${signature}`
}

async function signJwtWithServiceAccountKey(
  privateKeyPem: string,
  signingInput: string,
) {
  const normalizedPrivateKey = privateKeyPem.replace(/\\n/g, '\n').trim()
  const pkcs8Der = pemToArrayBuffer(normalizedPrivateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Der,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )

  return base64UrlEncodeBuffer(signatureBuffer)
}

function pemToArrayBuffer(pemValue: string) {
  const base64Body = pemValue
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binaryString = atob(base64Body)
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0))

  return bytes.buffer
}

function base64UrlEncodeJson(value: JsonObject) {
  return base64UrlEncodeText(JSON.stringify(value))
}

function base64UrlEncodeText(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlEncodeBuffer(value: ArrayBuffer) {
  const bytes = new Uint8Array(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function buildConfirmationUrl(env: Env, assignment: AssignmentRecord) {
  const confirmationUrl = new URL(env.APP_CONFIRMATION_BASE_URL)

  confirmationUrl.searchParams.set('assignmentId', assignment.id)
  confirmationUrl.searchParams.set('token', assignment.confirmationToken ?? '')

  return confirmationUrl.toString()
}

function resolveNotificationBatchSize(env: Env) {
  const parsed = Number.parseInt(env.NOTIFICATION_BATCH_SIZE ?? '', 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultBatchSize
  }

  return Math.min(parsed, 20)
}

function resolveCalendarSyncBatchSize(env: Env) {
  const parsed = Number.parseInt(env.CALENDAR_SYNC_BATCH_SIZE ?? '', 10)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultCalendarSyncBatchSize
  }

  return Math.min(parsed, 20)
}

function resolveWorkerActorUid(env: Env) {
  return env.WORKER_ACTOR_UID?.trim() || 'worker-automations'
}

function resolveWorkerActorName(env: Env) {
  return env.WORKER_ACTOR_NAME?.trim() || 'Worker Automacoes'
}

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }
}

function jsonResponse(payload: JsonValue, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: buildCorsHeaders(),
    status,
  })
}

function isInternalRequestAuthorized(request: Request, env: Env) {
  const configuredToken = env.INTERNAL_API_TOKEN?.trim()

  if (!configuredToken) {
    return false
  }

  const authHeader = request.headers.get('Authorization')?.trim() ?? ''

  return authHeader === `Bearer ${configuredToken}`
}

function buildFieldFilter(
  fieldPath: string,
  op:
    | 'EQUAL'
    | 'LESS_THAN_OR_EQUAL',
  value: FirestoreValue,
): JsonObject {
  return {
    fieldFilter: {
      field: {
        fieldPath,
      },
      op,
      value,
    },
  }
}

function toStringValue(value: string): FirestoreValue {
  return {
    stringValue: value,
  }
}

function toIntegerValue(value: number): FirestoreValue {
  return {
    integerValue: String(Math.trunc(value)),
  }
}

function toTimestampValue(value: Date): FirestoreValue {
  return {
    timestampValue: value.toISOString(),
  }
}

function toNullValue(): FirestoreValue {
  return {
    nullValue: null,
  }
}

function toBooleanValue(value: boolean): FirestoreValue {
  return {
    booleanValue: value,
  }
}

function toJsonValue(value: JsonValue): FirestoreValue {
  if (value === null) {
    return toNullValue()
  }

  if (typeof value === 'string') {
    return toStringValue(value)
  }

  if (typeof value === 'number') {
    return toIntegerValue(value)
  }

  if (typeof value === 'boolean') {
    return toBooleanValue(value)
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toJsonValue(item)),
      },
    }
  }

  const fieldEntries = Object.entries(value).map(([key, entryValue]) => [
    key,
    toJsonValue(entryValue),
  ])

  return {
    mapValue: {
      fields: Object.fromEntries(fieldEntries),
    },
  }
}

function getDocumentId(documentName: string) {
  const parts = documentName.split('/')

  return parts[parts.length - 1] ?? documentName
}

function getField(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]
}

function getStringField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (field && 'stringValue' in field) {
    return field.stringValue
  }

  return null
}

function getStringArrayField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('arrayValue' in field)) {
    return []
  }

  return (
    field.arrayValue.values
      ?.flatMap((value) => ('stringValue' in value ? [value.stringValue] : [])) ??
    []
  )
}

function getIntegerField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('integerValue' in field)) {
    return null
  }

  return Number.parseInt(field.integerValue, 10)
}

function getBooleanField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('booleanValue' in field)) {
    return null
  }

  return field.booleanValue
}

function getNullableStringField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field) {
    return null
  }

  if ('nullValue' in field) {
    return null
  }

  if ('stringValue' in field) {
    return field.stringValue
  }

  return null
}

function getRequiredStringField(document: FirestoreDocument, fieldName: string) {
  const value = getStringField(document, fieldName)

  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return value
}

function getRequiredIntegerField(document: FirestoreDocument, fieldName: string) {
  const value = getIntegerField(document, fieldName)

  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return value
}

function getRequiredBooleanField(document: FirestoreDocument, fieldName: string) {
  const value = getBooleanField(document, fieldName)

  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return value
}

function getRequiredTimestampField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('timestampValue' in field)) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return new Date(field.timestampValue)
}

function getTimestampField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('timestampValue' in field)) {
    return null
  }

  return new Date(field.timestampValue)
}

function formatEventDateLabel(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeZone: defaultCalendarZoneId,
  }).format(value)
}

function toStartOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0)
}

function isOperationalAssignmentStatus(status: AssignmentStatus) {
  return status === 'pending' || status === 'confirmed'
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Falha desconhecida na integração com Google Calendar.'
}

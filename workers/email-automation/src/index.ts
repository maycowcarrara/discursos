type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void
}

type ScheduledController = {
  readonly cron: string
  readonly scheduledTime: number
}

type Env = {
  APP_CONFIRMATION_BASE_URL: string
  EMAILJS_PRIVATE_KEY: string
  EMAILJS_PUBLIC_KEY: string
  EMAILJS_SERVICE_ID: string
  EMAILJS_TEMPLATE_ID: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_SERVICE_EMAIL: string
  FIREBASE_SERVICE_PASSWORD: string
  FIREBASE_WEB_API_KEY: string
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

type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'
type NotificationType = 'confirmation' | 'reminder7d' | 'reminder1d' | 'manual'

type AssignmentRecord = {
  calendarEventId: string
  confirmationToken: string | null
  eventDate: Date
  eventType: string
  id: string
  localCongregationName: string
  notes: string
  originCongregationName: string
  speakerId: string
  speakerName: string
  status: AssignmentStatus
  themeNumber: number
  themeTitle: string
  updatedAt: Date
}

type NotificationRecord = {
  assignmentId: string | null
  id: string
  recipientEmail: string
  retryCount: number
  scheduledFor: Date
  status: NotificationStatus
  subject: string
  type: NotificationType
}

type SettingsRecord = {
  locale: string
  organizationName: string
  timezone: string
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

type NotificationProcessResult = 'cancelled' | 'failed' | 'requeued' | 'sent'

type FirebaseSession = {
  expiresAt: number
  idToken: string
}

const firestoreDatabaseId = '(default)'
const firestoreBaseUrl = 'https://firestore.googleapis.com/v1'
const firebaseAuthBaseUrl = 'https://identitytoolkit.googleapis.com/v1'
const emailJsSendUrl = 'https://api.emailjs.com/api/v1.0/email/send'
const defaultBatchSize = 10
const maxRetryCount = 3
const retryDelayMinutes = 30
const notificationTypeLabels: Record<NotificationType, string> = {
  confirmation: 'Confirmacao',
  reminder7d: 'Lembrete de 7 dias',
  reminder1d: 'Lembrete de 1 dia',
  manual: 'Envio manual',
}
const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  replaced: 'Substituido',
}
const eventTypeLabels: Record<string, string> = {
  publicTalk: 'Discurso publico',
  congress: 'Congresso',
  assembly: 'Assembleia',
  visit: 'Visita',
  special: 'Especial',
}

let firebaseSession: FirebaseSession | null = null

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
            message: 'Token interno ausente ou invalido.',
          },
          401,
        )
      }

      const processingPromise = processDueNotifications(env)

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
        message: 'Rota nao encontrada.',
      },
      404,
    )
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processDueNotifications(env))
  },
}

async function handlePublicAssignmentPreview(requestUrl: URL, env: Env) {
  const assignmentId = requestUrl.searchParams.get('assignmentId')?.trim() ?? ''
  const token = requestUrl.searchParams.get('token')?.trim() ?? ''

  if (!assignmentId || !token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link de confirmacao esta incompleto.',
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
        message: 'Este link de confirmacao esta incompleto.',
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

  const assignment = await getAssignmentById(env, assignmentId)

  if (!assignment || assignment.confirmationToken !== token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: 'Este link nao corresponde mais a uma designacao ativa.',
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
        message: 'Este slot ja foi ocupado por outra designacao operacional.',
        state: 'conflict',
      }),
      409,
    )
  }

  const now = new Date()
  await commitWrites(env, [
    buildUpdateWrite(`assignments/${assignment.id}`, {
      confirmedAt: toTimestampValue(now),
      responseAt: toTimestampValue(now),
      status: toStringValue('confirmed'),
      updatedAt: toTimestampValue(now),
      updatedBy: toStringValue(resolveWorkerActorUid(env)),
    }, undefined, true, env),
    buildUpdateWrite(`auditLogs/${crypto.randomUUID()}`, {
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
    }, undefined, false, env),
  ])

  return jsonResponse(
    buildPublicConfirmationResponse({
      assignment: {
        ...mapAssignmentSummary(assignment),
        status: 'confirmed',
      },
      message: 'Designacao confirmada com sucesso.',
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
      message: 'Este link nao e mais valido para confirmacao.',
      state: 'invalid',
    })
  }

  if (assignment.status === 'confirmed') {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: 'Esta designacao ja havia sido confirmada anteriormente.',
      state: 'confirmed',
    })
  }

  if (!isOperationalAssignmentStatus(assignment.status)) {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: 'Esta designacao nao esta mais ativa para confirmacao.',
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
      message: 'Este slot ja foi remanejado para outra designacao.',
      state: 'conflict',
    })
  }

  return buildPublicConfirmationResponse({
    assignment: mapAssignmentSummary(assignment),
    message: 'Tudo certo. Voce pode confirmar esta designacao agora.',
    state: 'pending',
  })
}

async function processDueNotifications(env: Env) {
  const dueNotifications = await listDueNotifications(env)
  const settings = await getSettingsRecord(env)
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

    const result = await processSingleNotification(env, settings, notification)

    if (result === 'sent') {
      summary.sent += 1
    } else if (result === 'failed') {
      summary.failed += 1
    } else if (result === 'requeued') {
      summary.requeued += 1
    } else {
      summary.cancelled += 1
    }

    if (index < dueNotifications.length - 1) {
      await sleep(1100)
    }
  }

  return summary
}

async function processSingleNotification(
  env: Env,
  settings: SettingsRecord,
  notification: NotificationRecord,
): Promise<NotificationProcessResult> {
  if (!notification.assignmentId) {
    await markNotificationCancelled(env, notification, 'Notificacao sem assignmentId ativo.')
    return 'cancelled'
  }

  const assignment = await getAssignmentById(env, notification.assignmentId)

  if (!assignment) {
    await markNotificationFailed(
      env,
      notification,
      'A designacao vinculada a esta notificacao nao foi encontrada.',
    )
    return 'failed'
  }

  if (notification.type === 'confirmation' && assignment.status !== 'pending') {
    await markNotificationCancelled(
      env,
      notification,
      'Confirmacao automatica cancelada porque a designacao nao esta mais pendente.',
    )
    return 'cancelled'
  }

  if (notification.type !== 'confirmation' && !isOperationalAssignmentStatus(assignment.status)) {
    await markNotificationCancelled(
      env,
      notification,
      'Lembrete cancelado porque a designacao nao esta mais operacional.',
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
      'Lembrete cancelado porque a data do evento ja passou.',
    )
    return 'cancelled'
  }

  const emailResponse = await sendEmail(env, settings, notification, assignment)

  if (emailResponse.ok) {
    await markNotificationSent(env, notification)
    return 'sent'
  }

  if (notification.retryCount + 1 >= maxRetryCount) {
    await markNotificationFailed(env, notification, emailResponse.errorMessage)
    return 'failed'
  }

  await requeueNotification(env, notification, emailResponse.errorMessage)
  return 'requeued'
}

async function sendEmail(
  env: Env,
  settings: SettingsRecord,
  notification: NotificationRecord,
  assignment: AssignmentRecord,
) {
  const confirmationUrl = buildConfirmationUrl(env, assignment)
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
        event_date: formatEventDateLabel(
          assignment.eventDate,
          settings.locale,
          settings.timezone,
        ),
        event_type_label: eventTypeLabels[assignment.eventType] ?? assignment.eventType,
        local_congregation_name: assignment.localCongregationName,
        notes: assignment.notes,
        notification_type_label: notificationTypeLabels[notification.type],
        organization_name: settings.organizationName,
        origin_congregation_name: assignment.originCongregationName,
        speaker_name: assignment.speakerName,
        status_label: assignmentStatusLabels[assignment.status],
        theme_number: String(assignment.themeNumber),
        theme_title: assignment.themeTitle,
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

async function listDueNotifications(env: Env) {
  const nowIso = new Date().toISOString()
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
        filters: [
          buildFieldFilter('status', 'EQUAL', toStringValue('pending')),
          buildFieldFilter('scheduledFor', 'LESS_THAN_OR_EQUAL', toTimestampValue(new Date(nowIso))),
        ],
        op: 'AND',
      },
    },
  })

  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map(parseNotificationDocument)
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

async function getAssignmentById(env: Env, assignmentId: string) {
  const document = await getDocument(env, `assignments/${assignmentId}`)

  if (!document) {
    return null
  }

  return parseAssignmentDocument(document)
}

async function getSettingsRecord(env: Env): Promise<SettingsRecord> {
  const document = await getDocument(env, 'settings/app')

  if (!document) {
    return {
      locale: 'pt-BR',
      organizationName: 'Organizacao',
      timezone: 'America/Sao_Paulo',
    }
  }

  return {
    locale: getStringField(document, 'locale') ?? 'pt-BR',
    organizationName: getStringField(document, 'organizationName') ?? 'Organizacao',
    timezone: getStringField(document, 'timezone') ?? 'America/Sao_Paulo',
  }
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
      'America/Sao_Paulo',
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
    eventDate: getRequiredTimestampField(document, 'eventDate'),
    eventType: getRequiredStringField(document, 'eventType'),
    id: getDocumentId(document.name),
    localCongregationName: getRequiredStringField(document, 'localCongregationName'),
    notes: getStringField(document, 'notes') ?? '',
    originCongregationName: getRequiredStringField(document, 'originCongregationName'),
    speakerId: getRequiredStringField(document, 'speakerId'),
    speakerName: getRequiredStringField(document, 'speakerName'),
    status: getRequiredStringField(document, 'status') as AssignmentStatus,
    themeNumber: getRequiredIntegerField(document, 'themeNumber'),
    themeTitle: getRequiredStringField(document, 'themeTitle'),
    updatedAt: getRequiredTimestampField(document, 'updatedAt'),
  }
}

function parseNotificationDocument(document: FirestoreDocument): NotificationRecord {
  return {
    assignmentId: getNullableStringField(document, 'assignmentId'),
    id: getDocumentId(document.name),
    recipientEmail: getStringField(document, 'recipientEmail') ?? '',
    retryCount: getRequiredIntegerField(document, 'retryCount'),
    scheduledFor: getRequiredTimestampField(document, 'scheduledFor'),
    status: getRequiredStringField(document, 'status') as NotificationStatus,
    subject: getStringField(document, 'subject') ?? '',
    type: getRequiredStringField(document, 'type') as NotificationType,
  }
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

function buildUpdateWrite(
  path: string,
  fields: Record<string, FirestoreValue>,
  fieldPaths = Object.keys(fields),
  mustExist = true,
  env?: Env,
): FirestoreCommitWrite {
  if (!env) {
    throw new Error('Env ausente ao montar write do Firestore.')
  }

  return {
    currentDocument: {
      exists: mustExist,
    },
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
  const idToken = await getFirebaseIdToken(env)

  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  }
}

function buildFirestoreUrl(env: Env, suffix: string) {
  return `${firestoreBaseUrl}/projects/${env.FIREBASE_PROJECT_ID}/databases/${firestoreDatabaseId}${suffix}`
}

async function getFirebaseIdToken(env: Env) {
  const now = Date.now()

  if (firebaseSession && firebaseSession.expiresAt - 60_000 > now) {
    return firebaseSession.idToken
  }

  const response = await fetch(
    `${firebaseAuthBaseUrl}/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: env.FIREBASE_SERVICE_EMAIL,
        password: env.FIREBASE_SERVICE_PASSWORD,
        returnSecureToken: true,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(`Falha ao autenticar o worker no Firebase: ${errorText}`)
  }

  const payload = (await response.json()) as {
    expiresIn: string
    idToken: string
  }
  const expiresInSeconds = Number.parseInt(payload.expiresIn, 10)

  firebaseSession = {
    expiresAt: now + expiresInSeconds * 1000,
    idToken: payload.idToken,
  }

  return payload.idToken
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

function resolveWorkerActorUid(env: Env) {
  return env.WORKER_ACTOR_UID?.trim() || 'worker-emailjs'
}

function resolveWorkerActorName(env: Env) {
  return env.WORKER_ACTOR_NAME?.trim() || 'Worker EmailJS'
}

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  const field = getField(document, fieldName)

  if (!field || !('integerValue' in field)) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return Number.parseInt(field.integerValue, 10)
}

function getRequiredTimestampField(document: FirestoreDocument, fieldName: string) {
  const field = getField(document, fieldName)

  if (!field || !('timestampValue' in field)) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`)
  }

  return new Date(field.timestampValue)
}

function formatEventDateLabel(value: Date, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeZone: timezone,
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

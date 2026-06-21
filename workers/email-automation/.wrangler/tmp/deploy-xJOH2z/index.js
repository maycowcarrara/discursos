var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/google-calendar-sync.ts
var maxCalendarRetryCount = 3;
var calendarRetryDelayMinutes = 30;
function shouldPublishStandaloneCalendarEvent(type) {
  return type === "special";
}
__name(shouldPublishStandaloneCalendarEvent, "shouldPublishStandaloneCalendarEvent");
function resolveGoogleCalendarAssignmentKind({
  destinationIsLocal,
  speakerType
}) {
  if (speakerType === "visitor" && destinationIsLocal === true) {
    return "incomingVisitor";
  }
  if (speakerType === "local" && destinationIsLocal === true) {
    return "localTalk";
  }
  if (speakerType === "local" && destinationIsLocal === false) {
    return "outgoingTalk";
  }
  return null;
}
__name(resolveGoogleCalendarAssignmentKind, "resolveGoogleCalendarAssignmentKind");
function shouldProcessManualCalendarSync({
  hasLatestAssignment,
  hasRemoteEvent,
  hasSyncEntry,
  lastRelevantChangeAt,
  requestedAt
}) {
  if (!hasSyncEntry && !hasRemoteEvent) {
    return false;
  }
  if (!hasSyncEntry && hasRemoteEvent && !hasLatestAssignment) {
    return true;
  }
  return requestedAt >= lastRelevantChangeAt;
}
__name(shouldProcessManualCalendarSync, "shouldProcessManualCalendarSync");
function resolveCalendarRetryDecision(retryCount, now) {
  const nextRetryCount = retryCount + 1;
  const shouldRetry = nextRetryCount < maxCalendarRetryCount;
  return {
    nextRetryCount,
    scheduledFor: shouldRetry ? new Date(now.getTime() + calendarRetryDelayMinutes * 6e4) : null,
    status: shouldRetry ? "pending" : "error"
  };
}
__name(resolveCalendarRetryDecision, "resolveCalendarRetryDecision");
function buildGoogleCalendarEventIdFromDigest(digest) {
  const bytes = new Uint8Array(digest);
  let encoded = "";
  let bitBuffer = 0;
  let bitCount = 0;
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  for (const byte of bytes) {
    bitBuffer = bitBuffer << 8 | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      encoded += alphabet[bitBuffer >> bitCount & 31];
    }
  }
  if (bitCount > 0) {
    encoded += alphabet[bitBuffer << 5 - bitCount & 31];
  }
  return `discursos${encoded.slice(0, 40)}`;
}
__name(buildGoogleCalendarEventIdFromDigest, "buildGoogleCalendarEventIdFromDigest");

// src/index.ts
var firestoreDatabaseId = "(default)";
var firestoreBaseUrl = "https://firestore.googleapis.com/v1";
var emailJsSendUrl = "https://api.emailjs.com/api/v1.0/email/send";
var googleCalendarBaseUrl = "https://www.googleapis.com/calendar/v3";
var googleOauthTokenUrl = "https://oauth2.googleapis.com/token";
var identityToolkitBaseUrl = "https://identitytoolkit.googleapis.com/v1";
var googleDatastoreScope = "https://www.googleapis.com/auth/datastore";
var googleCalendarScope = "https://www.googleapis.com/auth/calendar";
var googleIdentityToolkitScope = "https://www.googleapis.com/auth/identitytoolkit";
var googleWorkerScopes = `${googleDatastoreScope} ${googleCalendarScope} ${googleIdentityToolkitScope}`;
var defaultBatchSize = 10;
var defaultCalendarSyncBatchSize = 10;
var defaultLocale = "pt-BR";
var defaultCalendarZoneId = "America/Sao_Paulo";
var maxRetryCount = 3;
var processingLeaseMinutes = 5;
var retryDelayMinutes = 30;
var notificationTypeLabels = {
  confirmation: "Confirma\xE7\xE3o",
  reminder4d: "Lembrete de 4 dias",
  reminder7d: "Lembrete de 7 dias",
  reminder1d: "Lembrete de 1 dia",
  manual: "Envio manual"
};
var assignmentStatusLabels = {
  pending: "Pendente",
  confirmed: "Confirmado",
  declined: "Recusado",
  cancelled: "Cancelado",
  replaced: "Substitu\xEDdo"
};
var eventTypeLabels = {
  publicTalk: "Discurso p\xFAblico",
  congress: "Congresso",
  assembly: "Assembleia",
  visit: "Visita",
  special: "Evento especial"
};
var googleAccessTokenSession = null;
var index_default = {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: buildCorsHeaders()
      });
    }
    if (requestUrl.pathname === "/api/public/assignment-confirmation") {
      if (request.method === "GET") {
        return handlePublicAssignmentPreview(requestUrl, env);
      }
      if (request.method === "POST") {
        return handlePublicAssignmentConfirmation(request, env);
      }
    }
    if (requestUrl.pathname === "/api/internal/process-notifications") {
      if (!isInternalRequestAuthorized(request, env)) {
        return jsonResponse(
          {
            error: "unauthorized",
            message: "Token interno ausente ou inv\xE1lido."
          },
          401
        );
      }
      const processingPromise = processDueNotifications(env);
      ctx.waitUntil(processingPromise);
      const summary = await processingPromise;
      return jsonResponse(summary);
    }
    if (requestUrl.pathname === "/api/public/admin-access/reconcile" && request.method === "POST") {
      return handleAdminAccessReconcile(request, env);
    }
    if (requestUrl.pathname === "/api/admin/users") {
      if (request.method === "GET") {
        return handleListAdminUsers(request, env);
      }
      if (request.method === "POST") {
        return handleAddAdminUser(request, env);
      }
      if (request.method === "DELETE") {
        return handleRemoveAdminUser(request, env);
      }
    }
    if (requestUrl.pathname === "/api/admin/process-manual-notification" && request.method === "POST") {
      return handleProcessManualNotification(request, env);
    }
    if (requestUrl.pathname === "/api/admin/process-calendar-sync" && request.method === "POST") {
      return handleProcessManualCalendarSync(request, env);
    }
    if (requestUrl.pathname === "/api/internal/process-calendar-sync") {
      if (!isInternalRequestAuthorized(request, env)) {
        return jsonResponse(
          {
            error: "unauthorized",
            message: "Token interno ausente ou inv\xE1lido."
          },
          401
        );
      }
      const processingPromise = processPendingCalendarSync(env);
      ctx.waitUntil(processingPromise);
      const summary = await processingPromise;
      return jsonResponse(summary);
    }
    if (requestUrl.pathname === "/health") {
      return jsonResponse({
        ok: true,
        service: "discursos-email-automation"
      });
    }
    return jsonResponse(
      {
        error: "not_found",
        message: "Rota n\xE3o encontrada."
      },
      404
    );
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(processDueNotifications(env, "reminder4d"));
  }
};
async function handlePublicAssignmentPreview(requestUrl, env) {
  const assignmentId = requestUrl.searchParams.get("assignmentId")?.trim() ?? "";
  const token = requestUrl.searchParams.get("token")?.trim() ?? "";
  if (!assignmentId || !token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: "Este link de confirma\xE7\xE3o est\xE1 incompleto.",
        state: "invalid"
      }),
      400
    );
  }
  const preview = await buildAssignmentPreview(env, assignmentId, token);
  const statusCode = preview.state === "invalid" ? 400 : preview.state === "conflict" ? 409 : 200;
  return jsonResponse(preview, statusCode);
}
__name(handlePublicAssignmentPreview, "handlePublicAssignmentPreview");
async function handlePublicAssignmentConfirmation(request, env) {
  const body = await request.json();
  const assignmentId = body.assignmentId?.trim() ?? "";
  const token = body.token?.trim() ?? "";
  if (!assignmentId || !token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: "Este link de confirma\xE7\xE3o est\xE1 incompleto.",
        state: "invalid"
      }),
      400
    );
  }
  const preview = await buildAssignmentPreview(env, assignmentId, token);
  if (preview.state !== "pending" || !preview.assignment) {
    const statusCode = preview.state === "invalid" ? 400 : preview.state === "conflict" ? 409 : 200;
    return jsonResponse(preview, statusCode);
  }
  const assignmentDocument = await getDocument(env, `assignments/${assignmentId}`);
  if (!assignmentDocument) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: "Este link n\xE3o corresponde mais a uma designa\xE7\xE3o ativa.",
        state: "invalid"
      }),
      400
    );
  }
  const assignment = parseAssignmentDocument(assignmentDocument);
  if (assignment.confirmationToken !== token) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: null,
        message: "Este link n\xE3o corresponde mais a uma designa\xE7\xE3o ativa.",
        state: "invalid"
      }),
      400
    );
  }
  const conflictingAssignment = await findConflictingOperationalAssignment(
    env,
    assignment.calendarEventId,
    assignment.id
  );
  if (conflictingAssignment) {
    return jsonResponse(
      buildPublicConfirmationResponse({
        assignment: mapAssignmentSummary(assignment),
        message: "Este hor\xE1rio j\xE1 foi ocupado por outra designa\xE7\xE3o operacional.",
        state: "conflict"
      }),
      409
    );
  }
  const now = /* @__PURE__ */ new Date();
  const writes = [
    buildUpdateWrite(
      `assignments/${assignment.id}`,
      {
        confirmedAt: toTimestampValue(now),
        responseAt: toTimestampValue(now),
        status: toStringValue("confirmed"),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(resolveWorkerActorUid(env))
      },
      void 0,
      assignment.documentUpdateTime ? {
        exists: true,
        updateTime: assignment.documentUpdateTime
      } : true,
      env
    )
  ];
  const confirmationNotificationDocument = await getDocument(
    env,
    `notifications/${assignment.id}__confirmation`
  );
  if (confirmationNotificationDocument) {
    writes.push(
      buildUpdateWrite(
        `notifications/${assignment.id}__confirmation`,
        {
          errorMessage: toNullValue(),
          status: toStringValue("cancelled"),
          updatedAt: toTimestampValue(now)
        },
        ["errorMessage", "status", "updatedAt"],
        confirmationNotificationDocument.updateTime ? {
          exists: true,
          updateTime: confirmationNotificationDocument.updateTime
        } : true,
        env
      )
    );
  }
  writes.push(
    buildUpdateWrite(
      `auditLogs/${crypto.randomUUID()}`,
      {
        action: toStringValue("statusChange"),
        actorName: toStringValue(resolveWorkerActorName(env)),
        actorUid: toStringValue(resolveWorkerActorUid(env)),
        after: toJsonValue({
          confirmedAt: now.toISOString(),
          responseAt: now.toISOString(),
          status: "confirmed"
        }),
        before: toJsonValue({
          status: assignment.status
        }),
        createdAt: toTimestampValue(now),
        entityId: toStringValue(assignment.id),
        entityType: toStringValue("assignment"),
        metadata: toJsonValue({
          source: "phase-11-worker",
          trigger: "public-confirmation-link"
        })
      },
      void 0,
      false,
      env
    )
  );
  try {
    await commitWrites(env, writes);
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      const updatedPreview = await buildAssignmentPreview(env, assignmentId, token);
      const statusCode = updatedPreview.state === "invalid" ? 400 : updatedPreview.state === "conflict" ? 409 : 200;
      return jsonResponse(updatedPreview, statusCode);
    }
    throw error;
  }
  return jsonResponse(
    buildPublicConfirmationResponse({
      assignment: {
        ...mapAssignmentSummary(assignment),
        status: "confirmed"
      },
      message: "Designa\xE7\xE3o confirmada com sucesso.",
      state: "confirmed"
    })
  );
}
__name(handlePublicAssignmentConfirmation, "handlePublicAssignmentConfirmation");
async function buildAssignmentPreview(env, assignmentId, token) {
  const assignment = await getAssignmentById(env, assignmentId);
  if (!assignment || !assignment.confirmationToken || assignment.confirmationToken !== token) {
    return buildPublicConfirmationResponse({
      assignment: null,
      message: "Este link n\xE3o \xE9 mais v\xE1lido para confirma\xE7\xE3o.",
      state: "invalid"
    });
  }
  if (assignment.status === "confirmed") {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: "Esta designa\xE7\xE3o j\xE1 havia sido confirmada anteriormente.",
      state: "confirmed"
    });
  }
  if (!isOperationalAssignmentStatus(assignment.status)) {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: "Esta designa\xE7\xE3o n\xE3o est\xE1 mais ativa para confirma\xE7\xE3o.",
      state: "inactive"
    });
  }
  const conflictingAssignment = await findConflictingOperationalAssignment(
    env,
    assignment.calendarEventId,
    assignment.id
  );
  if (conflictingAssignment) {
    return buildPublicConfirmationResponse({
      assignment: mapAssignmentSummary(assignment),
      message: "Este hor\xE1rio j\xE1 foi remanejado para outra designa\xE7\xE3o.",
      state: "conflict"
    });
  }
  return buildPublicConfirmationResponse({
    assignment: mapAssignmentSummary(assignment),
    message: "Tudo certo. Voc\xEA pode confirmar esta designa\xE7\xE3o agora.",
    state: "pending"
  });
}
__name(buildAssignmentPreview, "buildAssignmentPreview");
async function processDueNotifications(env, type) {
  const dueNotifications = await listDueNotifications(env, type);
  const summary = {
    cancelled: 0,
    failed: 0,
    processed: 0,
    requeued: 0,
    sent: 0
  };
  for (let index = 0; index < dueNotifications.length; index += 1) {
    const notification = dueNotifications[index];
    if (!notification) {
      continue;
    }
    summary.processed += 1;
    const result = await processSingleNotification(env, notification);
    if (result === "sent") {
      summary.sent += 1;
    } else if (result === "failed") {
      summary.failed += 1;
    } else if (result === "requeued") {
      summary.requeued += 1;
    } else if (result === "skipped") {
      summary.processed -= 1;
    } else {
      summary.cancelled += 1;
    }
    if (index < dueNotifications.length - 1) {
      await sleep(1100);
    }
  }
  return summary;
}
__name(processDueNotifications, "processDueNotifications");
async function processPendingCalendarSync(env) {
  const calendarSettings = await getCalendarSettingsRecord(env);
  const summary = {
    created: 0,
    deleted: 0,
    failed: 0,
    processed: 0,
    updated: 0
  };
  if (!calendarSettings.exists || !calendarSettings.enabled) {
    return summary;
  }
  if (!calendarSettings.calendarId) {
    await writeCalendarSyncRunState(
      env,
      "error",
      "Calendar ID ausente. Revise settings/calendar antes de sincronizar."
    );
    summary.failed = 1;
    return summary;
  }
  await writeCalendarSyncRunState(
    env,
    "running",
    "Processando eventos pendentes do Google Calendar."
  );
  const pendingCalendarEvents = await listPendingCalendarEvents(env);
  const congregationCache = /* @__PURE__ */ new Map();
  const speakerCache = /* @__PURE__ */ new Map();
  for (let index = 0; index < pendingCalendarEvents.length; index += 1) {
    const calendarEvent = pendingCalendarEvents[index];
    if (!calendarEvent) {
      continue;
    }
    const claimedCalendarEvent = await claimCalendarEventForProcessing(
      env,
      calendarEvent
    );
    if (!claimedCalendarEvent) {
      continue;
    }
    summary.processed += 1;
    const result = await processSingleCalendarEventSync(
      env,
      calendarSettings,
      claimedCalendarEvent,
      congregationCache,
      speakerCache
    );
    if (result === "created") {
      summary.created += 1;
    } else if (result === "updated") {
      summary.updated += 1;
    } else if (result === "deleted") {
      summary.deleted += 1;
    } else if (result === "failed") {
      summary.failed += 1;
    } else {
      summary.processed -= 1;
    }
    if (index < pendingCalendarEvents.length - 1) {
      await sleep(350);
    }
  }
  const message = summary.processed === 0 ? "Nenhum evento pendente para sincronizar com o Google Calendar." : `Google Calendar: ${summary.created} criados, ${summary.updated} atualizados, ${summary.deleted} removidos e ${summary.failed} falhas.`;
  await writeCalendarSyncRunState(
    env,
    summary.failed > 0 ? "error" : "success",
    message
  );
  return summary;
}
__name(processPendingCalendarSync, "processPendingCalendarSync");
async function processSingleCalendarEventSync(env, calendarSettings, calendarEvent, congregationCache, speakerCache, options = {}) {
  try {
    const assignments = await listAssignmentsForCalendarEvent(
      env,
      calendarEvent.id
    );
    const assignmentContext = buildCalendarEventAssignmentContext(assignments);
    const syncEntry = await resolveCalendarSyncEntry(
      env,
      calendarSettings,
      calendarEvent,
      assignmentContext.operationalAssignment,
      congregationCache,
      speakerCache
    );
    if (!calendarEvent.isActive) {
      if (calendarEvent.googleCalendarEventId && calendarEvent.googleCalendarCalendarId) {
        await deleteGoogleCalendarEvent(
          env,
          calendarEvent.googleCalendarCalendarId,
          calendarEvent.googleCalendarEventId
        );
        await markCalendarEventSyncSuccess(
          env,
          calendarEvent,
          {
            calendarId: null,
            eventId: null,
            result: "deleted"
          }
        );
        return "deleted";
      }
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: null,
          eventId: null,
          result: "skipped"
        }
      );
      return "skipped";
    }
    if (calendarEvent.type === "publicTalk" && !shouldProcessOperationalCalendarSync(
      calendarSettings,
      calendarEvent,
      assignmentContext,
      syncEntry
    )) {
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarEvent.googleCalendarCalendarId,
          eventId: calendarEvent.googleCalendarEventId,
          result: "skipped"
        }
      );
      return "skipped";
    }
    if (!syncEntry) {
      if (calendarEvent.googleCalendarEventId && calendarEvent.googleCalendarCalendarId) {
        await deleteGoogleCalendarEvent(
          env,
          calendarEvent.googleCalendarCalendarId,
          calendarEvent.googleCalendarEventId
        );
        await markCalendarEventSyncSuccess(
          env,
          calendarEvent,
          {
            calendarId: null,
            eventId: null,
            result: "deleted"
          }
        );
        return "deleted";
      }
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: null,
          eventId: null,
          result: "skipped"
        }
      );
      return "skipped";
    }
    const eventPayload = buildGoogleCalendarEventPayload(
      calendarSettings,
      calendarEvent,
      syncEntry
    );
    if (calendarEvent.googleCalendarEventId && calendarEvent.googleCalendarCalendarId && calendarEvent.googleCalendarCalendarId !== calendarSettings.calendarId) {
      await deleteGoogleCalendarEvent(
        env,
        calendarEvent.googleCalendarCalendarId,
        calendarEvent.googleCalendarEventId
      );
      const createdEventId2 = await createGoogleCalendarEvent(
        env,
        calendarSettings.calendarId,
        await buildDeterministicGoogleCalendarEventId(calendarEvent.id),
        eventPayload
      );
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarSettings.calendarId,
          eventId: createdEventId2,
          result: "created"
        }
      );
      return "created";
    }
    if (calendarEvent.googleCalendarEventId) {
      await updateGoogleCalendarEvent(
        env,
        calendarSettings.calendarId,
        calendarEvent.googleCalendarEventId,
        eventPayload
      );
      await markCalendarEventSyncSuccess(
        env,
        calendarEvent,
        {
          calendarId: calendarSettings.calendarId,
          eventId: calendarEvent.googleCalendarEventId,
          result: "updated"
        }
      );
      return "updated";
    }
    const createdEventId = await createGoogleCalendarEvent(
      env,
      calendarSettings.calendarId,
      await buildDeterministicGoogleCalendarEventId(calendarEvent.id),
      eventPayload
    );
    await markCalendarEventSyncSuccess(
      env,
      calendarEvent,
      {
        calendarId: calendarSettings.calendarId,
        eventId: createdEventId,
        result: "created"
      }
    );
    return "created";
  } catch (error) {
    await markCalendarEventSyncFailure(
      env,
      calendarEvent,
      getErrorMessage(error),
      options.allowRetry ?? true
    );
    return "failed";
  }
}
__name(processSingleCalendarEventSync, "processSingleCalendarEventSync");
async function processSingleNotification(env, notification, options = {}) {
  const wasClaimed = await claimNotificationForProcessing(env, notification);
  if (!wasClaimed) {
    return "skipped";
  }
  if (!notification.assignmentId) {
    await markNotificationCancelled(env, notification, "Notifica\xE7\xE3o sem assignmentId ativo.");
    return "cancelled";
  }
  const assignment = await getAssignmentById(env, notification.assignmentId);
  if (!assignment) {
    await markNotificationFailed(
      env,
      notification,
      "A designa\xE7\xE3o vinculada a esta notifica\xE7\xE3o n\xE3o foi encontrada."
    );
    return "failed";
  }
  const isConfirmationUpdate = notification.type === "confirmation" && notification.subject.startsWith("ATUALIZA\xC7\xC3O - ");
  if (notification.type === "confirmation" && assignment.status !== "pending" && !(isConfirmationUpdate && assignment.status === "confirmed")) {
    await markNotificationCancelled(
      env,
      notification,
      "Confirma\xE7\xE3o autom\xE1tica cancelada porque a designa\xE7\xE3o n\xE3o est\xE1 mais pendente."
    );
    return "cancelled";
  }
  if (notification.type !== "confirmation" && !isOperationalAssignmentStatus(assignment.status)) {
    await markNotificationCancelled(
      env,
      notification,
      "Notifica\xE7\xE3o cancelada porque a designa\xE7\xE3o n\xE3o est\xE1 mais operacional."
    );
    return "cancelled";
  }
  if (notification.type !== "confirmation" && toStartOfDay(assignment.eventDate).getTime() < toStartOfDay(/* @__PURE__ */ new Date()).getTime()) {
    await markNotificationCancelled(
      env,
      notification,
      "Notifica\xE7\xE3o cancelada porque a data do evento j\xE1 passou."
    );
    return "cancelled";
  }
  const emailJsConfigurationError = getEmailJsConfigurationError(env);
  if (emailJsConfigurationError) {
    await markNotificationFailed(env, notification, emailJsConfigurationError);
    return "failed";
  }
  const emailResponse = await sendEmail(env, notification, assignment);
  if (emailResponse.ok) {
    await markNotificationSent(env, notification);
    return "sent";
  }
  if (!(options.allowRetry ?? true) || notification.retryCount + 1 >= maxRetryCount) {
    await markNotificationFailed(env, notification, emailResponse.errorMessage);
    return "failed";
  }
  await requeueNotification(env, notification, emailResponse.errorMessage);
  return "requeued";
}
__name(processSingleNotification, "processSingleNotification");
async function resolveCalendarSyncEntry(env, calendarSettings, calendarEvent, assignment, congregationCache, speakerCache) {
  if (shouldPublishStandaloneCalendarEvent(calendarEvent.type)) {
    const congregation = await resolveCalendarSyncCongregation(
      env,
      calendarEvent.congregationId,
      calendarEvent.congregationName,
      congregationCache
    );
    return {
      assignment: null,
      attendeeEmail: null,
      congregation,
      kind: "specialEvent"
    };
  }
  if (calendarEvent.type !== "publicTalk") {
    return null;
  }
  if (!assignment) {
    return null;
  }
  const speaker = await getSpeakerById(env, assignment.speakerId, speakerCache);
  const attendeeEmail = normalizeEmailValue(speaker?.email ?? null);
  const destinationCongregation = await resolveCalendarSyncCongregation(
    env,
    assignment.localCongregationId,
    assignment.localCongregationName,
    congregationCache
  );
  const assignmentKind = resolveGoogleCalendarAssignmentKind({
    destinationIsLocal: destinationCongregation?.isLocal ?? null,
    speakerType: assignment.speakerType
  });
  if (assignmentKind) {
    return {
      assignment,
      attendeeEmail,
      congregation: destinationCongregation,
      kind: assignmentKind
    };
  }
  return null;
}
__name(resolveCalendarSyncEntry, "resolveCalendarSyncEntry");
function resolveManualSyncRelevantAssignment(syncEntry, assignmentContext) {
  if (syncEntry?.assignment) {
    return syncEntry.assignment;
  }
  return assignmentContext.latestAssignment;
}
__name(resolveManualSyncRelevantAssignment, "resolveManualSyncRelevantAssignment");
function getLatestOperationalSyncRelevantChangeAt(calendarSettings, calendarEvent, assignment) {
  const timestamps = [
    calendarSettings.configurationUpdatedAt?.getTime() ?? 0,
    calendarEvent.updatedAt.getTime(),
    assignment?.updatedAt.getTime() ?? 0
  ];
  return Math.max(...timestamps);
}
__name(getLatestOperationalSyncRelevantChangeAt, "getLatestOperationalSyncRelevantChangeAt");
function shouldProcessOperationalCalendarSync(calendarSettings, calendarEvent, assignmentContext, syncEntry) {
  const hasRemoteEvent = Boolean(
    calendarEvent.googleCalendarEventId && calendarEvent.googleCalendarCalendarId
  );
  const relevantAssignment = resolveManualSyncRelevantAssignment(syncEntry, assignmentContext);
  const requestedAt = calendarEvent.googleCalendarManualSyncRequestedAt?.getTime() ?? 0;
  const lastRelevantChangeAt = getLatestOperationalSyncRelevantChangeAt(
    calendarSettings,
    calendarEvent,
    relevantAssignment
  );
  return shouldProcessManualCalendarSync({
    hasLatestAssignment: Boolean(assignmentContext.latestAssignment),
    hasRemoteEvent,
    hasSyncEntry: Boolean(syncEntry),
    lastRelevantChangeAt,
    requestedAt
  });
}
__name(shouldProcessOperationalCalendarSync, "shouldProcessOperationalCalendarSync");
function buildGoogleCalendarEventPayload(calendarSettings, calendarEvent, syncEntry) {
  const meetingTime = syncEntry.congregation?.meetingTime.trim() || calendarSettings.defaultStartTime;
  const dateRange = buildCalendarDateRange(
    calendarEvent.date,
    meetingTime,
    calendarSettings.defaultDurationMinutes
  );
  const location = buildGoogleCalendarLocation(syncEntry.congregation);
  return {
    attendees: buildGoogleCalendarAttendees(syncEntry),
    description: buildGoogleCalendarDescription(
      calendarSettings,
      calendarEvent,
      syncEntry
    ),
    end: {
      dateTime: dateRange.endDateTime,
      timeZone: defaultCalendarZoneId
    },
    location,
    summary: buildGoogleCalendarSummary(calendarEvent, syncEntry),
    start: {
      dateTime: dateRange.startDateTime,
      timeZone: defaultCalendarZoneId
    }
  };
}
__name(buildGoogleCalendarEventPayload, "buildGoogleCalendarEventPayload");
function buildGoogleCalendarAttendees(syncEntry) {
  if (!syncEntry.attendeeEmail) {
    return [];
  }
  const attendee = {
    email: syncEntry.attendeeEmail
  };
  if (syncEntry.assignment?.speakerName.trim()) {
    attendee.displayName = syncEntry.assignment.speakerName.trim();
  }
  return [attendee];
}
__name(buildGoogleCalendarAttendees, "buildGoogleCalendarAttendees");
function buildGoogleCalendarSummary(calendarEvent, syncEntry) {
  if (syncEntry.kind === "incomingVisitor" && syncEntry.assignment) {
    return `Orador visitante - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`;
  }
  if (syncEntry.kind === "outgoingTalk" && syncEntry.assignment) {
    return `Discurso fora - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`;
  }
  if (syncEntry.kind === "localTalk" && syncEntry.assignment) {
    return `Designa\xE7\xE3o local - Tema ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.speakerName}`;
  }
  return `Evento especial - ${calendarEvent.title}`;
}
__name(buildGoogleCalendarSummary, "buildGoogleCalendarSummary");
function buildGoogleCalendarDescription(calendarSettings, calendarEvent, syncEntry) {
  const meetingTime = syncEntry.congregation?.meetingTime.trim() || calendarSettings.defaultStartTime;
  const organizationName = resolveOrganizationName(calendarEvent, syncEntry);
  const locationName = syncEntry.congregation?.name?.trim() || calendarEvent.congregationName?.trim() || organizationName;
  const lines = [
    `Congrega\xE7\xE3o local: ${organizationName}`,
    `Tipo: ${getCalendarSyncKindLabel(syncEntry.kind)}`,
    `Local: ${locationName}`,
    `Hora da reuni\xE3o: ${meetingTime}`
  ];
  if (syncEntry.congregation) {
    lines.push(`Endere\xE7o: ${buildGoogleCalendarLocation(syncEntry.congregation)}`);
  }
  if (syncEntry.assignment) {
    lines.push(`Status: ${assignmentStatusLabels[syncEntry.assignment.status]}`);
    lines.push(`Orador: ${syncEntry.assignment.speakerName}`);
    lines.push(`Tema: ${syncEntry.assignment.themeNumber} - ${syncEntry.assignment.themeTitle}`);
    lines.push(`Congrega\xE7\xE3o de origem: ${syncEntry.assignment.originCongregationName}`);
    lines.push(`Congrega\xE7\xE3o de destino: ${syncEntry.assignment.localCongregationName}`);
    if (syncEntry.assignment.notes.trim()) {
      lines.push(`Observa\xE7\xF5es: ${syncEntry.assignment.notes.trim()}`);
    }
  }
  if (calendarEvent.description?.trim()) {
    lines.push(`Agenda: ${calendarEvent.description.trim()}`);
  }
  return lines.join("\n");
}
__name(buildGoogleCalendarDescription, "buildGoogleCalendarDescription");
function resolveOrganizationName(calendarEvent, syncEntry) {
  const assignmentOrganizationName = syncEntry.assignment?.localCongregationName.trim();
  if (assignmentOrganizationName) {
    return assignmentOrganizationName;
  }
  const syncCongregationName = syncEntry.congregation?.name.trim();
  if (syncCongregationName) {
    return syncCongregationName;
  }
  const calendarCongregationName = calendarEvent.congregationName?.trim();
  if (calendarCongregationName) {
    return calendarCongregationName;
  }
  return "Congrega\xE7\xE3o local";
}
__name(resolveOrganizationName, "resolveOrganizationName");
function buildGoogleCalendarLocation(congregation) {
  if (!congregation) {
    return null;
  }
  const addressParts = [
    congregation.name.trim(),
    congregation.address.trim(),
    `${congregation.city.trim()}/${congregation.state.trim()}`.trim()
  ].filter(Boolean);
  return addressParts.join(" - ") || congregation.name;
}
__name(buildGoogleCalendarLocation, "buildGoogleCalendarLocation");
function getCalendarSyncKindLabel(kind) {
  if (kind === "incomingVisitor") {
    return "Orador visitante";
  }
  if (kind === "outgoingTalk") {
    return "Discurso fora";
  }
  if (kind === "localTalk") {
    return "Designa\xE7\xE3o local";
  }
  return "Evento especial";
}
__name(getCalendarSyncKindLabel, "getCalendarSyncKindLabel");
function buildCalendarDateRange(eventDate, startTime, durationMinutes) {
  const [hourValue, minuteValue] = startTime.split(":");
  const hours = Number.parseInt(hourValue ?? "", 10);
  const minutes = Number.parseInt(minuteValue ?? "", 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Hor\xE1rio padr\xE3o inv\xE1lido em settings/calendar.");
  }
  const totalStartMinutes = hours * 60 + minutes;
  const totalEndMinutes = totalStartMinutes + durationMinutes;
  return {
    endDateTime: buildLocalDateTimeString(eventDate, totalEndMinutes),
    startDateTime: buildLocalDateTimeString(eventDate, totalStartMinutes)
  };
}
__name(buildCalendarDateRange, "buildCalendarDateRange");
function buildLocalDateTimeString(date, totalMinutes) {
  const extraDays = Math.floor(totalMinutes / (24 * 60));
  const normalizedMinutes = (totalMinutes % (24 * 60) + 24 * 60) % (24 * 60);
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + extraDays,
    12,
    0,
    0,
    0
  );
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const datePart = [
    String(targetDate.getFullYear()),
    String(targetDate.getMonth() + 1).padStart(2, "0"),
    String(targetDate.getDate()).padStart(2, "0")
  ].join("-");
  return `${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}
__name(buildLocalDateTimeString, "buildLocalDateTimeString");
async function createGoogleCalendarEvent(env, calendarId, eventId, payload) {
  const response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: await buildGoogleApiHeaders(env),
      body: JSON.stringify({
        ...payload,
        id: eventId
      })
    }
  );
  if (response.status === 409) {
    await updateGoogleCalendarEvent(env, calendarId, eventId, payload);
    return eventId;
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao criar evento no Google Calendar: ${errorText}`);
  }
  const responsePayload = await response.json();
  if (!responsePayload.id) {
    throw new Error("Google Calendar n\xE3o retornou o id do evento criado.");
  }
  return responsePayload.id;
}
__name(createGoogleCalendarEvent, "createGoogleCalendarEvent");
async function buildDeterministicGoogleCalendarEventId(calendarEventId) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(calendarEventId)
  );
  return buildGoogleCalendarEventIdFromDigest(digest);
}
__name(buildDeterministicGoogleCalendarEventId, "buildDeterministicGoogleCalendarEventId");
async function updateGoogleCalendarEvent(env, calendarId, eventId, payload) {
  const response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: await buildGoogleApiHeaders(env),
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao atualizar evento no Google Calendar: ${errorText}`);
  }
}
__name(updateGoogleCalendarEvent, "updateGoogleCalendarEvent");
async function deleteGoogleCalendarEvent(env, calendarId, eventId) {
  const response = await fetch(
    `${googleCalendarBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: await buildGoogleApiHeaders(env)
    }
  );
  if (response.status === 404) {
    return;
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao excluir evento no Google Calendar: ${errorText}`);
  }
}
__name(deleteGoogleCalendarEvent, "deleteGoogleCalendarEvent");
async function sendEmail(env, notification, assignment) {
  const emailJsConfigurationError = getEmailJsConfigurationError(env);
  if (emailJsConfigurationError) {
    return {
      errorMessage: emailJsConfigurationError,
      ok: false
    };
  }
  const confirmationUrl = buildConfirmationUrl(env, assignment);
  const organizationName = assignment.localCongregationName.trim() || "Congrega\xE7\xE3o local";
  const response = await fetch(emailJsSendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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
        reply_to: "",
        speaker_name: assignment.speakerName,
        status_label: assignmentStatusLabels[assignment.status],
        theme_number: String(assignment.themeNumber),
        theme_title: assignment.themeTitle,
        to_email: notification.recipientEmail
      },
      user_id: env.EMAILJS_PUBLIC_KEY
    })
  });
  if (response.ok) {
    return {
      ok: true
    };
  }
  const responseText = await response.text();
  return {
    errorMessage: responseText || "Falha ao enviar e-mail pelo EmailJS.",
    ok: false
  };
}
__name(sendEmail, "sendEmail");
async function claimNotificationForProcessing(env, notification) {
  const now = /* @__PURE__ */ new Date();
  const leaseUntil = new Date(now.getTime() + processingLeaseMinutes * 6e4);
  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `notifications/${notification.id}`,
        {
          scheduledFor: toTimestampValue(leaseUntil),
          updatedAt: toTimestampValue(now)
        },
        void 0,
        notification.documentUpdateTime ? {
          exists: true,
          updateTime: notification.documentUpdateTime
        } : true,
        env
      )
    ]);
    return true;
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      return false;
    }
    throw error;
  }
}
__name(claimNotificationForProcessing, "claimNotificationForProcessing");
async function listDueNotifications(env, type) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const filters = [
    buildFieldFilter("status", "EQUAL", toStringValue("pending")),
    buildFieldFilter("scheduledFor", "LESS_THAN_OR_EQUAL", toTimestampValue(new Date(nowIso)))
  ];
  if (type) {
    filters.push(buildFieldFilter("type", "EQUAL", toStringValue(type)));
  }
  const rows = await runQuery(env, {
    from: [
      {
        collectionId: "notifications"
      }
    ],
    limit: resolveNotificationBatchSize(env),
    orderBy: [
      {
        direction: "ASCENDING",
        field: {
          fieldPath: "scheduledFor"
        }
      }
    ],
    where: {
      compositeFilter: {
        filters,
        op: "AND"
      }
    }
  });
  return rows.map((row) => row.document).filter((document) => Boolean(document)).map(parseNotificationDocument);
}
__name(listDueNotifications, "listDueNotifications");
function getEmailJsConfigurationError(env) {
  const missingCredentials = [
    ["EMAILJS_PRIVATE_KEY", env.EMAILJS_PRIVATE_KEY],
    ["EMAILJS_PUBLIC_KEY", env.EMAILJS_PUBLIC_KEY],
    ["EMAILJS_SERVICE_ID", env.EMAILJS_SERVICE_ID],
    ["EMAILJS_TEMPLATE_ID", env.EMAILJS_TEMPLATE_ID]
  ].filter(([, value]) => !value?.trim()).map(([name]) => name);
  if (missingCredentials.length === 0) {
    return null;
  }
  return `Credenciais do EmailJS n\xE3o configuradas: ${missingCredentials.join(", ")}.`;
}
__name(getEmailJsConfigurationError, "getEmailJsConfigurationError");
async function listPendingCalendarEvents(env) {
  const now = /* @__PURE__ */ new Date();
  const batchSize = resolveCalendarSyncBatchSize(env);
  const [scheduledRows, compatibilityRows] = await Promise.all([
    runQuery(env, {
      from: [
        {
          collectionId: "calendarEvents"
        }
      ],
      limit: batchSize,
      orderBy: [
        {
          direction: "ASCENDING",
          field: {
            fieldPath: "googleCalendarSyncScheduledFor"
          }
        }
      ],
      where: {
        compositeFilter: {
          filters: [
            buildFieldFilter(
              "googleCalendarSyncStatus",
              "EQUAL",
              toStringValue("pending")
            ),
            buildFieldFilter(
              "googleCalendarSyncScheduledFor",
              "LESS_THAN_OR_EQUAL",
              toTimestampValue(now)
            )
          ],
          op: "AND"
        }
      }
    }),
    runQuery(env, {
      from: [
        {
          collectionId: "calendarEvents"
        }
      ],
      limit: batchSize * 3,
      orderBy: [
        {
          direction: "ASCENDING",
          field: {
            fieldPath: "date"
          }
        }
      ],
      where: buildFieldFilter(
        "googleCalendarSyncStatus",
        "EQUAL",
        toStringValue("pending")
      )
    })
  ]);
  const documentsByName = /* @__PURE__ */ new Map();
  for (const row of [...scheduledRows, ...compatibilityRows]) {
    if (row.document) {
      documentsByName.set(row.document.name, row.document);
    }
  }
  return [...documentsByName.values()].map(parseCalendarEventDocument).filter(
    (calendarEvent) => !calendarEvent.googleCalendarSyncScheduledFor || calendarEvent.googleCalendarSyncScheduledFor.getTime() <= now.getTime()
  ).slice(0, batchSize);
}
__name(listPendingCalendarEvents, "listPendingCalendarEvents");
async function claimCalendarEventForProcessing(env, calendarEvent) {
  const now = /* @__PURE__ */ new Date();
  const claimedAt = calendarEvent.googleCalendarClaimedAt?.getTime() ?? 0;
  const leaseStartedAfter = now.getTime() - processingLeaseMinutes * 6e4;
  if (claimedAt > leaseStartedAfter) {
    return null;
  }
  const claimId = crypto.randomUUID();
  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `calendarEvents/${calendarEvent.id}`,
        {
          googleCalendarClaimedAt: toTimestampValue(now),
          googleCalendarClaimId: toStringValue(claimId)
        },
        void 0,
        calendarEvent.documentUpdateTime ? {
          exists: true,
          updateTime: calendarEvent.documentUpdateTime
        } : true,
        env
      )
    ]);
  } catch (error) {
    if (isFirestorePreconditionError(error)) {
      return null;
    }
    throw error;
  }
  const claimedDocument = await getDocument(env, `calendarEvents/${calendarEvent.id}`);
  if (!claimedDocument) {
    return null;
  }
  const claimedCalendarEvent = parseCalendarEventDocument(claimedDocument);
  return claimedCalendarEvent.googleCalendarClaimId === claimId ? claimedCalendarEvent : null;
}
__name(claimCalendarEventForProcessing, "claimCalendarEventForProcessing");
async function findConflictingOperationalAssignment(env, calendarEventId, excludeAssignmentId) {
  const rows = await runQuery(env, {
    from: [
      {
        collectionId: "assignments"
      }
    ],
    limit: 10,
    where: buildFieldFilter("calendarEventId", "EQUAL", toStringValue(calendarEventId))
  });
  return rows.map((row) => row.document).filter((document) => Boolean(document)).map(parseAssignmentDocument).find(
    (assignment) => assignment.id !== excludeAssignmentId && isOperationalAssignmentStatus(assignment.status)
  ) ?? null;
}
__name(findConflictingOperationalAssignment, "findConflictingOperationalAssignment");
async function listAssignmentsForCalendarEvent(env, calendarEventId) {
  const rows = await runQuery(env, {
    from: [
      {
        collectionId: "assignments"
      }
    ],
    limit: 50,
    where: buildFieldFilter(
      "calendarEventId",
      "EQUAL",
      toStringValue(calendarEventId)
    )
  });
  return rows.map((row) => row.document).filter((document) => Boolean(document)).map(parseAssignmentDocument);
}
__name(listAssignmentsForCalendarEvent, "listAssignmentsForCalendarEvent");
function sortAssignmentsByMostRecent(assignments) {
  return [...assignments].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}
__name(sortAssignmentsByMostRecent, "sortAssignmentsByMostRecent");
function buildCalendarEventAssignmentContext(assignments) {
  const sortedAssignments = sortAssignmentsByMostRecent(assignments);
  const operationalAssignment = sortedAssignments.find((assignment) => isOperationalAssignmentStatus(assignment.status)) ?? null;
  return {
    latestAssignment: sortedAssignments[0] ?? null,
    operationalAssignment
  };
}
__name(buildCalendarEventAssignmentContext, "buildCalendarEventAssignmentContext");
async function getAssignmentById(env, assignmentId) {
  const document = await getDocument(env, `assignments/${assignmentId}`);
  if (!document) {
    return null;
  }
  return parseAssignmentDocument(document);
}
__name(getAssignmentById, "getAssignmentById");
async function getCongregationById(env, congregationId) {
  const document = await getDocument(env, `congregations/${congregationId}`);
  if (!document) {
    return null;
  }
  return parseCongregationDocument(document);
}
__name(getCongregationById, "getCongregationById");
async function resolveCalendarSyncCongregation(env, congregationId, congregationName, congregationCache) {
  const normalizedCongregationId = congregationId?.trim() ?? "";
  if (normalizedCongregationId) {
    if (congregationCache.has(normalizedCongregationId)) {
      return congregationCache.get(normalizedCongregationId) ?? null;
    }
    const congregation = await getCongregationById(env, normalizedCongregationId);
    congregationCache.set(normalizedCongregationId, congregation);
    return congregation;
  }
  if (!congregationName?.trim()) {
    return null;
  }
  return {
    address: "",
    city: "",
    id: "",
    isLocal: true,
    meetingTime: "",
    name: congregationName.trim(),
    state: ""
  };
}
__name(resolveCalendarSyncCongregation, "resolveCalendarSyncCongregation");
async function getCalendarSettingsRecord(env) {
  const document = await getDocument(env, "settings/calendar");
  if (!document) {
    return {
      calendarId: "",
      configurationUpdatedAt: null,
      defaultDurationMinutes: 90,
      defaultStartTime: "19:30",
      enabled: false,
      exists: false,
      lastSyncMessage: null,
      lastSyncStatus: "idle"
    };
  }
  return {
    calendarId: getStringField(document, "calendarId") ?? "",
    configurationUpdatedAt: getTimestampField(document, "configurationUpdatedAt") ?? getTimestampField(document, "updatedAt"),
    defaultDurationMinutes: getIntegerField(document, "defaultDurationMinutes") ?? 90,
    defaultStartTime: getStringField(document, "defaultStartTime") ?? "19:30",
    enabled: getBooleanField(document, "enabled") ?? false,
    exists: true,
    lastSyncMessage: getNullableStringField(document, "lastSyncMessage"),
    lastSyncStatus: getStringField(document, "lastSyncStatus") ?? "idle"
  };
}
__name(getCalendarSettingsRecord, "getCalendarSettingsRecord");
async function writeCalendarSyncRunState(env, status, message) {
  const now = /* @__PURE__ */ new Date();
  await commitWrites(env, [
    buildUpdateWrite(
      "settings/calendar",
      {
        lastSyncAt: toTimestampValue(now),
        lastSyncMessage: toStringValue(message),
        lastSyncStatus: toStringValue(status),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(resolveWorkerActorUid(env))
      },
      void 0,
      {},
      env
    )
  ]);
}
__name(writeCalendarSyncRunState, "writeCalendarSyncRunState");
async function markCalendarEventSyncSuccess(env, calendarEvent, result) {
  const now = /* @__PURE__ */ new Date();
  await commitWrites(env, [
    buildUpdateWrite(
      `calendarEvents/${calendarEvent.id}`,
      {
        googleCalendarCalendarId: result.calendarId ? toStringValue(result.calendarId) : toNullValue(),
        googleCalendarEventId: result.eventId ? toStringValue(result.eventId) : toNullValue(),
        googleCalendarClaimedAt: toNullValue(),
        googleCalendarClaimId: toNullValue(),
        googleCalendarRetryCount: toIntegerValue(0),
        googleCalendarSyncError: toNullValue(),
        googleCalendarSyncScheduledFor: toNullValue(),
        googleCalendarSyncStatus: toStringValue("synced"),
        googleCalendarSyncUpdatedAt: toTimestampValue(now)
      },
      void 0,
      calendarEvent.documentUpdateTime ? {
        exists: true,
        updateTime: calendarEvent.documentUpdateTime
      } : true,
      env
    ),
    buildCalendarEventSyncAuditWrite(env, calendarEvent.id, result.result, now, {
      googleCalendarCalendarId: result.calendarId,
      googleCalendarEventId: result.eventId,
      previousGoogleCalendarCalendarId: calendarEvent.googleCalendarCalendarId,
      previousGoogleCalendarEventId: calendarEvent.googleCalendarEventId
    })
  ]);
}
__name(markCalendarEventSyncSuccess, "markCalendarEventSyncSuccess");
async function markCalendarEventSyncFailure(env, calendarEvent, reason, allowRetry = true) {
  const now = /* @__PURE__ */ new Date();
  const retryDecision = allowRetry ? resolveCalendarRetryDecision(calendarEvent.googleCalendarRetryCount, now) : {
    nextRetryCount: calendarEvent.googleCalendarRetryCount + 1,
    scheduledFor: null,
    status: "error"
  };
  try {
    await commitWrites(env, [
      buildUpdateWrite(
        `calendarEvents/${calendarEvent.id}`,
        {
          googleCalendarClaimedAt: toNullValue(),
          googleCalendarClaimId: toNullValue(),
          googleCalendarRetryCount: toIntegerValue(retryDecision.nextRetryCount),
          googleCalendarSyncError: toStringValue(reason),
          googleCalendarSyncScheduledFor: retryDecision.scheduledFor ? toTimestampValue(retryDecision.scheduledFor) : toNullValue(),
          googleCalendarSyncStatus: toStringValue(retryDecision.status),
          googleCalendarSyncUpdatedAt: toTimestampValue(now)
        },
        void 0,
        calendarEvent.documentUpdateTime ? {
          exists: true,
          updateTime: calendarEvent.documentUpdateTime
        } : true,
        env
      ),
      buildCalendarEventSyncAuditWrite(
        env,
        calendarEvent.id,
        retryDecision.status === "pending" ? "requeued" : "failed",
        now,
        {
          reason,
          googleCalendarCalendarId: calendarEvent.googleCalendarCalendarId,
          googleCalendarEventId: calendarEvent.googleCalendarEventId,
          googleCalendarRetryCount: retryDecision.nextRetryCount
        }
      )
    ]);
  } catch (error) {
    if (!isFirestorePreconditionError(error)) {
      throw error;
    }
  }
}
__name(markCalendarEventSyncFailure, "markCalendarEventSyncFailure");
function buildCalendarEventSyncAuditWrite(env, calendarEventId, result, now, metadata) {
  return buildUpdateWrite(
    `auditLogs/${crypto.randomUUID()}`,
    {
      action: toStringValue("sync"),
      actorName: toStringValue(resolveWorkerActorName(env)),
      actorUid: toStringValue(resolveWorkerActorUid(env)),
      after: toJsonValue({
        result
      }),
      before: toNullValue(),
      createdAt: toTimestampValue(now),
      entityId: toStringValue(calendarEventId),
      entityType: toStringValue("calendarEvent"),
      metadata: toJsonValue({
        source: "phase-12-worker",
        ...metadata
      })
    },
    void 0,
    false,
    env
  );
}
__name(buildCalendarEventSyncAuditWrite, "buildCalendarEventSyncAuditWrite");
async function markNotificationSent(env, notification) {
  const now = /* @__PURE__ */ new Date();
  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toNullValue(),
      retryCount: toIntegerValue(notification.retryCount),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toTimestampValue(now),
      status: toStringValue("sent"),
      updatedAt: toTimestampValue(now)
    }, void 0, true, env),
    buildNotificationAuditWrite(env, notification.id, "sent", now, {
      type: notification.type
    })
  ]);
}
__name(markNotificationSent, "markNotificationSent");
async function markNotificationCancelled(env, notification, reason) {
  const now = /* @__PURE__ */ new Date();
  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toNullValue(),
      status: toStringValue("cancelled"),
      updatedAt: toTimestampValue(now)
    }, void 0, true, env),
    buildNotificationAuditWrite(env, notification.id, "cancelled", now, {
      reason,
      type: notification.type
    })
  ]);
}
__name(markNotificationCancelled, "markNotificationCancelled");
async function requeueNotification(env, notification, reason) {
  const now = /* @__PURE__ */ new Date();
  const nextAttemptAt = new Date(now.getTime() + retryDelayMinutes * 6e4);
  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      retryCount: toIntegerValue(notification.retryCount + 1),
      scheduledFor: toTimestampValue(nextAttemptAt),
      sentAt: toNullValue(),
      status: toStringValue("pending"),
      updatedAt: toTimestampValue(now)
    }, void 0, true, env),
    buildNotificationAuditWrite(env, notification.id, "requeued", now, {
      nextAttemptAt: nextAttemptAt.toISOString(),
      reason,
      retryCount: notification.retryCount + 1,
      type: notification.type
    })
  ]);
}
__name(requeueNotification, "requeueNotification");
async function markNotificationFailed(env, notification, reason) {
  const now = /* @__PURE__ */ new Date();
  await commitWrites(env, [
    buildUpdateWrite(`notifications/${notification.id}`, {
      errorMessage: toStringValue(reason),
      retryCount: toIntegerValue(notification.retryCount + 1),
      scheduledFor: toTimestampValue(notification.scheduledFor),
      sentAt: toNullValue(),
      status: toStringValue("failed"),
      updatedAt: toTimestampValue(now)
    }, void 0, true, env),
    buildNotificationAuditWrite(env, notification.id, "failed", now, {
      reason,
      retryCount: notification.retryCount + 1,
      type: notification.type
    })
  ]);
}
__name(markNotificationFailed, "markNotificationFailed");
function buildNotificationAuditWrite(env, notificationId, action, now, metadata) {
  return buildUpdateWrite(
    `auditLogs/${crypto.randomUUID()}`,
    {
      action: toStringValue("statusChange"),
      actorName: toStringValue(resolveWorkerActorName(env)),
      actorUid: toStringValue(resolveWorkerActorUid(env)),
      after: toJsonValue({
        action
      }),
      before: toNullValue(),
      createdAt: toTimestampValue(now),
      entityId: toStringValue(notificationId),
      entityType: toStringValue("notification"),
      metadata: toJsonValue({
        source: "phase-11-worker",
        ...metadata
      })
    },
    void 0,
    false,
    env
  );
}
__name(buildNotificationAuditWrite, "buildNotificationAuditWrite");
function buildPublicConfirmationResponse(input) {
  return input;
}
__name(buildPublicConfirmationResponse, "buildPublicConfirmationResponse");
function mapAssignmentSummary(assignment) {
  return {
    assignmentId: assignment.id,
    eventDateLabel: formatEventDateLabel(
      assignment.eventDate,
      "pt-BR"
    ),
    localCongregationName: assignment.localCongregationName,
    originCongregationName: assignment.originCongregationName,
    speakerName: assignment.speakerName,
    status: assignment.status,
    themeNumber: assignment.themeNumber,
    themeTitle: assignment.themeTitle
  };
}
__name(mapAssignmentSummary, "mapAssignmentSummary");
function parseAssignmentDocument(document) {
  return {
    calendarEventId: getRequiredStringField(document, "calendarEventId"),
    confirmationToken: getNullableStringField(document, "confirmationToken"),
    documentUpdateTime: document.updateTime ?? null,
    eventDate: getRequiredTimestampField(document, "eventDate"),
    eventType: getRequiredStringField(document, "eventType"),
    id: getDocumentId(document.name),
    localCongregationId: getRequiredStringField(document, "localCongregationId"),
    localCongregationName: getRequiredStringField(document, "localCongregationName"),
    notes: getStringField(document, "notes") ?? "",
    originCongregationId: getRequiredStringField(document, "originCongregationId"),
    originCongregationName: getRequiredStringField(document, "originCongregationName"),
    speakerId: getRequiredStringField(document, "speakerId"),
    speakerName: getRequiredStringField(document, "speakerName"),
    speakerType: getRequiredStringField(document, "speakerType"),
    status: getRequiredStringField(document, "status"),
    themeNumber: getRequiredIntegerField(document, "themeNumber"),
    themeTitle: getRequiredStringField(document, "themeTitle"),
    updatedAt: getRequiredTimestampField(document, "updatedAt")
  };
}
__name(parseAssignmentDocument, "parseAssignmentDocument");
function parseNotificationDocument(document) {
  return {
    assignmentId: getNullableStringField(document, "assignmentId"),
    documentUpdateTime: document.updateTime ?? null,
    id: getDocumentId(document.name),
    recipientEmail: getStringField(document, "recipientEmail") ?? "",
    retryCount: getRequiredIntegerField(document, "retryCount"),
    scheduledFor: getRequiredTimestampField(document, "scheduledFor"),
    status: getRequiredStringField(document, "status"),
    subject: getStringField(document, "subject") ?? "",
    type: getRequiredStringField(document, "type")
  };
}
__name(parseNotificationDocument, "parseNotificationDocument");
function parseCalendarEventDocument(document) {
  return {
    congregationId: getNullableStringField(document, "congregationId"),
    congregationName: getNullableStringField(document, "congregationName"),
    date: getRequiredTimestampField(document, "date"),
    description: getNullableStringField(document, "description"),
    documentUpdateTime: document.updateTime ?? null,
    googleCalendarCalendarId: getNullableStringField(
      document,
      "googleCalendarCalendarId"
    ),
    googleCalendarClaimedAt: getTimestampField(document, "googleCalendarClaimedAt"),
    googleCalendarClaimId: getNullableStringField(document, "googleCalendarClaimId"),
    googleCalendarEventId: getNullableStringField(document, "googleCalendarEventId"),
    googleCalendarManualSyncRequestedAt: getTimestampField(
      document,
      "googleCalendarManualSyncRequestedAt"
    ),
    googleCalendarSyncError: getNullableStringField(
      document,
      "googleCalendarSyncError"
    ),
    googleCalendarRetryCount: getIntegerField(document, "googleCalendarRetryCount") ?? 0,
    googleCalendarSyncScheduledFor: getTimestampField(
      document,
      "googleCalendarSyncScheduledFor"
    ),
    googleCalendarSyncStatus: getStringField(document, "googleCalendarSyncStatus") ?? "pending",
    id: getDocumentId(document.name),
    isActive: getRequiredBooleanField(document, "isActive"),
    title: getRequiredStringField(document, "title"),
    type: getRequiredStringField(document, "type"),
    updatedAt: getRequiredTimestampField(document, "updatedAt")
  };
}
__name(parseCalendarEventDocument, "parseCalendarEventDocument");
function parseCongregationDocument(document) {
  return {
    address: getStringField(document, "address") ?? "",
    city: getStringField(document, "city") ?? "",
    id: getDocumentId(document.name),
    isLocal: getRequiredBooleanField(document, "isLocal"),
    meetingTime: getStringField(document, "meetingTime") ?? "",
    name: getRequiredStringField(document, "name"),
    state: getStringField(document, "state") ?? ""
  };
}
__name(parseCongregationDocument, "parseCongregationDocument");
function parseSpeakerDocument(document) {
  return {
    email: getStringField(document, "email") ?? "",
    id: getDocumentId(document.name),
    name: getRequiredStringField(document, "name")
  };
}
__name(parseSpeakerDocument, "parseSpeakerDocument");
async function getSpeakerById(env, speakerId, speakerCache) {
  if (speakerCache.has(speakerId)) {
    return speakerCache.get(speakerId) ?? null;
  }
  const speakerDocument = await getDocument(env, `speakers/${speakerId}`);
  const speaker = speakerDocument ? parseSpeakerDocument(speakerDocument) : null;
  speakerCache.set(speakerId, speaker);
  return speaker;
}
__name(getSpeakerById, "getSpeakerById");
function normalizeEmailValue(email) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  return normalizedEmail ? normalizedEmail : null;
}
__name(normalizeEmailValue, "normalizeEmailValue");
async function handleAdminAccessReconcile(request, env) {
  const caller = await getFirebaseUserFromRequest(request, env);
  const callerEmail = normalizeEmailValue(caller?.email ?? null);
  if (!caller || !callerEmail) {
    return jsonResponse(
      {
        authorized: false,
        message: "Sessao Google invalida."
      },
      401
    );
  }
  const settings = await getAdminAccessSettingsRecord(env);
  if (!settings.adminEmails.includes(callerEmail)) {
    return jsonResponse(
      {
        authorized: false,
        message: "Este e-mail n\xE3o possui acesso administrativo."
      },
      403
    );
  }
  const tokenRefreshRequired = !hasFirebaseAdminClaim(caller);
  if (tokenRefreshRequired) {
    await setFirebaseAdminClaim(env, caller, true);
  }
  return jsonResponse({
    authorized: true,
    email: callerEmail,
    tokenRefreshRequired
  });
}
__name(handleAdminAccessReconcile, "handleAdminAccessReconcile");
async function handleListAdminUsers(request, env) {
  const caller = await getAuthorizedAdminCaller(request, env);
  if (!caller) {
    return buildUnauthorizedAdminResponse();
  }
  return jsonResponse(await buildAdminUsersResponse(env));
}
__name(handleListAdminUsers, "handleListAdminUsers");
async function handleProcessManualNotification(request, env) {
  const caller = await getAuthorizedAdminCaller(request, env);
  if (!caller) {
    return buildUnauthorizedAdminResponse();
  }
  const notificationId = await readNotificationIdFromRequest(request);
  if (!notificationId) {
    return jsonResponse(
      {
        error: "invalid_notification",
        message: "A notifica\xE7\xE3o informada \xE9 inv\xE1lida."
      },
      400
    );
  }
  const notificationDocument = await getDocument(env, `notifications/${notificationId}`);
  if (!notificationDocument) {
    return jsonResponse(
      {
        error: "notification_not_found",
        message: "A notifica\xE7\xE3o de e-mail n\xE3o foi encontrada."
      },
      404
    );
  }
  const notification = parseNotificationDocument(notificationDocument);
  if (notification.type !== "manual") {
    return jsonResponse(
      {
        error: "invalid_notification_type",
        message: "Este endpoint processa apenas envios manuais."
      },
      400
    );
  }
  if (notification.status === "sent") {
    return jsonResponse({ result: "sent" });
  }
  if (notification.status !== "pending") {
    return jsonResponse(
      {
        error: "notification_not_pending",
        message: "Este e-mail n\xE3o est\xE1 dispon\xEDvel para processamento."
      },
      409
    );
  }
  const result = await processSingleNotification(env, notification, {
    allowRetry: false
  });
  if (result === "sent") {
    return jsonResponse({ result });
  }
  const updatedDocument = await getDocument(env, `notifications/${notificationId}`);
  const errorMessage = updatedDocument ? getNullableStringField(updatedDocument, "errorMessage") : null;
  if (result === "requeued") {
    return jsonResponse({
      message: errorMessage ?? "O provedor n\xE3o concluiu o envio. Uma nova tentativa foi agendada.",
      result
    }, 202);
  }
  return jsonResponse(
    {
      error: `notification_${result}`,
      message: errorMessage ?? (result === "cancelled" ? "O envio foi cancelado porque a designa\xE7\xE3o n\xE3o est\xE1 mais dispon\xEDvel." : result === "skipped" ? "O e-mail j\xE1 est\xE1 sendo processado." : "N\xE3o foi poss\xEDvel enviar o e-mail de confirma\xE7\xE3o."),
      result
    },
    result === "failed" ? 422 : 409
  );
}
__name(handleProcessManualNotification, "handleProcessManualNotification");
async function handleProcessManualCalendarSync(request, env) {
  const caller = await getAuthorizedAdminCaller(request, env);
  if (!caller) {
    return buildUnauthorizedAdminResponse();
  }
  const calendarEventId = await readCalendarEventIdFromRequest(request);
  if (!calendarEventId) {
    return jsonResponse(
      {
        error: "invalid_calendar_event",
        message: "O evento informado para sincroniza\xE7\xE3o \xE9 inv\xE1lido."
      },
      400
    );
  }
  const calendarEventDocument = await getDocument(
    env,
    `calendarEvents/${calendarEventId}`
  );
  if (!calendarEventDocument) {
    return jsonResponse(
      {
        error: "calendar_event_not_found",
        message: "O evento informado n\xE3o foi encontrado."
      },
      404
    );
  }
  const calendarEvent = parseCalendarEventDocument(calendarEventDocument);
  const calendarSettings = await getCalendarSettingsRecord(env);
  const configurationError = !calendarSettings.exists || !calendarSettings.enabled ? "Ative a integra\xE7\xE3o com Google Calendar nas configura\xE7\xF5es antes de sincronizar." : !calendarSettings.calendarId ? "Calendar ID ausente. Revise as configura\xE7\xF5es antes de sincronizar." : null;
  if (configurationError) {
    await markCalendarEventSyncFailure(
      env,
      calendarEvent,
      configurationError,
      false
    );
    return jsonResponse(
      {
        error: "calendar_configuration_error",
        message: configurationError
      },
      422
    );
  }
  const claimedCalendarEvent = await claimCalendarEventForProcessing(
    env,
    calendarEvent
  );
  if (!claimedCalendarEvent) {
    return jsonResponse(
      {
        error: "calendar_sync_in_progress",
        message: "Este evento j\xE1 est\xE1 sendo sincronizado. Aguarde a conclus\xE3o."
      },
      409
    );
  }
  const result = await processSingleCalendarEventSync(
    env,
    calendarSettings,
    claimedCalendarEvent,
    /* @__PURE__ */ new Map(),
    /* @__PURE__ */ new Map(),
    { allowRetry: false }
  );
  if (result === "failed") {
    const updatedDocument = await getDocument(
      env,
      `calendarEvents/${calendarEventId}`
    );
    const errorMessage = updatedDocument ? getNullableStringField(updatedDocument, "googleCalendarSyncError") : null;
    return jsonResponse(
      {
        error: "calendar_sync_failed",
        message: errorMessage ?? "N\xE3o foi poss\xEDvel sincronizar a agenda."
      },
      422
    );
  }
  return jsonResponse({ result });
}
__name(handleProcessManualCalendarSync, "handleProcessManualCalendarSync");
async function handleAddAdminUser(request, env) {
  const caller = await getAuthorizedAdminCaller(request, env);
  if (!caller) {
    return buildUnauthorizedAdminResponse();
  }
  const callerEmail = normalizeEmailValue(caller.email ?? null);
  const email = await readAdminEmailFromRequest(request);
  if (!callerEmail || !email) {
    return jsonResponse(
      {
        error: "invalid_email",
        message: "Informe um e-mail valido."
      },
      400
    );
  }
  const settings = await getAdminAccessSettingsRecord(env);
  if (!settings.adminEmails.includes(email)) {
    await saveAdminAccessSettings(env, settings, {
      action: "add",
      actorEmail: callerEmail,
      adminEmails: [...settings.adminEmails, email].sort(),
      targetEmail: email
    });
  }
  return jsonResponse(await buildAdminUsersResponse(env));
}
__name(handleAddAdminUser, "handleAddAdminUser");
async function handleRemoveAdminUser(request, env) {
  const caller = await getAuthorizedAdminCaller(request, env);
  if (!caller) {
    return buildUnauthorizedAdminResponse();
  }
  const callerEmail = normalizeEmailValue(caller.email ?? null);
  const email = await readAdminEmailFromRequest(request);
  if (!callerEmail || !email) {
    return jsonResponse(
      {
        error: "invalid_email",
        message: "Informe um e-mail valido."
      },
      400
    );
  }
  if (callerEmail === email) {
    return jsonResponse(
      {
        error: "self_removal_not_allowed",
        message: "Voc\xEA n\xE3o pode remover o pr\xF3prio acesso administrativo."
      },
      400
    );
  }
  const settings = await getAdminAccessSettingsRecord(env);
  const nextAdminEmails = settings.adminEmails.filter(
    (adminEmail) => adminEmail !== email
  );
  if (nextAdminEmails.length === 0) {
    return jsonResponse(
      {
        error: "last_admin_removal_not_allowed",
        message: "O sistema precisa manter pelo menos um administrador."
      },
      400
    );
  }
  if (nextAdminEmails.length !== settings.adminEmails.length) {
    await saveAdminAccessSettings(env, settings, {
      action: "remove",
      actorEmail: callerEmail,
      adminEmails: nextAdminEmails,
      targetEmail: email
    });
  }
  const targetUser = await lookupFirebaseUserByEmail(env, email);
  if (targetUser && hasFirebaseAdminClaim(targetUser)) {
    await setFirebaseAdminClaim(env, targetUser, false);
  }
  return jsonResponse(await buildAdminUsersResponse(env));
}
__name(handleRemoveAdminUser, "handleRemoveAdminUser");
function buildUnauthorizedAdminResponse() {
  return jsonResponse(
    {
      error: "unauthorized",
      message: "Sessao administrativa ausente ou invalida."
    },
    401
  );
}
__name(buildUnauthorizedAdminResponse, "buildUnauthorizedAdminResponse");
async function getAuthorizedAdminCaller(request, env) {
  const caller = await getFirebaseUserFromRequest(request, env);
  const callerEmail = normalizeEmailValue(caller?.email ?? null);
  if (!caller || !callerEmail || !hasFirebaseAdminClaim(caller)) {
    return null;
  }
  const settings = await getAdminAccessSettingsRecord(env);
  if (!settings.adminEmails.includes(callerEmail)) {
    return null;
  }
  return caller;
}
__name(getAuthorizedAdminCaller, "getAuthorizedAdminCaller");
async function getFirebaseUserFromRequest(request, env) {
  const idToken = getBearerToken(request);
  if (!idToken) {
    return null;
  }
  try {
    const response = await callIdentityToolkit(
      env,
      `/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
      {
        idToken
      }
    );
    return response.users?.[0] ?? null;
  } catch (error) {
    if (error instanceof IdentityToolkitRequestError && (error.status === 400 || error.status === 401)) {
      return null;
    }
    throw error;
  }
}
__name(getFirebaseUserFromRequest, "getFirebaseUserFromRequest");
function getBearerToken(request) {
  const authorization = request.headers.get("Authorization")?.trim() ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}
__name(getBearerToken, "getBearerToken");
async function readAdminEmailFromRequest(request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !("email" in payload) || typeof payload.email !== "string") {
    return null;
  }
  const email = normalizeEmailValue(payload.email);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
__name(readAdminEmailFromRequest, "readAdminEmailFromRequest");
async function readNotificationIdFromRequest(request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !("notificationId" in payload) || typeof payload.notificationId !== "string") {
    return null;
  }
  const notificationId = payload.notificationId.trim();
  return /^[A-Za-z0-9_-]+__manual$/.test(notificationId) ? notificationId : null;
}
__name(readNotificationIdFromRequest, "readNotificationIdFromRequest");
async function readCalendarEventIdFromRequest(request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || !("calendarEventId" in payload) || typeof payload.calendarEventId !== "string") {
    return null;
  }
  const calendarEventId = payload.calendarEventId.trim();
  return /^[A-Za-z0-9_-]+$/.test(calendarEventId) ? calendarEventId : null;
}
__name(readCalendarEventIdFromRequest, "readCalendarEventIdFromRequest");
async function getAdminAccessSettingsRecord(env) {
  const document = await getDocument(env, "settings/adminAccess");
  if (!document) {
    return {
      adminEmails: [],
      createdAt: null,
      createdBy: null,
      documentUpdateTime: null
    };
  }
  return {
    adminEmails: getStringArrayField(document, "adminEmails").map((email) => normalizeEmailValue(email)).filter((email) => Boolean(email)),
    createdAt: getTimestampField(document, "createdAt"),
    createdBy: getStringField(document, "createdBy"),
    documentUpdateTime: document.updateTime ?? null
  };
}
__name(getAdminAccessSettingsRecord, "getAdminAccessSettingsRecord");
async function saveAdminAccessSettings(env, settings, input) {
  const now = /* @__PURE__ */ new Date();
  const normalizedAdminEmails = Array.from(new Set(input.adminEmails)).sort();
  await commitWrites(env, [
    buildUpdateWrite(
      "settings/adminAccess",
      {
        adminEmails: toJsonValue(normalizedAdminEmails),
        createdAt: toTimestampValue(settings.createdAt ?? now),
        createdBy: toStringValue(settings.createdBy ?? input.actorEmail),
        updatedAt: toTimestampValue(now),
        updatedBy: toStringValue(input.actorEmail)
      },
      void 0,
      settings.documentUpdateTime ? {
        exists: true,
        updateTime: settings.documentUpdateTime
      } : false,
      env
    ),
    buildUpdateWrite(
      `auditLogs/${crypto.randomUUID()}`,
      {
        action: toStringValue("update"),
        actorName: toStringValue(input.actorEmail),
        actorUid: toStringValue(input.actorEmail),
        after: toJsonValue({
          adminEmails: normalizedAdminEmails
        }),
        before: toJsonValue({
          adminEmails: settings.adminEmails
        }),
        createdAt: toTimestampValue(now),
        entityId: toStringValue("adminAccess"),
        entityType: toStringValue("settings"),
        metadata: toJsonValue({
          action: input.action,
          source: "admin-access-panel",
          targetEmail: input.targetEmail
        })
      },
      void 0,
      false,
      env
    )
  ]);
}
__name(saveAdminAccessSettings, "saveAdminAccessSettings");
async function buildAdminUsersResponse(env) {
  const settings = await getAdminAccessSettingsRecord(env);
  const users = await lookupFirebaseUsersByEmail(env, settings.adminEmails);
  const usersByEmail = new Map(
    users.flatMap((user) => {
      const email = normalizeEmailValue(user.email ?? null);
      return email ? [[email, user]] : [];
    })
  );
  return {
    users: settings.adminEmails.map((email) => {
      const user = usersByEmail.get(email);
      return {
        displayName: user?.displayName ?? null,
        email,
        hasAdminClaim: user ? hasFirebaseAdminClaim(user) : false,
        hasFirebaseAccount: Boolean(user)
      };
    })
  };
}
__name(buildAdminUsersResponse, "buildAdminUsersResponse");
async function lookupFirebaseUserByEmail(env, email) {
  const users = await lookupFirebaseUsersByEmail(env, [email]);
  return users[0] ?? null;
}
__name(lookupFirebaseUserByEmail, "lookupFirebaseUserByEmail");
async function lookupFirebaseUsersByEmail(env, emails) {
  if (emails.length === 0) {
    return [];
  }
  const response = await callIdentityToolkit(
    env,
    `/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    {
      email: emails
    }
  );
  return response.users ?? [];
}
__name(lookupFirebaseUsersByEmail, "lookupFirebaseUsersByEmail");
function hasFirebaseAdminClaim(user) {
  return parseFirebaseCustomAttributes(user.customAttributes).admin === true;
}
__name(hasFirebaseAdminClaim, "hasFirebaseAdminClaim");
async function setFirebaseAdminClaim(env, user, isAdmin) {
  const customAttributes = parseFirebaseCustomAttributes(user.customAttributes);
  if (isAdmin) {
    customAttributes.admin = true;
  } else {
    delete customAttributes.admin;
  }
  await callIdentityToolkit(
    env,
    `/projects/${env.FIREBASE_PROJECT_ID}/accounts:update`,
    {
      customAttributes: JSON.stringify(customAttributes),
      localId: user.localId,
      validSince: String(Math.floor(Date.now() / 1e3))
    }
  );
}
__name(setFirebaseAdminClaim, "setFirebaseAdminClaim");
function parseFirebaseCustomAttributes(customAttributes) {
  if (!customAttributes) {
    return {};
  }
  try {
    const parsed = JSON.parse(customAttributes);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !isJsonValue(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}
__name(parseFirebaseCustomAttributes, "parseFirebaseCustomAttributes");
function isJsonValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isJsonValue(entry));
  }
  if (typeof value === "object") {
    return Object.values(value).every((entry) => isJsonValue(entry));
  }
  return false;
}
__name(isJsonValue, "isJsonValue");
var IdentityToolkitRequestError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  static {
    __name(this, "IdentityToolkitRequestError");
  }
};
async function callIdentityToolkit(env, path, body) {
  const response = await fetch(`${identityToolkitBaseUrl}${path}`, {
    method: "POST",
    headers: await buildGoogleApiHeaders(env),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new IdentityToolkitRequestError(
      response.status,
      `Falha ao consultar Firebase Auth: ${errorText}`
    );
  }
  return await response.json();
}
__name(callIdentityToolkit, "callIdentityToolkit");
async function getDocument(env, path) {
  const response = await fetch(buildFirestoreUrl(env, `/documents/${path}`), {
    method: "GET",
    headers: await buildFirestoreHeaders(env)
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao ler ${path}: ${errorText}`);
  }
  return await response.json();
}
__name(getDocument, "getDocument");
async function runQuery(env, structuredQuery) {
  const response = await fetch(
    buildFirestoreUrl(env, "/documents:runQuery"),
    {
      method: "POST",
      headers: await buildFirestoreHeaders(env),
      body: JSON.stringify({
        structuredQuery
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao consultar Firestore: ${errorText}`);
  }
  return await response.json();
}
__name(runQuery, "runQuery");
async function commitWrites(env, writes) {
  const response = await fetch(
    buildFirestoreUrl(env, "/documents:commit"),
    {
      method: "POST",
      headers: await buildFirestoreHeaders(env),
      body: JSON.stringify({
        writes
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao gravar no Firestore: ${errorText}`);
  }
}
__name(commitWrites, "commitWrites");
function isFirestorePreconditionError(error) {
  return error instanceof Error && error.message.includes("FAILED_PRECONDITION");
}
__name(isFirestorePreconditionError, "isFirestorePreconditionError");
function buildUpdateWrite(path, fields, fieldPaths = Object.keys(fields), currentDocument = true, env) {
  if (!env) {
    throw new Error("Env ausente ao montar write do Firestore.");
  }
  const normalizedCurrentDocument = typeof currentDocument === "boolean" ? {
    exists: currentDocument
  } : currentDocument;
  return {
    currentDocument: normalizedCurrentDocument,
    update: {
      fields,
      name: buildDocumentName(env, path)
    },
    updateMask: {
      fieldPaths
    }
  };
}
__name(buildUpdateWrite, "buildUpdateWrite");
function buildDocumentName(env, path) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/${firestoreDatabaseId}/documents/${normalizedPath}`;
}
__name(buildDocumentName, "buildDocumentName");
async function buildFirestoreHeaders(env) {
  const accessToken = await getGoogleAccessToken(env);
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}
__name(buildFirestoreHeaders, "buildFirestoreHeaders");
async function buildGoogleApiHeaders(env) {
  const accessToken = await getGoogleAccessToken(env);
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}
__name(buildGoogleApiHeaders, "buildGoogleApiHeaders");
function buildFirestoreUrl(env, suffix) {
  return `${firestoreBaseUrl}/projects/${env.FIREBASE_PROJECT_ID}/databases/${firestoreDatabaseId}${suffix}`;
}
__name(buildFirestoreUrl, "buildFirestoreUrl");
async function getGoogleAccessToken(env) {
  const now = Date.now();
  if (googleAccessTokenSession && googleAccessTokenSession.expiresAt - 6e4 > now) {
    return googleAccessTokenSession.accessToken;
  }
  const jwtAssertion = await buildServiceAccountJwtAssertion(env);
  const response = await fetch(googleOauthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      assertion: jwtAssertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer"
    }).toString()
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao autenticar o worker com service account: ${errorText}`);
  }
  const payload = await response.json();
  const expiresInSeconds = payload.expires_in;
  googleAccessTokenSession = {
    accessToken: payload.access_token,
    expiresAt: now + expiresInSeconds * 1e3
  };
  return payload.access_token;
}
__name(getGoogleAccessToken, "getGoogleAccessToken");
async function buildServiceAccountJwtAssertion(env) {
  const nowInSeconds = Math.floor(Date.now() / 1e3);
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT"
  };
  const jwtPayload = {
    aud: googleOauthTokenUrl,
    exp: nowInSeconds + 3600,
    iat: nowInSeconds,
    iss: env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    scope: googleWorkerScopes
  };
  const encodedHeader = base64UrlEncodeJson(jwtHeader);
  const encodedPayload = base64UrlEncodeJson(jwtPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signJwtWithServiceAccountKey(
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    signingInput
  );
  return `${signingInput}.${signature}`;
}
__name(buildServiceAccountJwtAssertion, "buildServiceAccountJwtAssertion");
async function signJwtWithServiceAccountKey(privateKeyPem, signingInput) {
  const normalizedPrivateKey = privateKeyPem.replace(/\\n/g, "\n").trim();
  const pkcs8Der = pemToArrayBuffer(normalizedPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Der,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return base64UrlEncodeBuffer(signatureBuffer);
}
__name(signJwtWithServiceAccountKey, "signJwtWithServiceAccountKey");
function pemToArrayBuffer(pemValue) {
  const base64Body = pemValue.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s+/g, "");
  const binaryString = atob(base64Body);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
  return bytes.buffer;
}
__name(pemToArrayBuffer, "pemToArrayBuffer");
function base64UrlEncodeJson(value) {
  return base64UrlEncodeText(JSON.stringify(value));
}
__name(base64UrlEncodeJson, "base64UrlEncodeJson");
function base64UrlEncodeText(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncodeText, "base64UrlEncodeText");
function base64UrlEncodeBuffer(value) {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncodeBuffer, "base64UrlEncodeBuffer");
function buildConfirmationUrl(env, assignment) {
  const confirmationUrl = new URL(env.APP_CONFIRMATION_BASE_URL);
  confirmationUrl.searchParams.set("assignmentId", assignment.id);
  confirmationUrl.searchParams.set("token", assignment.confirmationToken ?? "");
  return confirmationUrl.toString();
}
__name(buildConfirmationUrl, "buildConfirmationUrl");
function resolveNotificationBatchSize(env) {
  const parsed = Number.parseInt(env.NOTIFICATION_BATCH_SIZE ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultBatchSize;
  }
  return Math.min(parsed, 20);
}
__name(resolveNotificationBatchSize, "resolveNotificationBatchSize");
function resolveCalendarSyncBatchSize(env) {
  const parsed = Number.parseInt(env.CALENDAR_SYNC_BATCH_SIZE ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultCalendarSyncBatchSize;
  }
  return Math.min(parsed, 20);
}
__name(resolveCalendarSyncBatchSize, "resolveCalendarSyncBatchSize");
function resolveWorkerActorUid(env) {
  return env.WORKER_ACTOR_UID?.trim() || "worker-automations";
}
__name(resolveWorkerActorUid, "resolveWorkerActorUid");
function resolveWorkerActorName(env) {
  return env.WORKER_ACTOR_NAME?.trim() || "Worker Automacoes";
}
__name(resolveWorkerActorName, "resolveWorkerActorName");
function buildCorsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "DELETE, GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };
}
__name(buildCorsHeaders, "buildCorsHeaders");
function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: buildCorsHeaders(),
    status
  });
}
__name(jsonResponse, "jsonResponse");
function isInternalRequestAuthorized(request, env) {
  const configuredToken = env.INTERNAL_API_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }
  const authHeader = request.headers.get("Authorization")?.trim() ?? "";
  return authHeader === `Bearer ${configuredToken}`;
}
__name(isInternalRequestAuthorized, "isInternalRequestAuthorized");
function buildFieldFilter(fieldPath, op, value) {
  return {
    fieldFilter: {
      field: {
        fieldPath
      },
      op,
      value
    }
  };
}
__name(buildFieldFilter, "buildFieldFilter");
function toStringValue(value) {
  return {
    stringValue: value
  };
}
__name(toStringValue, "toStringValue");
function toIntegerValue(value) {
  return {
    integerValue: String(Math.trunc(value))
  };
}
__name(toIntegerValue, "toIntegerValue");
function toTimestampValue(value) {
  return {
    timestampValue: value.toISOString()
  };
}
__name(toTimestampValue, "toTimestampValue");
function toNullValue() {
  return {
    nullValue: null
  };
}
__name(toNullValue, "toNullValue");
function toBooleanValue(value) {
  return {
    booleanValue: value
  };
}
__name(toBooleanValue, "toBooleanValue");
function toJsonValue(value) {
  if (value === null) {
    return toNullValue();
  }
  if (typeof value === "string") {
    return toStringValue(value);
  }
  if (typeof value === "number") {
    return toIntegerValue(value);
  }
  if (typeof value === "boolean") {
    return toBooleanValue(value);
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toJsonValue(item))
      }
    };
  }
  const fieldEntries = Object.entries(value).map(([key, entryValue]) => [
    key,
    toJsonValue(entryValue)
  ]);
  return {
    mapValue: {
      fields: Object.fromEntries(fieldEntries)
    }
  };
}
__name(toJsonValue, "toJsonValue");
function getDocumentId(documentName) {
  const parts = documentName.split("/");
  return parts[parts.length - 1] ?? documentName;
}
__name(getDocumentId, "getDocumentId");
function getField(document, fieldName) {
  return document.fields?.[fieldName];
}
__name(getField, "getField");
function getStringField(document, fieldName) {
  const field = getField(document, fieldName);
  if (field && "stringValue" in field) {
    return field.stringValue;
  }
  return null;
}
__name(getStringField, "getStringField");
function getStringArrayField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field || !("arrayValue" in field)) {
    return [];
  }
  return field.arrayValue.values?.flatMap((value) => "stringValue" in value ? [value.stringValue] : []) ?? [];
}
__name(getStringArrayField, "getStringArrayField");
function getIntegerField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field || !("integerValue" in field)) {
    return null;
  }
  return Number.parseInt(field.integerValue, 10);
}
__name(getIntegerField, "getIntegerField");
function getBooleanField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field || !("booleanValue" in field)) {
    return null;
  }
  return field.booleanValue;
}
__name(getBooleanField, "getBooleanField");
function getNullableStringField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field) {
    return null;
  }
  if ("nullValue" in field) {
    return null;
  }
  if ("stringValue" in field) {
    return field.stringValue;
  }
  return null;
}
__name(getNullableStringField, "getNullableStringField");
function getRequiredStringField(document, fieldName) {
  const value = getStringField(document, fieldName);
  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`);
  }
  return value;
}
__name(getRequiredStringField, "getRequiredStringField");
function getRequiredIntegerField(document, fieldName) {
  const value = getIntegerField(document, fieldName);
  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`);
  }
  return value;
}
__name(getRequiredIntegerField, "getRequiredIntegerField");
function getRequiredBooleanField(document, fieldName) {
  const value = getBooleanField(document, fieldName);
  if (value === null) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`);
  }
  return value;
}
__name(getRequiredBooleanField, "getRequiredBooleanField");
function getRequiredTimestampField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field || !("timestampValue" in field)) {
    throw new Error(`Campo ${fieldName} ausente em ${document.name}.`);
  }
  return new Date(field.timestampValue);
}
__name(getRequiredTimestampField, "getRequiredTimestampField");
function getTimestampField(document, fieldName) {
  const field = getField(document, fieldName);
  if (!field || !("timestampValue" in field)) {
    return null;
  }
  return new Date(field.timestampValue);
}
__name(getTimestampField, "getTimestampField");
function formatEventDateLabel(value, locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeZone: defaultCalendarZoneId
  }).format(value);
}
__name(formatEventDateLabel, "formatEventDateLabel");
function toStartOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}
__name(toStartOfDay, "toStartOfDay");
function isOperationalAssignmentStatus(status) {
  return status === "pending" || status === "confirmed";
}
__name(isOperationalAssignmentStatus, "isOperationalAssignmentStatus");
function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
__name(sleep, "sleep");
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Falha desconhecida na integra\xE7\xE3o com Google Calendar.";
}
__name(getErrorMessage, "getErrorMessage");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

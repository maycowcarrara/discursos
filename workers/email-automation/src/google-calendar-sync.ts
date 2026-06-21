export const maxCalendarRetryCount = 3
export const calendarRetryDelayMinutes = 30

export type GoogleCalendarAssignmentKind =
  | 'incomingVisitor'
  | 'localTalk'
  | 'outgoingTalk'

type ResolveGoogleCalendarAssignmentKindInput = {
  destinationIsLocal: boolean | null
  speakerType: 'local' | 'visitor'
}

type ShouldProcessManualCalendarSyncInput = {
  hasLatestAssignment: boolean
  hasRemoteEvent: boolean
  hasSyncEntry: boolean
  lastRelevantChangeAt: number
  requestedAt: number
}

export function shouldPublishStandaloneCalendarEvent(type: string) {
  return type === 'special'
}

export function resolveGoogleCalendarAssignmentKind({
  destinationIsLocal,
  speakerType,
}: ResolveGoogleCalendarAssignmentKindInput): GoogleCalendarAssignmentKind | null {
  if (speakerType === 'visitor' && destinationIsLocal === true) {
    return 'incomingVisitor'
  }

  if (speakerType === 'local' && destinationIsLocal === true) {
    return 'localTalk'
  }

  if (speakerType === 'local' && destinationIsLocal === false) {
    return 'outgoingTalk'
  }

  return null
}

export function shouldProcessManualCalendarSync({
  hasLatestAssignment,
  hasRemoteEvent,
  hasSyncEntry,
  lastRelevantChangeAt,
  requestedAt,
}: ShouldProcessManualCalendarSyncInput) {
  if (!hasSyncEntry && !hasRemoteEvent) {
    return false
  }

  if (!hasSyncEntry && hasRemoteEvent && !hasLatestAssignment) {
    return true
  }

  return requestedAt >= lastRelevantChangeAt
}

export function resolveCalendarRetryDecision(retryCount: number, now: Date) {
  const nextRetryCount = retryCount + 1
  const shouldRetry = nextRetryCount < maxCalendarRetryCount

  return {
    nextRetryCount,
    scheduledFor: shouldRetry
      ? new Date(now.getTime() + calendarRetryDelayMinutes * 60_000)
      : null,
    status: shouldRetry ? 'pending' as const : 'error' as const,
  }
}

export function buildGoogleCalendarEventIdFromDigest(digest: ArrayBuffer) {
  const bytes = new Uint8Array(digest)
  let encoded = ''
  let bitBuffer = 0
  let bitCount = 0
  const alphabet = '0123456789abcdefghijklmnopqrstuv'

  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte
    bitCount += 8

    while (bitCount >= 5) {
      bitCount -= 5
      encoded += alphabet[(bitBuffer >> bitCount) & 31]
    }
  }

  if (bitCount > 0) {
    encoded += alphabet[(bitBuffer << (5 - bitCount)) & 31]
  }

  return `discursos${encoded.slice(0, 40)}`
}

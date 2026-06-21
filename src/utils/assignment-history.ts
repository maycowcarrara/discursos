import type {
  AssignmentDocument,
  CongregationDocument,
  FirestoreRecord,
} from '../types/firestore.js'

export type AssignmentMovementType = 'incoming' | 'outgoing' | 'local'

export function inferAssignmentMovementType(
  assignment: FirestoreRecord<AssignmentDocument>,
  congregationsById: Map<string, FirestoreRecord<CongregationDocument>>,
): AssignmentMovementType {
  const localCongregation = congregationsById.get(assignment.localCongregationId)

  if (assignment.speakerType === 'visitor' && localCongregation?.isLocal) {
    return 'incoming'
  }

  if (assignment.speakerType === 'local' && localCongregation && !localCongregation.isLocal) {
    return 'outgoing'
  }

  return 'local'
}

export function getAssignmentMovementLabel(
  movementType: AssignmentMovementType,
) {
  if (movementType === 'incoming') {
    return 'Orador visitante'
  }

  if (movementType === 'outgoing') {
    return 'Discurso fora'
  }

  return 'Designação local'
}

import type {
  AssignmentDocument,
  CongregationDocument,
  FirestoreRecord,
  SpeakerDocument,
} from '../types/firestore.js'

type BuildAssignmentWhatsAppUrlInput = {
  assignment: FirestoreRecord<AssignmentDocument>
  destinationCongregation: FirestoreRecord<CongregationDocument> | null
  speaker: FirestoreRecord<SpeakerDocument>
}

function normalizeWhatsAppDigits(phone: string) {
  const rawDigits = phone.replace(/\D/g, '')

  if (!rawDigits) {
    return null
  }

  if (rawDigits.length === 10 || rawDigits.length === 11) {
    return `55${rawDigits}`
  }

  return rawDigits
}

function formatAssignmentDateLabel(assignment: FirestoreRecord<AssignmentDocument>) {
  return assignment.eventDate.toDate().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'long',
    year: 'numeric',
  })
}

function formatDestinationAddress(
  congregation: FirestoreRecord<CongregationDocument> | null,
) {
  if (!congregation) {
    return 'Não informado'
  }

  const cityState = [congregation.city, congregation.state]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' - ')
  const addressParts = [congregation.address.trim(), cityState].filter(Boolean)

  return addressParts.length > 0 ? addressParts.join(', ') : 'Não informado'
}

export function buildAssignmentWhatsAppConfirmationMessage({
  assignment,
  destinationCongregation,
}: Omit<BuildAssignmentWhatsAppUrlInput, 'speaker'>) {
  const meetingDay = destinationCongregation?.meetingDay.trim() || 'Não informado'
  const meetingTime = destinationCongregation?.meetingTime.trim() || 'Não informado'

  return [
    `Olá, ${assignment.speakerName}. Tudo bem?`,
    '',
    'Estamos confirmando sua designação para o discurso público.',
    '',
    `Data: ${formatAssignmentDateLabel(assignment)}`,
    `Discurso: Tema ${assignment.themeNumber} - ${assignment.themeTitle}`,
    `Origem: ${assignment.originCongregationName}`,
    `Destino: ${assignment.localCongregationName}`,
    `Endereço: ${formatDestinationAddress(destinationCongregation)}`,
    `Dia da reunião: ${meetingDay}`,
    `Horário da reunião: ${meetingTime}`,
    '',
    'Pode confirmar, por favor, se está tudo certo para essa designação?',
  ].join('\n')
}

export function buildAssignmentWhatsAppConfirmationUrl({
  assignment,
  destinationCongregation,
  speaker,
}: BuildAssignmentWhatsAppUrlInput) {
  const digits = normalizeWhatsAppDigits(speaker.phone)

  if (!digits) {
    return null
  }

  const message = buildAssignmentWhatsAppConfirmationMessage({
    assignment,
    destinationCongregation,
  })

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

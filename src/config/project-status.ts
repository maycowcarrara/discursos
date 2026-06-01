export const currentDeliveredPhase = {
  number: 11,
  title: 'EmailJS',
} as const

export const nextRequiredPhase = {
  number: 12,
  title: 'Google Calendar',
} as const

export const currentDeliveredPhaseLabel = `FASE ${currentDeliveredPhase.number} - ${currentDeliveredPhase.title}`
export const nextRequiredPhaseLabel = `FASE ${nextRequiredPhase.number} - ${nextRequiredPhase.title}`

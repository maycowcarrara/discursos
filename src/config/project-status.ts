export const currentDeliveredPhase = {
  number: 10,
  title: 'Historico',
} as const

export const nextRequiredPhase = {
  number: 11,
  title: 'EmailJS',
} as const

export const currentDeliveredPhaseLabel = `FASE ${currentDeliveredPhase.number} - ${currentDeliveredPhase.title}`
export const nextRequiredPhaseLabel = `FASE ${nextRequiredPhase.number} - ${nextRequiredPhase.title}`

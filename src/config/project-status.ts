export const currentDeliveredPhase = {
  number: 9,
  title: 'Dashboard',
} as const

export const nextRequiredPhase = {
  number: 10,
  title: 'Historico',
} as const

export const currentDeliveredPhaseLabel = `FASE ${currentDeliveredPhase.number} - ${currentDeliveredPhase.title}`
export const nextRequiredPhaseLabel = `FASE ${nextRequiredPhase.number} - ${nextRequiredPhase.title}`

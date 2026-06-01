export type OperationalStatus =
  | 'confirmed'
  | 'pending'
  | 'event'
  | 'cancelled'
  | 'local'
  | 'visitor'

export type SpeakerStatus = 'active' | 'vacation' | 'unavailable'

export type PlanningMonth = {
  month: string
  entries: Array<{
    day: string
    label: string
    status: OperationalStatus
  }>
}

export type AgendaDay = {
  day: number
  muted?: boolean
  status?: OperationalStatus
  isToday?: boolean
}

export type SpeakerSummary = {
  id: string
  name: string
  type: 'local' | 'visitor'
  congregation: string
  email: string
  phone: string
  themes: number[]
  status: SpeakerStatus
}

export type HistoryEntry = {
  date: string
  congregation: string
  theme: string
  type: 'Visitante' | 'Local'
  status: 'Confirmado' | 'Pendente' | 'Cancelado'
}

export const congregationProfile = {
  name: 'Palmas Centro',
  address: 'Rua das Flores, 123 - Palmas/TO',
  meetingDay: 'Sabado',
  meetingTime: '19:30',
  mapsLabel: 'Ver no mapa',
}

export const nextSaturdayAssignment = {
  dateDay: '13',
  dateLabel: 'JUN/2026',
  timeLabel: 'Sabado - 19:30',
  speaker: 'Carlos Oliveira',
  speakerType: 'Visitante',
  congregation: 'Palmas Sul',
  theme: '84 - Como fortalecer a familia',
  status: 'Confirmado',
}

export const dashboardMetrics = [
  {
    label: 'Pendencias',
    value: '3',
    detail: '20/06 sem orador designado',
    tone: 'amber',
  },
  {
    label: 'Proximos eventos',
    value: '2',
    detail: '18/07 Assembleia',
    tone: 'blue',
  },
  {
    label: 'Resumo geral',
    value: '82',
    detail: 'Oradores locais ativos',
    tone: 'green',
  },
] as const

export const annualPlanningMonths: PlanningMonth[] = [
  {
    month: 'Junho 2026',
    entries: [
      { day: '07', label: 'Carlos - Tema 84', status: 'confirmed' },
      { day: '14', label: 'Joao - Tema 112', status: 'confirmed' },
      { day: '21', label: 'Sem orador', status: 'pending' },
      { day: '28', label: 'Pedro - Tema 15', status: 'confirmed' },
    ],
  },
  {
    month: 'Julho 2026',
    entries: [
      { day: '05', label: 'Sem tema', status: 'pending' },
      { day: '12', label: 'Marcos - Tema 41', status: 'confirmed' },
      { day: '19', label: 'Assembleia', status: 'event' },
      { day: '26', label: 'Jose - Tema 91', status: 'confirmed' },
    ],
  },
  {
    month: 'Agosto 2026',
    entries: [
      { day: '02', label: 'Confirmado', status: 'confirmed' },
      { day: '09', label: 'Congresso', status: 'event' },
      { day: '16', label: 'Congresso', status: 'event' },
      { day: '23', label: 'Confirmado', status: 'confirmed' },
      { day: '30', label: 'Pendente', status: 'pending' },
    ],
  },
  {
    month: 'Setembro 2026',
    entries: [
      { day: '06', label: 'Confirmado', status: 'confirmed' },
      { day: '13', label: 'Confirmado', status: 'confirmed' },
      { day: '20', label: 'Sem orador', status: 'pending' },
      { day: '27', label: 'Confirmado', status: 'confirmed' },
    ],
  },
  {
    month: 'Outubro 2026',
    entries: [
      { day: '04', label: 'Confirmado', status: 'confirmed' },
      { day: '11', label: 'Confirmado', status: 'confirmed' },
      { day: '18', label: 'Assembleia', status: 'event' },
      { day: '25', label: 'Confirmado', status: 'confirmed' },
    ],
  },
  {
    month: 'Novembro 2026',
    entries: [
      { day: '01', label: 'Confirmado', status: 'confirmed' },
      { day: '08', label: 'Confirmado', status: 'confirmed' },
      { day: '15', label: 'Pendente', status: 'pending' },
      { day: '22', label: 'Confirmado', status: 'confirmed' },
      { day: '29', label: 'Confirmado', status: 'confirmed' },
    ],
  },
  {
    month: 'Dezembro 2026',
    entries: [
      { day: '06', label: 'Confirmado', status: 'confirmed' },
      { day: '13', label: 'Confirmado', status: 'confirmed' },
      { day: '20', label: 'Pendente', status: 'pending' },
      { day: '27', label: 'Confirmado', status: 'confirmed' },
    ],
  },
]

export const agendaMonthDays: AgendaDay[][] = [
  [
    { day: 31, muted: true },
    { day: 1 },
    { day: 2 },
    { day: 3 },
    { day: 4 },
    { day: 5 },
    { day: 6, status: 'confirmed' },
  ],
  [
    { day: 7 },
    { day: 8 },
    { day: 9 },
    { day: 10 },
    { day: 11 },
    { day: 12 },
    { day: 13, status: 'confirmed', isToday: true },
  ],
  [
    { day: 14 },
    { day: 15 },
    { day: 16 },
    { day: 17 },
    { day: 18 },
    { day: 19 },
    { day: 20, status: 'pending' },
  ],
  [
    { day: 21 },
    { day: 22 },
    { day: 23 },
    { day: 24 },
    { day: 25 },
    { day: 26 },
    { day: 27, status: 'pending' },
  ],
  [{ day: 28 }, { day: 29 }, { day: 30 }, { day: 1, muted: true }, { day: 2, muted: true }, { day: 3, muted: true }, { day: 4, muted: true }],
]

export const speakerSummaries: SpeakerSummary[] = [
  {
    id: '1',
    name: 'Joao da Silva',
    type: 'local',
    congregation: 'Palmas Centro',
    email: 'joao@exemplo.com',
    phone: '(63) 99999-1111',
    themes: [15, 41, 84, 112],
    status: 'active',
  },
  {
    id: '2',
    name: 'Carlos Oliveira',
    type: 'visitor',
    congregation: 'Palmas Sul',
    email: 'carlos@exemplo.com',
    phone: '(63) 99999-2222',
    themes: [15, 84, 91, 112],
    status: 'active',
  },
  {
    id: '3',
    name: 'Pedro Santos',
    type: 'local',
    congregation: 'Palmas Centro',
    email: 'pedro@exemplo.com',
    phone: '(63) 99999-3333',
    themes: [41, 84, 91],
    status: 'vacation',
  },
  {
    id: '4',
    name: 'Jose Martins',
    type: 'visitor',
    congregation: 'Gurupi Centro',
    email: 'jose@exemplo.com',
    phone: '(63) 99999-4444',
    themes: [15, 112, 134],
    status: 'active',
  },
]

export const speakerHistory: HistoryEntry[] = [
  {
    date: '10/05/2026',
    congregation: 'Palmas Sul',
    theme: '15 - Sejamos pacientes',
    type: 'Visitante',
    status: 'Confirmado',
  },
  {
    date: '22/03/2026',
    congregation: 'Palmas Norte',
    theme: '84 - Como fortalecer a familia',
    type: 'Visitante',
    status: 'Confirmado',
  },
  {
    date: '15/02/2026',
    congregation: 'Palmas Centro',
    theme: '112 - Persevere ate o fim',
    type: 'Visitante',
    status: 'Confirmado',
  },
  {
    date: '18/01/2026',
    congregation: 'Gurupi Centro',
    theme: '41 - Confie em Jeova',
    type: 'Visitante',
    status: 'Confirmado',
  },
  {
    date: '07/12/2025',
    congregation: 'Paraiso do Tocantins',
    theme: '134 - Jeova e nosso refugio',
    type: 'Visitante',
    status: 'Confirmado',
  },
]

export const congregationCards = [
  {
    name: 'Palmas Centro',
    location: 'Palmas/TO',
    schedule: 'Sabado - 19:30',
    role: 'Base local',
  },
  {
    name: 'Palmas Sul',
    location: 'Palmas/TO',
    schedule: 'Domingo - 18:00',
    role: 'Visitante frequente',
  },
  {
    name: 'Gurupi Centro',
    location: 'Gurupi/TO',
    schedule: 'Sabado - 18:30',
    role: 'Congregacao parceira',
  },
] as const

export const themeCards = [
  { number: 15, title: 'Sejamos pacientes', status: 'Ativo' },
  { number: 41, title: 'Confie em Jeova', status: 'Ativo' },
  { number: 84, title: 'Como fortalecer a familia', status: 'Ativo' },
  { number: 112, title: 'Persevere ate o fim', status: 'Ativo' },
] as const

export const settingsCards = [
  {
    title: 'Aplicacao',
    detail: 'Ano base configuravel e locale pt-BR.',
  },
  {
    title: 'Notificacoes',
    detail: 'EmailJS e Workers ativos para confirmacoes e lembretes.',
  },
  {
    title: 'Calendario',
    detail: 'Google Calendar integrado com fila leve e sincronizacao segura.',
  },
] as const

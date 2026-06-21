import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildAssignmentNotificationPlan } from './assignment-notifications.js'

test('agenda somente o lembrete de 4 dias quando a automação está ligada', () => {
  const now = new Date(2026, 4, 1, 10, 0, 0, 0)
  const eventDate = new Date(2026, 4, 9, 12, 0, 0, 0)

  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-1',
    eventDate,
    status: 'pending',
    recipient: {
      email: 'visitante@example.com',
      speakerName: 'Orador Visitante',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: true,
    now,
  })

  assert.equal(plan.length, 2)
  assert.equal(plan[0]?.type, 'confirmation')
  assert.equal(plan[0]?.status, 'cancelled')
  assert.equal(plan[0]?.scheduledFor.getTime(), now.getTime())
  assert.equal(plan[1]?.type, 'reminder4d')
  assert.equal(plan[1]?.status, 'pending')
  assert.equal(plan[1]?.scheduledFor.getTime(), new Date(2026, 4, 5, 9, 0, 0, 0).getTime())
})

test('mantém automações canceladas por padrão quando a flag está desligada', () => {
  const now = new Date(2026, 4, 1, 10, 0, 0, 0)
  const eventDate = new Date(2026, 4, 9, 12, 0, 0, 0)

  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-1',
    eventDate,
    status: 'pending',
    recipient: {
      email: 'visitante@example.com',
      speakerName: 'Orador Visitante',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: false,
    now,
  })

  assert.equal(plan.length, 2)
  assert.equal(plan.every((item) => item.status === 'cancelled'), true)
})

test('cancela confirmação automática quando a designação já está confirmada', () => {
  const now = new Date(2026, 4, 1, 10, 0, 0, 0)
  const eventDate = new Date(2026, 4, 20, 12, 0, 0, 0)

  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-2',
    eventDate,
    status: 'confirmed',
    recipient: {
      email: 'local@example.com',
      speakerName: 'Orador Local',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: true,
    now,
  })

  const confirmation = plan.find((item) => item.type === 'confirmation')
  const reminder4d = plan.find((item) => item.type === 'reminder4d')

  assert.equal(confirmation?.status, 'cancelled')
  assert.equal(reminder4d?.status, 'pending')
})

test('cancela automações quando o orador não possui e-mail válido', () => {
  const now = new Date(2026, 4, 1, 10, 0, 0, 0)
  const eventDate = new Date(2026, 4, 9, 12, 0, 0, 0)

  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-3',
    eventDate,
    status: 'pending',
    recipient: {
      email: '   ',
      speakerName: 'Sem Email',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: true,
    now,
  })

  assert.equal(plan.every((item) => item.status === 'cancelled'), true)
})

test('mantém confirmação automática cancelada mesmo após edição', () => {
  const now = new Date(2026, 4, 1, 10, 0, 0, 0)
  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-4',
    eventDate: new Date(2026, 4, 20, 12, 0, 0, 0),
    status: 'confirmed',
    recipient: {
      email: 'local@example.com',
      speakerName: 'Orador Local',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: true,
    isAssignmentUpdate: true,
    now,
  })
  const confirmation = plan.find((item) => item.type === 'confirmation')

  assert.equal(confirmation?.status, 'cancelled')
  assert.equal(
    confirmation?.subject,
    'ATUALIZAÇÃO - Confirmação de designação - Congregação Central',
  )
})

test('não envia lembrete tardio quando o horário de quatro dias já passou', () => {
  const now = new Date(2026, 4, 7, 10, 0, 0, 0)
  const plan = buildAssignmentNotificationPlan({
    assignmentId: 'assignment-5',
    eventDate: new Date(2026, 4, 9, 12, 0, 0, 0),
    status: 'pending',
    recipient: {
      email: 'visitante@example.com',
      speakerName: 'Orador Visitante',
    },
    organizationName: 'Congregação Central',
    automaticEmailsEnabled: true,
    now,
  })
  const reminder = plan.find((item) => item.type === 'reminder4d')

  assert.equal(reminder?.status, 'cancelled')
  assert.equal(
    reminder?.scheduledFor.getTime(),
    new Date(2026, 4, 5, 9, 0, 0, 0).getTime(),
  )
})

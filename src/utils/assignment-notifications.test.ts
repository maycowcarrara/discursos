import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildAssignmentNotificationPlan } from './assignment-notifications.js'

test('agenda confirmacao imediata e lembretes futuros para designacao pendente', () => {
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
    organizationName: 'Congregacao Central',
    now,
  })

  assert.equal(plan.length, 3)
  assert.equal(plan[0]?.type, 'confirmation')
  assert.equal(plan[0]?.status, 'pending')
  assert.equal(plan[0]?.scheduledFor.getTime(), now.getTime())
  assert.equal(plan[1]?.type, 'reminder7d')
  assert.equal(plan[1]?.status, 'pending')
  assert.equal(plan[1]?.scheduledFor.getTime(), new Date(2026, 4, 2, 9, 0, 0, 0).getTime())
  assert.equal(plan[2]?.type, 'reminder1d')
  assert.equal(plan[2]?.status, 'pending')
  assert.equal(plan[2]?.scheduledFor.getTime(), new Date(2026, 4, 8, 9, 0, 0, 0).getTime())
})

test('cancela confirmacao automatica quando a designacao ja esta confirmada', () => {
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
    organizationName: 'Congregacao Central',
    now,
  })

  const confirmation = plan.find((item) => item.type === 'confirmation')
  const reminder1d = plan.find((item) => item.type === 'reminder1d')

  assert.equal(confirmation?.status, 'cancelled')
  assert.equal(reminder1d?.status, 'pending')
})

test('cancela automacoes quando o orador nao possui email valido', () => {
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
    organizationName: 'Congregacao Central',
    now,
  })

  assert.equal(plan.every((item) => item.status === 'cancelled'), true)
})

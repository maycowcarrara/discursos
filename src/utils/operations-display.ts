import type {
  AuditAction,
  AuditEntityType,
  NotificationProvider,
  NotificationStatus,
  NotificationType,
} from '@/types/firestore'

export const notificationTypeLabels: Record<NotificationType, string> = {
  reminder7d: 'Lembrete 7 dias',
  reminder1d: 'Lembrete 1 dia',
  confirmation: 'Confirmação',
  manual: 'Manual',
}

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
}

export const notificationProviderLabels: Record<NotificationProvider, string> = {
  emailjs: 'EmailJS',
  worker: 'Automação',
}

export const auditEntityTypeLabels: Record<AuditEntityType, string> = {
  congregation: 'Congregação',
  speaker: 'Orador',
  theme: 'Tema',
  calendarEvent: 'Evento',
  assignment: 'Designação',
  settings: 'Configuração',
  notification: 'Notificação',
}

export const auditActionLabels: Record<AuditAction, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  statusChange: 'Mudança de status',
  sync: 'Sincronização',
}

export function getNotificationStatusClassName(status: NotificationStatus) {
  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
  }

  if (status === 'sent') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
}

export function getAuditActionClassName(action: AuditAction) {
  if (action === 'create' || action === 'sync') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
  }

  if (action === 'update' || action === 'statusChange') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
  }

  return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
}

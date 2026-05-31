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
  confirmation: 'Confirmacao',
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
  worker: 'Worker',
}

export const auditEntityTypeLabels: Record<AuditEntityType, string> = {
  congregation: 'Congregacao',
  speaker: 'Orador',
  theme: 'Tema',
  calendarEvent: 'Evento',
  assignment: 'Designacao',
  settings: 'Configuracao',
  notification: 'Notificacao',
}

export const auditActionLabels: Record<AuditAction, string> = {
  create: 'Criacao',
  update: 'Atualizacao',
  delete: 'Exclusao',
  statusChange: 'Mudanca de status',
  sync: 'Sincronizacao',
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

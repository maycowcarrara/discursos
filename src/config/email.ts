import { env } from './env'

export const emailDeliveryUnavailableMessage =
  'Configure as credenciais do EmailJS para habilitar envios por e-mail.'

export function isEmailDeliveryConfigured() {
  return Boolean(
    env.VITE_EMAILJS_SERVICE_ID?.trim() &&
      env.VITE_EMAILJS_TEMPLATE_ID?.trim() &&
      env.VITE_EMAILJS_PUBLIC_KEY?.trim(),
  )
}

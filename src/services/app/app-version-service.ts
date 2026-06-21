type PublishedVersion = {
  version: string
}

function isPublishedVersion(value: unknown): value is PublishedVersion {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'string'
  )
}

export const appVersion = __APP_VERSION__

export async function getPublishedAppVersion(): Promise<string> {
  const response = await fetch(`/version.json?checkedAt=${Date.now()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível consultar a versão publicada.')
  }

  const payload: unknown = await response.json()

  if (!isPublishedVersion(payload)) {
    throw new Error('A versão publicada retornou um formato inválido.')
  }

  return payload.version
}

export async function refreshApp(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  }

  window.location.reload()
}

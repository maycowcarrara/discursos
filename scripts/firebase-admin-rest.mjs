import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const googleOauthTokenUrl = 'https://oauth2.googleapis.com/token'

export function resolveServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson)
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()

  if (credentialsPath) {
    return JSON.parse(readFileSync(credentialsPath, 'utf8'))
  }

  throw new Error(
    'Defina FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS.',
  )
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function signServiceAccountJwt(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000)
  const header = encodeBase64Url(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT',
  }))
  const claims = encodeBase64Url(JSON.stringify({
    aud: googleOauthTokenUrl,
    exp: now + 3600,
    iat: now,
    iss: serviceAccount.client_email,
    scope,
  }))
  const unsignedToken = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')

  signer.update(unsignedToken)
  signer.end()

  return `${unsignedToken}.${signer.sign(serviceAccount.private_key, 'base64url')}`
}

export async function getAccessToken(serviceAccount, scope) {
  const response = await fetch(googleOauthTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      assertion: signServiceAccountJwt(serviceAccount, scope),
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
  })

  if (!response.ok) {
    throw new Error(`Falha ao autenticar service account: ${await response.text()}`)
  }

  const payload = await response.json()

  return payload.access_token
}

export async function callIdentityToolkit(serviceAccount, path, body) {
  const accessToken = await getAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/identitytoolkit',
  )
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok) {
    throw new Error(`Falha ao atualizar Firebase Auth: ${await response.text()}`)
  }

  return response.json()
}

export async function getFirestoreDocument(serviceAccount, path) {
  const accessToken = await getAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/datastore',
  )
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Falha ao ler Firestore: ${await response.text()}`)
  }

  return response.json()
}

export async function commitFirestoreWrites(serviceAccount, writes) {
  const accessToken = await getAccessToken(
    serviceAccount,
    'https://www.googleapis.com/auth/datastore',
  )
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        writes,
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Falha ao gravar Firestore: ${await response.text()}`)
  }
}

export function readArgument(name) {
  const argumentIndex = process.argv.indexOf(name)

  return argumentIndex >= 0 ? process.argv[argumentIndex + 1]?.trim() ?? '' : ''
}

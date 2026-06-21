// @ts-check

import {
  commitFirestoreWrites,
  getAccessToken,
  resolveServiceAccount,
} from './firebase-admin-rest.mjs'

const pageSize = 200
const writeChunkSize = 200

function hasDryRunFlag() {
  return process.argv.includes('--dry-run')
}

/**
 * @template T
 * @param {T[]} values
 * @param {number} size
 */
function chunkArray(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

/**
 * @param {unknown} value
 */
function getStringValue(value) {
  if (
    typeof value === 'object' &&
    value !== null &&
    'stringValue' in value &&
    typeof value.stringValue === 'string'
  ) {
    return value.stringValue
  }

  return ''
}

/**
 * @param {Record<string, unknown>} serviceAccount
 * @param {string} accessToken
 */
async function listLegacySpeakerStatusDocuments(serviceAccount, accessToken) {
  const matchingDocuments = []
  let nextPageToken = ''

  do {
    const query = new URLSearchParams({
      pageSize: String(pageSize),
      'mask.fieldPaths': 'status',
    })

    if (nextPageToken) {
      query.set('pageToken', nextPageToken)
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/speakers?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Falha ao listar oradores: ${await response.text()}`)
    }

    const payload = await response.json()
    const documents = Array.isArray(payload.documents) ? payload.documents : []

    matchingDocuments.push(
      ...documents.filter((document) => {
        const status = getStringValue(document.fields?.status)

        return status === 'vacation' || status === 'transferred'
      }),
    )
    nextPageToken = payload.nextPageToken ?? ''
  } while (nextPageToken)

  return matchingDocuments
}

/**
 * @param {{ name: string, fields?: Record<string, unknown> }} document
 * @param {string} now
 */
function buildSpeakerStatusWrite(document, now) {
  const currentStatus = getStringValue(document.fields?.status)
  const nextStatus = currentStatus === 'vacation' ? 'unavailable' : 'inactive'
  const nextIsActive = nextStatus !== 'inactive'
  const fields = {
    status: {
      stringValue: nextStatus,
    },
    isActive: {
      booleanValue: nextIsActive,
    },
    updatedAt: {
      timestampValue: now,
    },
  }
  const fieldPaths = ['status', 'isActive', 'updatedAt']

  if (nextStatus === 'inactive') {
    fields.unavailableStart = {
      nullValue: null,
    }
    fields.unavailableEnd = {
      nullValue: null,
    }
    fieldPaths.push('unavailableStart', 'unavailableEnd')
  }

  return {
    currentDocument: {
      exists: true,
    },
    update: {
      name: document.name,
      fields,
    },
    updateMask: {
      fieldPaths,
    },
  }
}

const serviceAccount = resolveServiceAccount()
const accessToken = await getAccessToken(
  serviceAccount,
  'https://www.googleapis.com/auth/datastore',
)
const documents = await listLegacySpeakerStatusDocuments(serviceAccount, accessToken)

if (documents.length === 0) {
  console.log('Nenhum orador com status legado encontrado.')
  process.exit(0)
}

console.log(
  `Encontrados ${documents.length} oradores com status legado.${
    hasDryRunFlag() ? ' Nenhuma alteração será gravada (--dry-run).' : ''
  }`,
)

for (const document of documents) {
  const currentStatus = getStringValue(document.fields?.status)
  const nextStatus = currentStatus === 'vacation' ? 'unavailable' : 'inactive'

  console.log(`- ${document.name.split('/').pop()}: ${currentStatus} -> ${nextStatus}`)
}

if (hasDryRunFlag()) {
  process.exit(0)
}

const now = new Date().toISOString()

for (const documentChunk of chunkArray(documents, writeChunkSize)) {
  await commitFirestoreWrites(
    serviceAccount,
    documentChunk.map((document) => buildSpeakerStatusWrite(document, now)),
  )
}

console.log('Status legados de oradores normalizados com sucesso.')

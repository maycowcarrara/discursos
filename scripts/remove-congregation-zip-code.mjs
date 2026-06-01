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

async function listCongregationDocumentsWithZipCode(serviceAccount, accessToken) {
  const matchingDocuments = []
  let nextPageToken = ''

  do {
    const query = new URLSearchParams({
      pageSize: String(pageSize),
      'mask.fieldPaths': 'zipCode',
    })

    if (nextPageToken) {
      query.set('pageToken', nextPageToken)
    }

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/congregations?${query.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Falha ao listar congregações: ${await response.text()}`)
    }

    const payload = await response.json()
    const documents = Array.isArray(payload.documents) ? payload.documents : []

    matchingDocuments.push(
      ...documents.filter((document) => document.fields?.zipCode !== undefined),
    )
    nextPageToken = payload.nextPageToken ?? ''
  } while (nextPageToken)

  return matchingDocuments
}

function chunkArray(values, size) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

const serviceAccount = resolveServiceAccount()
const accessToken = await getAccessToken(
  serviceAccount,
  'https://www.googleapis.com/auth/datastore',
)
const documents = await listCongregationDocumentsWithZipCode(serviceAccount, accessToken)

if (documents.length === 0) {
  console.log('Nenhuma congregação com zipCode encontrada.')
  process.exit(0)
}

console.log(
  `Encontradas ${documents.length} congregações com zipCode legado.${
    hasDryRunFlag() ? ' Nenhuma alteração será gravada (--dry-run).' : ''
  }`,
)

for (const document of documents) {
  console.log(`- ${document.name.split('/').pop()}`)
}

if (hasDryRunFlag()) {
  process.exit(0)
}

for (const documentChunk of chunkArray(documents, writeChunkSize)) {
  await commitFirestoreWrites(
    serviceAccount,
    documentChunk.map((document) => ({
      currentDocument: {
        exists: true,
      },
      update: {
        name: document.name,
      },
      updateMask: {
        fieldPaths: ['zipCode'],
      },
    })),
  )
}

console.log('Campo zipCode removido das congregações listadas.')

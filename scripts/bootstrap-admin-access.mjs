import {
  commitFirestoreWrites,
  getFirestoreDocument,
  readArgument,
  resolveServiceAccount,
} from './firebase-admin-rest.mjs'

const email = readArgument('--email').toLowerCase()

if (!email) {
  throw new Error('Informe o e-mail administrativo com --email.')
}

const serviceAccount = resolveServiceAccount()
const existingDocument = await getFirestoreDocument(
  serviceAccount,
  'settings/adminAccess',
)
const currentEmails =
  existingDocument?.fields?.adminEmails?.arrayValue?.values
    ?.map((value) => value.stringValue?.trim().toLowerCase())
    .filter(Boolean) ?? []
const adminEmails = Array.from(new Set([...currentEmails, email])).sort()
const now = new Date().toISOString()
const fields = {
  adminEmails: {
    arrayValue: {
      values: adminEmails.map((adminEmail) => ({
        stringValue: adminEmail,
      })),
    },
  },
  createdAt: existingDocument?.fields?.createdAt ?? {
    timestampValue: now,
  },
  updatedAt: {
    timestampValue: now,
  },
  createdBy: existingDocument?.fields?.createdBy ?? {
    stringValue: 'bootstrap-admin-access',
  },
  updatedBy: {
    stringValue: 'bootstrap-admin-access',
  },
}

await commitFirestoreWrites(serviceAccount, [
  {
    currentDocument: existingDocument?.updateTime
      ? {
          exists: true,
          updateTime: existingDocument.updateTime,
        }
      : {
          exists: false,
        },
    update: {
      fields,
      name: `projects/${serviceAccount.project_id}/databases/(default)/documents/settings/adminAccess`,
    },
    updateMask: {
      fieldPaths: Object.keys(fields),
    },
  },
])

console.log(`Allowlist administrativa atualizada para ${email}.`)

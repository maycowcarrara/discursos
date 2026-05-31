import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { firebaseDb } from '@/lib/firebase'
import {
  appSettingsSchema,
  type AppSettingsDocument,
  type FirestoreRecord,
} from '@/types/firestore'

import { getTypedDocument } from './shared'

export type AppSettingsFormValues = {
  organizationName: string
  defaultYear: number
  locale: string
  timezone: string
}

export type SaveAppSettingsInput = AppSettingsFormValues & {
  actorUid: string
}

const settingsCollectionName = 'settings'
const appSettingsDocId = 'app'

export const defaultAppSettingsValues: AppSettingsFormValues = {
  organizationName: '',
  defaultYear: new Date().getFullYear(),
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
}

function getAppSettingsRef() {
  return doc(firebaseDb, settingsCollectionName, appSettingsDocId)
}

export async function getAppSettings(): Promise<FirestoreRecord<AppSettingsDocument> | null> {
  return getTypedDocument(getAppSettingsRef(), appSettingsSchema)
}

export function toAppSettingsFormValues(
  settings: FirestoreRecord<AppSettingsDocument> | null | undefined,
): AppSettingsFormValues {
  if (!settings) {
    return defaultAppSettingsValues
  }

  return {
    organizationName: settings.organizationName,
    defaultYear: settings.defaultYear,
    locale: settings.locale,
    timezone: settings.timezone,
  }
}

export async function saveAppSettings({
  actorUid,
  organizationName,
  defaultYear,
  locale,
  timezone,
}: SaveAppSettingsInput) {
  const appSettingsRef = getAppSettingsRef()
  const existingSnapshot = await getDoc(appSettingsRef)
  const existingData = existingSnapshot.data()
  const now = serverTimestamp()

  await setDoc(
    appSettingsRef,
    {
      organizationName: organizationName.trim(),
      defaultYear,
      locale: locale.trim(),
      timezone: timezone.trim(),
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
      createdBy: existingData?.createdBy ?? actorUid,
      updatedBy: actorUid,
    },
    {
      merge: true,
    },
  )
}

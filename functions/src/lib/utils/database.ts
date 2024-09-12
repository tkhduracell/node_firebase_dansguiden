import * as admin from 'firebase-admin'

export type TableFn = (name: TableName) => admin.firestore.CollectionReference
export type BatchFn = () => admin.firestore.WriteBatch

export type TableName =
  'events' |
  'band_metadata' |
  'metadata_bands' |
  'metadata_dates' |
  'metadata_places' |
  'versions'

export type FirestoreFn = {
  table: TableFn;
  batch: BatchFn;
}

export function database(): FirestoreFn {
  const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}')

  admin.initializeApp({ projectId: config.projectId ?? 'dansguiden-b3a7d' })
  const db = admin.firestore()
  db.settings({ timestampsInSnapshots: true })

  return {
    table: (name: TableName) => db.collection((config.collection_prefix || '') + name),
    batch: () => db.batch()
  } as FirestoreFn
}

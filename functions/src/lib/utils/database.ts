import * as admin from 'firebase-admin'

export type TableFn = (name: string) => admin.firestore.CollectionReference
export type BatchFn = () => admin.firestore.WriteBatch

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
    table: (name: string) => db.collection((config.collection_prefix || '') + name),
    batch: () => db.batch()
  } as FirestoreFn
}

import * as admin from 'firebase-admin'

export type TableFn = (name: string) => admin.firestore.CollectionReference
export type BatchFn = () => admin.firestore.WriteBatch

export type FirestoreFn = {
  table: TableFn;
  batch: BatchFn;
}

export function database(): FirestoreFn {
  admin.initializeApp({ projectId: 'dansguiden-b3a7d' })
  const db = admin.firestore()
  db.settings({ timestampsInSnapshots: true })

  const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}')
  return {
    table: (name: string) => db.collection((config.collection_prefix || '') + name),
    batch: () => db.batch()
  } as FirestoreFn
}

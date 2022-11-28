import { firestore, initializeApp } from 'firebase-admin'

export type TableFn = (name: string) => firestore.CollectionReference
export type BatchFn = () => firestore.WriteBatch

export type FirestoreFn = {
  table: TableFn;
  batch: BatchFn;
}

export function database(): FirestoreFn {
  const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}')

  initializeApp({ projectId: config.projectId ?? 'dansguiden-b3a7d' })
  const db = firestore()
  db.settings({ timestampsInSnapshots: true })

  return {
    table: (name: string) => db.collection((config.collection_prefix || '') + name),
    batch: () => db.batch()
  } as FirestoreFn
}

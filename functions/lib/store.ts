import _ from 'lodash'

import * as admin from 'firebase-admin'

import { snapshotAsArray } from './utils'
import { TableFn } from './database'

export type PickerFn<T> = (a: any) => T
export type QueryFn = (x: admin.firestore.CollectionReference) => admin.firestore.Query

export async function getValues<T>(table: TableFn, tableName: string, optPicker: PickerFn<T>, optQuery: QueryFn) {
  const query: QueryFn = optQuery || _.identity
  const snapshot = await query(table(tableName)).get()
  return snapshotAsArray<T>(snapshot, optPicker)
}

export type Store<T> = {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<T>;
}

export function simpleKeyValue<T>(table: TableFn, tableName: string, merge: boolean): Store<T> {
  const metadata = table(tableName)
  return {
    get: (key: string) => metadata.doc(key)
      .get()
      .then(doc => doc.exists ? doc.data() as T : null),
    set: (key: string, value: any) => {
      console.log(`Updating ${key} => ${value}`)
      return metadata.doc(key)
        .set(value, { merge })
        .then(ignored => value)
    }
  }
}

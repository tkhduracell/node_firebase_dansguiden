import _ from 'lodash'

import * as admin from 'firebase-admin'

import { snapshotAsArray } from './utils'
import { TableFn, TableName } from './database'

export type PickerFn<V,T> = (a: V) => T
export type QueryFn = (x: admin.firestore.CollectionReference) => admin.firestore.Query

export async function getValues<T, V>(table: TableFn, tableName: TableName, optPicker: PickerFn<V, T>, optQuery: QueryFn): Promise<T[]> {
  const query: QueryFn = optQuery || _.identity
  const snapshot = await query(table(tableName)).get()
  return snapshotAsArray<T>(snapshot, data => optPicker(data as V))
}

export type Store<T> = {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<T>;
  name: string;
}

export function simpleKeyValue<T extends Record<string, any>>(table: TableFn, tableName: TableName, merge: boolean): Store<T> {
  const metadata = table(tableName)
  return {
    name: tableName,
    get: (key: string): Promise<T |null> => metadata.doc(key)
      .get()
      .then(doc => doc.exists ? doc.data() as T : null),
    set: (key: string, value: T): Promise<T> => {
      console.debug('Updating', key, ' => ', value)
      return metadata.doc(key)
        .set(value, { merge })
        .then(() => value)
    }
  }
}

import _ from 'lodash'

import * as admin from 'firebase-admin'

import { snapshotAsArray } from './utils'
import { TableFn } from './database'

export type PickerFn<V,T> = (a: V) => T
export type QueryFn = (x: admin.firestore.CollectionReference) => admin.firestore.Query

export async function getValues<T, V>(table: TableFn, tableName: string, optPicker: PickerFn<V, T>, optQuery: QueryFn): Promise<T[]> {
  const query: QueryFn = optQuery || _.identity
  const snapshot = await query(table(tableName)).get()
  return snapshotAsArray<T>(snapshot, data => optPicker(data as V))
}

export type Store<T> = {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<T>;
}

function hint (value: object): string {
  const json = JSON.stringify(value).split('').splice(0, 80).join('')
  return json.length > 80 ? `${json}...` : json
}

export function simpleKeyValue<T extends {}>(table: TableFn, tableName: string, merge: boolean): Store<T> {
  const metadata = table(tableName)
  return {
    get: (key: string): Promise<T |null> => metadata.doc(key)
      .get()
      .then(doc => doc.exists ? doc.data() as T : null),
    set: (key: string, value: T): Promise<T> => {
      console.log(`Updating '${key}' => ${hint(value)}`)
      return metadata.doc(key)
        .set(value, { merge })
        .then(() => value)
    }
  }
}

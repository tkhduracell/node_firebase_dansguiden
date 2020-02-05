import _ from 'lodash'
import firebase from 'firebase-admin'

/**
 * Helper functions
 */
export type Mapper<T> = (data: firebase.firestore.DocumentData) => T

export function snapshotAsArray<T>(snapshot: firebase.firestore.QuerySnapshot,
  optFn?: Mapper<T>,
  includeKey?: boolean): T[] {
  const output = [] as T[]
  const fn = optFn || _.identity
  snapshot.forEach(doc => {
    const data = fn(doc.data())
    if (_.isObject(data)) {
      const extension = includeKey ? {_id: doc.id} : {}
      output.push(_.merge(data, extension))
    } else if (data) {
      output.push(data)
    } else {
      debugger
    }
  })
  return output
}

export function snapshotAsObj<T>(snapshot: firebase.firestore.QuerySnapshot,
  optFn?: Mapper<T>): { [key: string]: T } {
  const output = {} as { [key: string]: T }
  const fn = optFn || _.identity
  snapshot.forEach(doc => {
    const data = fn(doc.data() as T)
    if (data) output[doc.id] = data
  })
  return output
}

export function zip<A,B>(a: A[], b: B[]): [A, B][] {
  return a.map((e, i) => {
    return [e, b[i]]
  })
}

export function zipAsObj<T>(keys: string[], values: T[]): { [key: string]: T } {
  const zipped = zip(keys, values)
  return Object.fromEntries(zipped)
}

export function removeNullValues<T>(input: T): T {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined)
  )
}

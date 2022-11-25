import { DanceEvent } from './../lib/types'
import { Metadata } from './../src/metadata'
import { firestore } from 'firebase-admin'
import { shuffle } from 'lodash'
import moment from 'moment'

class QueryMock<T> {
  data: T[]
  constructor(data: T[]) {
    this.data = data
  }

  from(): QueryMock<T> {return this}
  where(): QueryMock<T> {return this}
  orderBy(): QueryMock<T> {return this}
  limit(): QueryMock<T> {return this}
  get(): MockResult<T> {
    const datas = this.data.map(itm => {
      return { data: () => itm } as MockDoc<T>
    })
    return {
      forEach(fn: (itm: MockDoc<T>) => void) {
        datas.forEach(itm => fn(itm))
      }
    } as MockResult<T>
  }
  doc() {
    return {
      set(key: string, val: T) {
        return Promise.resolve({ [key]: val })
      },
      get() {
        return Promise.resolve({ exists: true })
      }
    }
  }
}

function queryMock(data: Partial<DanceEvent>[]) {
  return {
    tableFn: () => new QueryMock(shuffle(data) as DanceEvent[]) as unknown as Col,
    batchFn: () => ({
      update: (ref: Doc, data: any) => console.log(ref, '<=', data),
      commit: () => Promise.resolve()
    }) as unknown as Batch,
  }
}

type MockResult<T> = {
  forEach: (fn: (itm: MockDoc<T>) => void) => void;
}

type MockDoc<T> = {
  data: () => T;
}

type Col = firestore.CollectionReference
type Doc = firestore.DocumentReference
type Batch = firestore.WriteBatch

describe('Metadata', () => {
  const ones = { in_total: 1, in_180_days: 1, in_30_days: 1, in_7_days: 1, in_90_days: 1 }

  describe('update:dates', () => {

    it('should calulcate counts', async () => {

      const { tableFn, batchFn } = queryMock([{ date: '2022-01-01' }])

      const dates = await Metadata.dates(tableFn, batchFn)

      expect(dates).toHaveProperty('counts', {'2022-01-01': { count: 1 }})
    })
  })

  describe('update:places', () => {
    const emptySecrets = { places: { api_key: '' } }

    it('should calulcate counts', async () => {

      const { tableFn, batchFn } = queryMock([
        { place: 'place1', date: moment().format('YYYY-MM-DD') }
      ])

      const places = await Metadata.places(tableFn, batchFn, emptySecrets)

      expect(places).toHaveProperty('counts', { "place1": { ...ones } })
    })

    it('should bucket count dates', async () => {
      const f = 'YYYY-MM-DD'

      const { tableFn, batchFn } = queryMock([
        { place: 'place1', date: moment().add(1, 'days').format(f) },
        { place: 'place1', date: moment().add(4, 'days').format(f) },
        { place: 'place1', date: moment().add(16, 'days').format(f) },
        { place: 'place1', date: moment().add(64, 'days').format(f) },
        { place: 'place1', date: moment().add(256, 'days').format(f) }
      ])

      const places = await Metadata.places(tableFn, batchFn, emptySecrets)
      expect(places).toHaveProperty('counts', {
        "place1": {
          in_7_days: 2,
          in_30_days: 3,
          in_90_days: 4,
          in_180_days: 4,
          in_total: 5
        }
      })
    })
  })

  describe('update:bands', () => {
    const secrets = { spotify: { client_id: '', client_secret: '' } }

    it('should bucket count dates', async () => {
      const f = 'YYYY-MM-DD'

      const { tableFn, batchFn } = queryMock([
        { band: 'band1', date: moment().add(1, 'days').format(f) },
        { band: 'band1', date: moment().add(4, 'days').format(f) },
        { band: 'band1', date: moment().add(16, 'days').format(f) },
        { band: 'band1', date: moment().add(64, 'days').format(f) },
        { band: 'band1', date: moment().add(256, 'days').format(f) }
      ])

      const bands = await Metadata.bands(tableFn, batchFn, secrets)

      expect(bands).toHaveProperty('counts', {
        "band1": {
          in_7_days: 2,
          in_30_days: 3,
          in_90_days: 4,
          in_180_days: 4,
          in_total: 5
        }
      })
      expect(bands).toHaveProperty('spotify', {
        "band1": {
          id: undefined,
          image_large: undefined,
          image_small: undefined,
          name: undefined,
        }
      })
    })
  })
})

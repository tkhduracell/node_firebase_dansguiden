import { DanceEvent } from './../lib/types'
import { Metadata } from './../src/metadata'
import firebase from 'firebase-admin'
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
      }
    }
  }
}

function queryMock(data: Partial<DanceEvent>[]): () => Col {
  return () => new QueryMock(shuffle(data) as DanceEvent[]) as unknown as Col
}

type MockResult<T> = {
  forEach: (fn: (itm: MockDoc<T>) => void) => void;
}

type MockDoc<T> = {
  data: () => T;
}

type Col = firebase.firestore.CollectionReference

describe('Metadata', () => {
  const ones = { in180Days: 1, in30Days: 1, in7Days: 1, in90Days: 1 }

  describe('update:dates', () => {

    it('should calulcate counts', async () => {

      const data  = queryMock([{ date: '2022-01-01' }])

      const dates = await Metadata.dates(data)

      expect(dates).toStrictEqual({'2022-01-01': { count: 1 }})
    })
  })

  describe('update:places', () => {
    const emptySecrets = { places: { api_key: '' } }

    it('should calulcate counts', async () => {

      const data  = queryMock([
        { place: 'place1', date: moment().format('YYYY-MM-DD') }
      ])

      const places = await Metadata.places(data, emptySecrets)

      expect(places).toStrictEqual({ "place1": { ...ones } })

    })

    it('should bucket count dates', async () => {
      const f = 'YYYY-MM-DD'

      const data = queryMock([
        { place: 'place1', date: moment().add(1, 'days').format(f) },
        { place: 'place1', date: moment().add(4, 'days').format(f) },
        { place: 'place1', date: moment().add(16, 'days').format(f) },
        { place: 'place1', date: moment().add(64, 'days').format(f) },
        { place: 'place1', date: moment().add(256, 'days').format(f) }
      ])

      const places = await Metadata.places(data, emptySecrets)
      expect(places).toStrictEqual({
        "place1": {
          in7Days: 2,
          in30Days: 3,
          in90Days: 4,
          in180Days: 4
        }
      })
    })
  })

  describe('update:bands', () => {
    const secrets = { spotify: { client_id: '', client_secret: '' } }

    it('should bucket count dates', async () => {
      const f = 'YYYY-MM-DD'

      const data = queryMock([
        { band: 'band1', date: moment().add(1, 'days').format(f) },
        { band: 'band1', date: moment().add(4, 'days').format(f) },
        { band: 'band1', date: moment().add(16, 'days').format(f) },
        { band: 'band1', date: moment().add(64, 'days').format(f) },
        { band: 'band1', date: moment().add(256, 'days').format(f) }
      ])

      const bands = await Metadata.bands(data, secrets)
      expect(bands).toStrictEqual({
        "band1": { in7Days: 2, in30Days: 3, in90Days: 4, in180Days: 4,
          spotify_id: undefined,
          spotify_image_large: undefined,
          spotify_image_small: undefined,
          spotify_name: undefined, }
      })
    })
  })
})

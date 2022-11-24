import { DanceEvent } from './../lib/types'
import { Metadata } from './../src/metadata'
import firebase from 'firebase-admin'
import { range, shuffle } from 'lodash'
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

type MockResult<T> = {
  forEach: (fn: (itm: MockDoc<T>) => void) => void;
}

type MockDoc<T> = {
  data: () => T;
}

type Col = firebase.firestore.CollectionReference

describe('Metadata', () => {

  describe('update', () => {
    it('should calulcate counts', async () => {

      const tbl  = () => new QueryMock<DanceEvent>([{
        place: 'place1',
        band: 'band1',
        date: '2022-01-01',

        city: 'city of place1',
        county: 'count of place1',
        region: 'region of place1'
      } as DanceEvent]) as unknown as Col
      const ones = { in180Days: 1, in30Days: 1, in7Days: 1, in90Days: 1 }
      const a = await Metadata.update(tbl, { places_api_key: '' })
      expect(a).toHaveLength(3)

      const [places, bands, dates] = a

      expect(dates).toStrictEqual({'2022-01-01': { count: 1 }})
      expect(bands).toStrictEqual({"band1": ones})
      expect(places).toStrictEqual({
        "place1": {
          ...ones,
          city: 'city of place1',
          county: 'count of place1',
          region: 'region of place1'
        }
      })

    })

    it('should calculcate location by majority', async () => {

      const data = [
        ...range(51).map(() => ({
          place: 'place1',
          city: 'city of place1',
          county: 'count of place1',
          region: 'region of place1'
        })),
        ...range(50).map(() => ({
          place: 'place1',
          city: 'wrong city of place1',
          county: 'wrong count of place1',
          region: 'wrong region of place1'
        }))
      ] as DanceEvent[]

      const tbl  = () => new QueryMock<DanceEvent>(
        shuffle(data)
      ) as unknown as Col

      const [places] = await Metadata.update(tbl, { places_api_key: '' })

      expect(places).toStrictEqual({
        "place1": {
          city: 'city of place1',
          county: 'count of place1',
          region: 'region of place1'
        }
      })
    })

    it('should bucket count dates', async () => {
      const f = 'YYYY-MM-DD'

      const data = [
        { band: 'band1', date: moment().add(1, 'days').format(f) },
        { band: 'band1', date: moment().add(4, 'days').format(f) },
        { band: 'band1', date: moment().add(16, 'days').format(f) },
        { band: 'band1', date: moment().add(64, 'days').format(f) },
        { band: 'band1', date: moment().add(256, 'days').format(f) }
      ] as DanceEvent[]

      const tbl  = () => new QueryMock<DanceEvent>(
        shuffle(data)
      ) as unknown as Col

      const [,bands] = await Metadata.update(tbl, { places_api_key: '' })
      expect(bands).toStrictEqual({
        "band1": {
          in7Days: 2,
          in30Days: 3,
          in90Days: 4,
          in180Days: 4,
        }
      })
    })
  })
})

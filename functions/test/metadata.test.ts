import { DanceEvent } from './../lib/types'
import { Metadata } from './../src/metadata'
import firebase from 'firebase-admin'
import { range, shuffle } from 'lodash'

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
      set(val: T) {
        return Promise.resolve(val)
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

function silent (): void {}

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
      const ones = {
        in180Days: 1,
        in30Days: 1,
        in7Days: 1,
        in90Days: 1,
      }
      const a = await Metadata.update(tbl, silent)
      expect(a).toHaveLength(3)

      const [places, bands, dates] = a
      expect(dates).toHaveLength(1)
      {
        const [counts] = dates
        expect(counts).toStrictEqual({'2022-01-01': { count: 1 }})
      }

      expect(bands).toHaveLength(1)
      {
        const [counts] = bands
        expect(counts).toStrictEqual({"band1": ones})
      }

      expect(places).toHaveLength(2)
      {
        const [counts, location] = places

        expect(counts).toStrictEqual({"place1": ones})
        expect(location).toStrictEqual({
          "place1": {
            city: 'city of place1',
            county: 'count of place1',
            region: 'region of place1'
          }
        })
      }
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

      const [[,places]] = await Metadata.update(tbl, silent)

      expect(places).toStrictEqual({
        "place1": {
          city: 'city of place1',
          county: 'count of place1',
          region: 'region of place1'
        }
      })
    })
  })
})

import { Bands } from '../src/lib/spotify'
import { PlacessParser } from '../src/lib/danslogen/places'
import { DanceEvent } from '../src/lib/types'
import { Metadata } from './../src/metadata'
import { CollectionReference, DocumentReference, WriteBatch } from 'firebase-admin/firestore'
import { shuffle } from 'lodash'
import moment from 'moment'
import { PlacesApi } from '../src/lib/google/maps/places_api'

type Col = CollectionReference
type Doc = DocumentReference
type Batch = WriteBatch

class QueryMock<T> {
  data: T[]
  existingKeys: string[]
  constructor(data: T[], existingKeys: string[]) {
    this.data = data
    this.existingKeys = existingKeys
  }
  listDocuments(): Promise<MockDocuments> { return Promise.resolve(this.existingKeys.map(id => ({ id }))) }
  from(): QueryMock<T> { return this }
  where(): QueryMock<T> { return this }
  orderBy(): QueryMock<T> { return this }
  limit(): QueryMock<T> { return this }
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

function queryMock(data: Partial<DanceEvent>[], existingKeys: string[] = []) {
  return {
    tableFn: () => new QueryMock(shuffle(data) as DanceEvent[], existingKeys) as unknown as Col,
    batchFn: () => ({
      set: (ref: Doc, data: any) => console.log(ref, '<=', data),
      commit: () => Promise.resolve()
    }) as unknown as Batch,
  }
}

type MockResult<T> = {
  forEach: (fn: (itm: MockDoc<T>) => void) => void;
}

type MockDocuments = {
  id: string
}[]

type MockDoc<T> = {
  data: () => T;
}

describe('Metadata', () => {
  beforeEach(() => {
    jest.spyOn(PlacesApi, 'search').mockImplementation(async () => {
      return [
        {
          name: 'place1', types: [], place_id: '123', formatted_address: 'adr1', photos: [
            { height: 0, width: 0, html_attributions: ['attr1'], photo_reference: 'ref1' }
          ]
        }
      ]
    })
    jest.spyOn(PlacessParser, 'parse').mockImplementation(async () => {
      return [
        { name: 'place1', city: 'city1', county: 'county1', region: 'region1', facebook_url: 'fb', website_url: 'web' }
      ]
    })
    jest.spyOn(Bands, 'getArtist').mockImplementation(async () => {
      return undefined
    })
  })

  const ones = { in_total: 1, in_180_days: 1, in_30_days: 1, in_7_days: 1, in_90_days: 1 }

  describe('update:dates', () => {

    it('should calulcate counts', async () => {

      const { tableFn, batchFn } = queryMock([{ date: '2022-01-01' }])

      const dates = await Metadata.dates(tableFn, batchFn)

      expect(dates).toHaveProperty('counts', { '2022-01-01': { total: 1 } })
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

    it('should have place info', async () => {

      const { tableFn, batchFn } = queryMock([
        { place: 'place1', date: moment().format('YYYY-MM-DD') }
      ])

      const places = await Metadata.places(tableFn, batchFn, emptySecrets)

      expect(places).toHaveProperty('general', {
        "place1": {
          name: "place1",
          facebook_url: "fb",
          website_url: "web",
        }
      })
    })

    it('should have places_api info', async () => {

      const { tableFn, batchFn } = queryMock([
        { place: 'place1', date: moment().format('YYYY-MM-DD') }
      ])

      const places = await Metadata.places(tableFn, batchFn, emptySecrets)

      expect(places).toHaveProperty('places_api', {
        "place1": {
          id: "123",
          name: "place1",
          address: "adr1",
          photo_attributions: ["attr1"],
          photo_large: "https://maps.googleapis.com/maps/api/place/photo?photo_reference=ref1&maxheight=512&maxwith=512&key=",
          photo_small: "https://maps.googleapis.com/maps/api/place/photo?photo_reference=ref1&maxheight=128&maxwith=128&key="
        }
      })
    })


    it('should NOT lookup places if exist', async () => {
      const { tableFn, batchFn } = queryMock([
        { place: 'place1', date: moment().format('YYYY-MM-DD') },
        { place: 'place2', date: moment().format('YYYY-MM-DD') }
      ], ['place1'])

      const places = await Metadata.places(tableFn, batchFn, emptySecrets)
      expect(places).toHaveProperty('places_api', {
        "place2": {
          id: "123",
          name: "place1",
          address: "adr1",
          photo_attributions: ["attr1"],
          photo_large: "https://maps.googleapis.com/maps/api/place/photo?photo_reference=ref1&maxheight=512&maxwith=512&key=",
          photo_small: "https://maps.googleapis.com/maps/api/place/photo?photo_reference=ref1&maxheight=128&maxwith=128&key="
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

// Libraries

import _ from 'lodash'
import moment from 'moment'
import admin from 'firebase-admin'
import fetch from 'node-fetch'

// Dependencies

import { simpleKeyValue, getValues, Store } from '../lib/store'
import { TableFn } from '../lib/database'
import { DanceEvent } from '../lib/types'
import { LogFn } from '../lib/log'

export type Counters = {
  [key: string]: Counter;
};

export type Counter = {
  count: number;
  in7Days: number;
  in30Days: number;
  in90Days: number;
  in180Days: number;
}

export type EntityCounters = {
  bands: Counters;
  places: Counters;
  dates: Counters;
};

type PlacesApiResponse = {
  candidates: PlaceApiSearchCandidate[]
  status: "OK"
}

type PlaceApiSearchCandidate = {
  formatted_address: string
  name: string
  photos: PlaceApiPhoto[]
  types: string[]
}

type PlaceApiPhoto = {
  height: number
  html_attributions: string[]
  photo_reference: string
  width: number
}


function counter(key: keyof DanceEvent): (values: DanceEvent[]) => Record<string, Partial<Counter>> {
  return (values: DanceEvent[]) => {
    const counts = _.countBy(values.map(e => e[key]))
    return _.merge(
      _.mapValues(counts, o => ({ count: o })),
    )
  }
}

function histogram(key: keyof DanceEvent): (values: DanceEvent[]) => Record<string, Partial<Counter>> {
  return (values: DanceEvent[]) => {

    const inDays = (days: number) => {
      const limit = moment().utc().startOf('day').add(days, 'days')
      return (e: { date: string} ) => {
        return moment(e.date, moment.ISO_8601).isBefore(limit)
      }
    }

    const in7Days = _.countBy(values.filter(inDays(7)), e => e[key])
    const in30Days = _.countBy(values.filter(inDays(30)), e => e[key])
    const in90Days = _.countBy(values.filter(inDays(90)), e => e[key])
    const in180Days = _.countBy(values.filter(inDays(180)), e => e[key])

    return _.merge(
      _.mapValues(in7Days, o => ({ in7Days: o })),
      _.mapValues(in30Days, o => ({ in30Days: o })),
      _.mapValues(in90Days, o => ({ in90Days: o })),
      _.mapValues(in180Days, o => ({ in180Days: o })),
    )
  }
}

type Location = { city: string, county: string, region: string }
function inferLocation(): (values: DanceEvent[]) => Record<string, Location> {
  return (values: DanceEvent[]) => {
    const places: Pick<DanceEvent, 'place' | 'city' | 'county' | 'region'>[] = values.map(e => _.pick(e, 'place', 'county', 'city', 'region'))
    const groups = _.groupBy(places, p => p.place)
    return _.mapValues(groups, group => {

      const [key,] = _(group)
        .countBy(g => [g.city, g.county, g.region].join('|'))
        .entries()
        .maxBy(([, count]) => count) as [string, number]

      const [city, county, region] = key.split('|')

      return { city, county, region}
    })
  }
}

type PlacesInfo = {
  name: string,
  address: string,
  photo_small?: string
  photo_large?: string
} | Record<string, never>

function placesApiImage(apiKey: string): (values: DanceEvent[]) => Promise<Record<string, PlacesInfo>> {
  const BASE_URL = 'https://maps.googleapis.com/maps/api/place'

  function search(query: string) {
    const params = new URLSearchParams()
    params.append('fields', 'name,formatted_address,photos,types')
    params.append('key', apiKey)
    params.append('input', query)
    params.append('inputtype', 'textquery')
    params.append('language', 'sv')
    return `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`
  }

  function photo(ref?: string, size = '512') {
    const param = new URLSearchParams()
    param.append('photo_reference', ref ?? '')
    param.append('maxheight', size)
    param.append('maxwith', size)
    param.append('key', apiKey)
    return `https://maps.googleapis.com/maps/api/place/photo?${param.toString()}`
  }

  return async (values: DanceEvent[]) => {
    const places = values.map(e => _.pick(e, 'place', 'county', 'city', 'region'))

    const out: Record<string, PlacesInfo> = {}
    for (const { place, city, region } of _.uniqBy(places, p => p.place)) {
      out[place] = {}

      const query = [place, city, region, 'Sverige'].join(' ')

      const response = await fetch(search(query))
      if (response.ok) {
        const { candidates } = await response.json() as PlacesApiResponse
        if (candidates && candidates.length > 0) {
          const [first] = candidates
          const ref = first.photos?.find(() => true)?.photo_reference
          out[place] = {
            address: first.formatted_address,
            name: first.name,
            photo_small: ref ? photo(ref, '128') : undefined,
            photo_large: ref ? photo(ref, '1024') : undefined
          }
        }
      }
    }
    return out
  }
}

export class Metadata {

  static async update(table: TableFn, log: LogFn, secrets: { places_api_key: string }) {
    const today = moment.utc().format("YYYY-MM-DD")
    const future = (col: admin.firestore.CollectionReference): admin.firestore.Query => {
      return col.where('date', '>=', today)
    }

    log('Updating metadata table...')

    type MaybePromise<T> = T | Promise<T>
    type AggFn<T> = (all: DanceEvent[]) => MaybePromise<Record<string, Partial<T>>>

    async function updater<T>(db: Store<T>, agg: AggFn<T>[]) {
      const values = await getValues<DanceEvent, DanceEvent>(table, 'events', e => e, future)

      log(`Updating ${db.name} using ${values.length} events`)

      const updates = await agg.map(fn => fn(values))
      const out: Record<string, any> = {}
      for (const update of updates) {
        for (const [k,v] of Object.entries(update)) {
          out[k] = _.merge({}, out[k], v)
        }
      }
      await Object.entries(out)
        .map(([k, v]) => db.set(k, v as T))
      return out
    }

    return await Promise.all([
      updater<Counter & Location & PlacesInfo>(simpleKeyValue<Counter & Location & PlacesInfo>(table, 'metadata_places', true, log), [
        histogram('place'),
        inferLocation(),
        placesApiImage(secrets.places_api_key)
      ]),
      updater(simpleKeyValue<Counter>(table, 'metadata_bands', true, log), [histogram('band')]),
      updater(simpleKeyValue<Counter>(table, 'metadata_dates', true, log), [counter('date')]),
    ])
  }
}

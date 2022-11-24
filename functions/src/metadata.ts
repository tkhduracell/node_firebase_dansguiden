// Libraries

import _ from 'lodash'
import moment from 'moment'
import admin from 'firebase-admin'
import fetch from 'node-fetch'

// Dependencies

import { simpleKeyValue, getValues, Store } from '../lib/store'
import { TableFn } from '../lib/database'
import { Artist } from './../lib/types'
import { DanceEvent } from '../lib/types'
import { PlacessParser } from './../lib/places'
import { BandUpdater } from './band_updater'

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

type PlacesInfo = { city: string, county: string, region: string, website_url?: string, facebook_url?: string } | Record<string, never>
function placesInfo(): (values: DanceEvent[]) => Promise<Record<string, PlacesInfo>> {
  return async (values: DanceEvent[]) => {
    const info = await PlacessParser.parse()
    const infoByName = _.keyBy(info, 'name')
    const groups = _.keyBy(values, 'place')
    return _.mapValues(groups, ({ place }) => {
      if (place in infoByName) {
        return infoByName[place]
      }
      return {}
    })
  }
}

export function inferLocation(): (values: DanceEvent[]) => Record<string, PlacesInfo> {
  return (values: DanceEvent[]) => {
    const places: Pick<DanceEvent, 'place' | 'city' | 'county' | 'region'>[] = values.map(e => _.pick(e, 'place', 'county', 'city', 'region'))
    const groups = _.groupBy(places, p => p.place)
    return _.mapValues(groups, group => {

      const [key,] = _(group)
        .countBy(g => [g.city, g.county, g.region].join('|'))
        .entries()
        .maxBy(([, count]) => count) as [string, number]

      const [city, county, region] = key.split('|')

      return { city, county, region }
    })
  }
}

function blacklist<T, K>(valFn: (e: T) => K[], ...exclude: K[]): (e: T) => boolean {
  return (t: T) => !valFn(t).some(p => exclude.includes(p))
}

type PlacesApiInfo = {
  name: string,
  address: string,
  photo_small?: string
  photo_large?: string
} | Record<string, never>

function placesApiImage(apiKey: string): (values: DanceEvent[]) => Promise<Record<string, PlacesApiInfo>> {
  const BASE_URL = 'https://maps.googleapis.com/maps/api/place'

  function search(query: string) {
    const params = new URLSearchParams()
    params.append('fields', 'name,formatted_address,photos,types')
    params.append('key', apiKey)
    params.append('input', query)
    params.append('inputtype', 'textquery')
    params.append('language', 'sv')
    return `${BASE_URL}/findplacefromtext/json?${params.toString()}`
  }

  function photo(ref?: string, size = '512') {
    const param = new URLSearchParams()
    param.append('photo_reference', ref ?? '')
    param.append('maxheight', size)
    param.append('maxwith', size)
    param.append('key', apiKey)
    return `${BASE_URL}/photo?${param.toString()}`
  }

  return async (values: DanceEvent[]) => {
    const places = values.map(e => _.pick(e, 'place', 'county', 'city', 'region'))

    const out: Record<string, PlacesApiInfo> = {}
    for (const { place, region } of _.uniqBy(places, p => p.place)) {
      out[place] = {}

      const query = [place, region, 'Sverige'].join(', ')

      console.log('Looking Google Maps place', query)
      const response = await fetch(search(query))
      console.log('Response ', query, 'ok:', response.ok, 'code:', response.status, 'message', response.statusText)
      if (response.ok) {
        const { candidates } = await response.json() as PlacesApiResponse
        console.log('Response ', query, 'candidates', candidates.length)
        if (candidates && candidates.length > 0) {
          const [first] = candidates.filter(blacklist(c => c.types, 'locality'))
          if (first) {
            const ref = first.photos?.find(() => true)?.photo_reference
            const photos = ref ?  {
              photo_small: photo(ref, '128'),
              photo_large: photo(ref, '512')
            } : {}

            out[place] = {
              address: first.formatted_address,
              name: first.name,
              ...photos
            }
          }
        }
      }
    }
    return out
  }
}

type SpotifyInfo = Artist | Record<string, never>
type SpotifySecrets = { client_id: string; client_secret: string }

function spotifyApi(secrets: SpotifySecrets): (values: DanceEvent[]) => Promise<Record<string, SpotifyInfo>> {
  return async (values: DanceEvent[]) => {
    const bands = values.map(e => _.pick(e, 'band'))

    const out: Record<string, SpotifyInfo> = {}
    for (const { band } of _.uniqBy(bands, p => p.band)) {
      const info = await BandUpdater.get(secrets, band)
      out[band] = info ?? {}
    }
    return out
  }
}

type PlacesSecerts = { api_key: string }

type MaybePromise<T> = T | Promise<T>
type AggFn<T> = (all: DanceEvent[]) => MaybePromise<Record<string, Partial<T>>>

async function updater<T>(db: Store<T>, agg: AggFn<T>[], table: TableFn, limit?: number) {
  const today = moment.utc().format("YYYY-MM-DD")
  const future = (col: admin.firestore.CollectionReference): admin.firestore.Query => {
    if (limit) {
      return col.where('date', '>=', today).limit(limit)
    } else {
      return col.where('date', '>=', today)
    }
  }

  const values = await getValues<DanceEvent, DanceEvent>(table, 'events', e => e, future)

  console.log(`Updating ${db.name} using ${values.length} events`)

  const updates = await Promise.all(agg.map(fn => fn(values)))
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

type PlaceMetadata = Counter & PlacesInfo & PlacesApiInfo
type BandMetadata = Counter & SpotifyInfo
type DateMetadata = Counter

export class Metadata {

  static async places(table: TableFn, secrets: { places: PlacesSecerts }, limit?: number): Promise<Record<string, PlaceMetadata>> {
    return updater<PlaceMetadata>(simpleKeyValue<PlaceMetadata>(table, 'metadata_places', true), [
      histogram('place'),
      // inferLocation(),
      placesInfo(),
      placesApiImage(secrets.places.api_key),
    ], table, limit)
  }

  static async bands(table: TableFn, secrets: { spotify: SpotifySecrets }, limit?: number): Promise<Record<string, BandMetadata>> {
    return updater<BandMetadata>(simpleKeyValue<BandMetadata>(table, 'metadata_bands', true), [
        histogram('band'),
        spotifyApi(secrets.spotify)
      ], table, limit)
  }

  static async dates(table: TableFn, limit?: number): Promise<Record<string, DateMetadata>> {
    return updater(simpleKeyValue<Counter>(table, 'metadata_dates', true), [
      counter('date')
    ], table, limit)
  }
}

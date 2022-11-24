// Libraries

import _ from 'lodash'
import moment from 'moment'
import fetch from 'node-fetch'

// Dependencies

import { firestore } from 'firebase-admin'
import { getValues } from '../lib/store'
import { BatchFn, TableFn } from '../lib/database'
import { DanceEvent } from '../lib/types'
import { PlacessParser } from './../lib/places'
import { BandUpdater } from './band_updater'

export type Counter = {
  in_total: number;
  in_7_Days: number;
  in_30_days: number;
  in_90_days: number;
  in_180_days: number;
}

export type SimpleCounter = {
  in_total: number;
}

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


function counter(key: keyof DanceEvent): (values: DanceEvent[]) => Promise<Record<string, Partial<Counter>>> {
  return async (values: DanceEvent[]) => {
    const counts = _.countBy(values.map(e => e[key]))
    return _.merge(_.mapValues(counts, o => ({ count: o })))
  }
}

function histogram(key: keyof DanceEvent): (values: DanceEvent[]) => Promise<Record<string, Partial<Counter>>> {
  return async (values: DanceEvent[]) => {

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
    const inTotal = _.countBy(values, e => e[key])

    return _.merge(
      _.mapValues(inTotal, o => ({ in_total: o })),
      _.mapValues(in7Days, o => ({ in_7_days: o })),
      _.mapValues(in30Days, o => ({ in_30_days: o })),
      _.mapValues(in90Days, o => ({ in_90_days: o })),
      _.mapValues(in180Days, o => ({ in_180_days: o })),
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
  photo_small: string
  photo_large: string
}

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

            out[place] = _.omitBy({
              address: first.formatted_address,
              name: first.name,
              photo_small: ref ? photo(ref, '128') : undefined,
              photo_large: ref ? photo(ref, '512') : undefined
            }, _.isUndefined) as PlacesApiInfo
          }
        }
      }
    }
    return out
  }
}

type SpotifyInfo = {
  spotify_id?: string,
  spotify_name?: string,
  spotify_image_small?: string
  spotify_image_large?: string
}

type SpotifySecrets = { client_id: string; client_secret: string }

function spotifyApi(secrets: SpotifySecrets): (values: DanceEvent[]) => Promise<Record<string, SpotifyInfo>> {
  return async (values: DanceEvent[]) => {
    const bands = values.map(e => _.pick(e, 'band'))

    const out: Record<string, SpotifyInfo> = {}
    for (const { band } of _.uniqBy(bands, p => p.band)) {
      const { id, name, images } = await BandUpdater.get(secrets, band) ?? {}
      out[band] = _.omitBy({
        spotify_id: id,
        spotify_name: name,
        spotify_image_small: _.minBy(images, i => Math.abs(64 - (i.width ?? Number.MAX_VALUE)) )?.url,
        spotify_image_large: _.minBy(images, i => Math.abs(640 - (i.width ?? Number.MAX_VALUE)) )?.url
      }, _.isUndefined)
      await new Promise((res) => setTimeout(res, 500))
    }
    return out
  }
}

type PlacesSecerts = { api_key: string }

type MetadataTypes = 'dates' | 'places' | 'bands'
type Table = `metadata_${MetadataTypes}`

async function updater<T, U extends Record<string, T>, Data extends Record<string, Promise<U>>>(table: TableFn, batch: BatchFn, tbl: Table, data: Data): Promise<Record<string, U> | undefined> {
  const out: Record<string, U> = {}
  for (const [wrapperKey, valuePromise] of Object.entries(data)) {
    const values = await valuePromise
    const chunks = _.chunk(Object.entries(values), 500)
    for (const chunk of chunks) {
      const s = batch()
      for (const [key, value] of chunk) {

        const prev = await table(tbl).doc(key).get()
        if (prev.exists) {
          s.update(table(tbl).doc(key), {
            [wrapperKey]: value,
            updated_at: firestore.FieldValue.serverTimestamp()
          })
        } else {
          s.create(table(tbl).doc(key), {
            [wrapperKey]: value,
            created_at: firestore.FieldValue.serverTimestamp()
          })
        }
      }
      await s.commit()
    }

    out[wrapperKey] = values
  }

  return out
}

function getevents(table: TableFn, limit?: number) {
  const today = moment.utc().format("YYYY-MM-DD")
  return getValues<DanceEvent, DanceEvent>(table, 'events', e => e, collection => {
    if (limit) {
      return collection.where('date', '>=', today).limit(limit)
    } else {
      return collection.where('date', '>=', today)
    }
  })
}

export class Metadata {

  static async places(table: TableFn, batch: BatchFn, secrets: { places: PlacesSecerts }, limit?: number) {
    const tbl = 'metadata_places'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    return updater(table, batch, tbl, {
      counts: histogram('place')(events),
      general: placesInfo()(events),
      places_api: placesApiImage(secrets.places.api_key)(events),
    })
  }

  static async bands(table: TableFn, batch: BatchFn, secrets: { spotify: SpotifySecrets }, limit?: number) {
    const tbl = 'metadata_bands'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    return updater(table, batch, tbl, {
      counts: histogram('band')(events),
      spotify: spotifyApi(secrets.spotify)(events)
    })
  }

  static async dates(table: TableFn, batch: BatchFn, limit?: number) {
    const tbl = 'metadata_dates'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    return updater(table, batch, tbl, {
      counts: counter('date')(events)
    })
  }
}

// Libraries

import _ from 'lodash'
import moment, { ISO_8601 } from 'moment'
import admin, {firestore} from 'firebase-admin'

// Dependencies
import * as events from '../lib/events'
import { BandUpdater } from './band_updater'
import * as eventsDecorator from '../lib/events_decorator'

import { COLUMNS } from '../lib/events'
import { fetchLatestVersion, versionSort, Version } from '../lib/versions'
import { simpleKeyValue, getValues } from '../lib/store'
import { snapshotAsArray } from '../lib/utils'
import { BatchFn, TableFn } from '../lib/database'
import { Artist, DanceEvent } from '../lib/types'

async function batchDeleteOverlappingEvents(batch: BatchFn, table: TableFn, output: InternalDanceEvent[]): Promise<firestore.WriteResult[]> {
  const dates = output.filter(event => event.type === 'event')
    .map(e => e.data.date)

  console.log(`Starting batch delete between ${_.min(dates)} <-> ${_.max(dates)}`)
  const eventsResult = await table('events')
    .where('date', '>=', _.min(dates))
    .where('date', '<=', _.max(dates))
    .get()

  console.log(`Found ${eventsResult.size} overlapping events`)
  const events = snapshotAsArray<string>(eventsResult, e => e._id)

  const commits = _.chunk(events, 500).map((chunk, idx) => {
    const deleteBatch = batch()
    chunk.forEach(id => {
      console.debug('Deleting event ' + id)
      const ref = table('events').doc(id)
      deleteBatch.delete(ref)
    })
    return deleteBatch.commit()
      .then(result => {
        console.debug('Batch#' + idx + ' deletion done!')
        return result
      })
  })

  return _.flatten(await Promise.all(commits))
}

async function batchWriteFn<T, V>(batch: BatchFn, table: firestore.CollectionReference, output: T[], kvFn: ObjectExtractor<T, V>): Promise<firestore.WriteResult[]> {

  const writes = _.chunk(output, 500).map(async (chunk, idx) => {
      console.log('Batch#' + idx + ' creating...')
      const batcher = batch()
      chunk.forEach(source => {
        const result = kvFn(source)
        if (result && _.isObject(result)) {
          const { key, value } = result as KV<V>
          const document = _.merge(value, {
            _id: key
          })
          console.log('Adding change to ' + key)
          const ref = table.doc(key)
          batcher.set(ref, document, { merge: true })
        }
      })

      const writeResult = await batcher.commit()
      console.log(`Batch# ${idx} write done!`)

      return writeResult
    })
  return _.flatten(await Promise.all(writes))
}

function batchWriteEvents (batch: BatchFn, tableFn: TableFn, output: InternalDanceEvent[]): Promise<firestore.WriteResult[]>  {
  const table = tableFn('events')

  return batchWriteFn(batch, table, output, (source: InternalDanceEvent) => {
    if (source.type !== 'event') {
      console.log(`Ignoring non-event ${source.type} item...`)
      return false
    }

    if (!moment.utc(source.data.date, ISO_8601).isValid()) {
      console.log('Invalid date: ' + JSON.stringify(source))
      return false
    }

    const event = _.pick(source.data, COLUMNS) as DanceEvent
    const date = event.date
    const key = _([date, event.band]).map(_.snakeCase).join('_')
    const value = _.merge(event, {
      _id: key,
      date,
      "updated_at": moment().toDate().getTime(),
      "updated_at_pretty": moment().toISOString()
    })
    //_.forEach(value, (v, k) => {
    //  if (_.isNil(v) || _.isNull(v) || _.isUndefined(v)) {
    //    delete (value as {[key: string]: unknown})[k]
    //  }
    //})
    return {key, value}
  })
}

type KV<T> = { key: string; value: T }
type ObjectExtractor<T, V> = (t: T) => KV<V> | boolean

export type SpotifyClientConfig = {
  client_id: string,
  client_secret: string
}

export class Bands {
  static async update(table: TableFn, spotify: SpotifyClientConfig): Promise<(Artist|null)[]> {
    const bandsKeyValueStore = simpleKeyValue<Artist>(table, 'band_metadata', true)

    function onlyNewEvents(tbl: admin.firestore.Query): admin.firestore.Query {
      return tbl.where('date', '>=', '2022-01-01')
    }

    console.log('Getting current bands in events')
    const allBands = await getValues<string, DanceEvent>(table, 'events', event => event.band, onlyNewEvents)
    const bands = _.uniq(allBands).sort() // debug: .slice(15, 20)

    console.log('Starting band update')
    const updates = await BandUpdater.run(bandsKeyValueStore, spotify, bands)

    console.log('Completed band metadata update!')
    console.log(`Wrote ${_.size(updates)} bands`)

    return updates
  }
}

export type InternalDanceEvent = events.InternalEvent<DanceEvent>

export type EventQueryParams = { from: string; to: string;[key: string]: string }

export class Events {

  static async update(batch: BatchFn, table: TableFn): Promise<InternalDanceEvent[]> {

    console.log('Parsing all events from external source')
    const allEvents = await events.parse()
    console.log(`Completed parsing, found ${_.size(allEvents)} events!`)

    console.log('Starting overlap removal')
    await batchDeleteOverlappingEvents(batch, table, allEvents)
    console.log('Completed overlap removal!')

    console.log('Starting event writes')
    const batchWrite = await batchWriteEvents(batch, table, allEvents)
    console.log(`Completed event writes, wrote ${_.size(batchWrite)} events!`)

    console.log('Starting event metadata updates')
    await eventsDecorator.update(batch, table)
    console.log('Completed event metadata update!')

    return allEvents
  }

  static async fetch(table: TableFn, params: EventQueryParams): Promise<DanceEvent[]> {
    console.log(`Fetch events using params: `, params)
    let query = table('events') as firestore.Query

    // default to today
    query = query
      .where('date', '>=', params.from || moment().format('YYYY-MM-DD'))
      .where('date', '<=', params.to || moment().add(7, 'days').format('YYYY-MM-DD'))

    // apply filters
    COLUMNS
      .filter(col => params[col])
      .forEach(col => {
        query = query.where(col, '==', params[col])
      })

    // order by date_band
    query = query.orderBy('date', 'asc')

    // apply limit
    query = query.limit(_.toSafeInteger(params.limit || '100'))

    const result = await query.get()

    return snapshotAsArray<DanceEvent>(result)
  }
}

type Image = {
  src: string;
  text: string;
}

export class Images {
  static async fetch(table: TableFn): Promise<Image[]> {
    const images = await table('images').get()
    return snapshotAsArray<Image>(images)
  }
}

export class Versions {
  static async fetch (table: TableFn, sorted?: boolean): Promise<Version[]> {
    const versions = await table('versions').get()
    const list = snapshotAsArray<Version>(versions)
    return sorted ? _.sortBy(list, versionSort) : list
  }

  static async update (table: TableFn): Promise<Version> {
    const version: Version = await fetchLatestVersion()

    const invalid = _.isEmpty(version.name) || _.isEmpty(version.lines)
    if (invalid) {
      console.log('No updated version, result was empty: ' + JSON.stringify(version, null, 2))
    }

    const key = _.snakeCase('v ' + version.name)

    console.log('Updating version' + key)
    const ref = table('versions').doc(key)

    const data = _.pickBy(version, (_k, v) => !_.isNull(v)) as object

    await ref.set(data, { merge: true })

    return version
  }
}

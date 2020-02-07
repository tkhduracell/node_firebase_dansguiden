// Libraries

import _ from 'lodash';
import moment, { ISO_8601 } from 'moment'
import admin, {firestore} from 'firebase-admin'

// Dependencies
import * as events from '../lib/events'
import { BandUpdater } from '../lib/bands'
import * as eventsDecorator from '../lib/events_decorator'

import { COLUMNS } from '../lib/events'
import { fetchLatestVersion, versionSort, Version } from '../lib/versions'
import { simpleKeyValue, getValues, Store } from '../lib/store'
import { snapshotAsArray } from '../lib/utils'
import { BatchFn, TableFn } from '../lib/database';
import { Artist, Counter, DanceEvent } from '../lib/types';
import { LogFn } from '../lib/log';
import { Secrets } from '../lib/secrets';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function batchDeleteOverlappingEvents(batch: BatchFn, table: TableFn, output: InternalDanceEvent[], log: LogFn): Promise<firestore.WriteResult[]> {
  const dates = output.filter(event => event.type === 'event')
    .map(e => e.data.date)

  log(`Starting batch delete between ${_.min(dates)} <-> ${_.max(dates)}`)
  const eventsResult = await table('events')
    .where('date', '>=', _.min(dates))
    .where('date', '<=', _.max(dates))
    .get()

  log(`Found ${eventsResult.size} overlapping events`)
  const events = snapshotAsArray<string>(eventsResult, e => e._id)

  const commits = _.chunk(events, 500).map((chunk, idx) => {
    const deleteBatch = batch()
    chunk.forEach(id => {
      log('Deleting event ' + id)
      const ref = table('events').doc(id)
      deleteBatch.delete(ref)
    })
    return deleteBatch.commit()
      .then(result => {
        log('Batch#' + idx + ' deletion done!')
        return result
      })
  })

  return _.flatten(await Promise.all(commits))
}

async function batchWriteFn<T, V>(batch: BatchFn, table: firestore.CollectionReference, log: LogFn,
  output: T[], kvFn: ObjectExtractor<T, V>): Promise<firestore.WriteResult[]> {

  const writes = _.chunk(output, 500).map(async (chunk, idx) => {
      log('Batch#' + idx + ' creating...')
      const batcher = batch()
      chunk.forEach(source => {
        const result = kvFn(source)
        if (result && _.isObject(result)) {
          const { key, value } = result as KV<V>
          const document = _.merge(value, {
            _id: key
          })
          log('Adding change to ' + key)
          const ref = table.doc(key)
          batcher.set(ref, document, { merge: true })
        }
      })

      const writeResult = await batcher.commit()
      log(`Batch# ${idx} write done!`)

      return writeResult
    })
  return _.flatten(await Promise.all(writes))
}

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function batchWriteEvents (batch: BatchFn, tableFn: TableFn, output: InternalDanceEvent[], log: LogFn): Promise<firestore.WriteResult[]>  {
  const table = tableFn('events')

  return batchWriteFn(batch, table, log, output, (source: InternalDanceEvent) => {
    if (source.type !== 'event') {
      log(`Ignoring non-event ${source.type} item...`)
      return false
    }

    if (!moment.utc(source.data.date, ISO_8601).isValid()) {
      log('Invalid date: ' + JSON.stringify(source))
      return false
    }

    const event = _.pick(source.data, COLUMNS) as DanceEvent
    const date = event.date
    const key = _([date, event.band]).map(_.snakeCase).join('_')
    const value = _.merge(event, {
      _id: key,
      date,
      // eslint-disable-next-line @typescript-eslint/camelcase
      updated_at: moment().toDate().getTime(),
      // eslint-disable-next-line @typescript-eslint/camelcase
      updated_at_pretty: moment().toISOString()
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

export class Bands {
  static async update(table: TableFn, log: LogFn, secrets: Secrets): Promise<(Artist|null)[]> {
    const bandsKeyValueStore = simpleKeyValue<Artist>(table, 'band_metadata', true)

    // Older events are broken
    function onlyNewEvents(tbl: admin.firestore.Query): admin.firestore.Query {
      return tbl.where('date', '>=', '2019-01-01')
    }

    log('Getting current bands in events')
    const allBands = await getValues<string, DanceEvent>(table, 'events', event => event.band, onlyNewEvents)
    const bands = _.uniq(allBands).sort() // debug: .slice(15, 20)

    log('Starting band update')
    const updates = await BandUpdater.run(bandsKeyValueStore, secrets.spotify, bands)

    log('Completed band metadata update!')
    log(`Wrote ${_.size(updates)} bands`)

    return updates
  }
}

export type InternalDanceEvent = events.InternalEvent<DanceEvent>

export type EventQueryParams = { from: string; to: string;[key: string]: string }

export class Events {

  static async update(
    batch: BatchFn, table: TableFn, log: LogFn
  ): Promise<InternalDanceEvent[]> {

    log('Parsing all events from external source')
    const allEvents = await events.parse(log)
    log(`Completed parsing, found ${_.size(allEvents)} events!`)

    log('Starting overlap removal')
    await batchDeleteOverlappingEvents(batch, table, allEvents, log)
    log('Completed overlap removal!')

    log('Starting event writes')
    const batchWrite = await batchWriteEvents(batch, table, allEvents, log)
    log(`Completed event writes, wrote ${_.size(batchWrite)} events!`)

    log('Starting event metadata updates')
    await eventsDecorator.update(batch, table, log)
    log('Completed event metadata update!')

    return allEvents
  }

  static async fetch(
    table: TableFn, params: EventQueryParams, log: LogFn
  ): Promise<DanceEvent[]> {
    log(`Fetch events using params: ${JSON.stringify(params)}`)
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

export type Counters = {
  [key: string]: number;
};

export type EntityCounters = {
  bands: Counters;
  places: Counters;
  dates: Counters;
};

export class Metadata {
  static async update(table: TableFn, log: LogFn): Promise<EntityCounters> {
    const today = moment.utc().format("YYYY-MM-DD")
    const future = (col: admin.firestore.CollectionReference): admin.firestore.Query => {
      return col.where('date', '>=', today)
        .where('date', '<', '2019-02-01')
    }

    log('Updating metadata table...')

    async function updater(fn: (e: DanceEvent) => string, db: Store<Counter>): Promise<Counters> {
      const values = getValues<string, DanceEvent>(table, 'events', fn, future)
      const counts = _.countBy(values) as Counters

      await Promise.all(Object.entries(counts).map(x => {
        const [_id, count] = x
        return db.set(_id, { _id, count})
      }))

      return counts
    }

    const [bands, places, dates] = await Promise.all([
      updater(e => e.band, simpleKeyValue<Counter>(table, 'metadata_bands', true)),
      updater(e => e.place, simpleKeyValue<Counter>(table, 'metadata_places', true)),
      updater(e => e.date, simpleKeyValue<Counter>(table, 'metadata_dates', true))
    ])

    return {bands, places, dates}
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

  static async update (table: TableFn, log: LogFn): Promise<Version> {
    const version: Version = await fetchLatestVersion(log)

    const invalid = _.isEmpty(version.name) || _.isEmpty(version.lines)
    if (invalid) {
      log('No updated version, result was empty: ' + JSON.stringify(version, null, 2))
    }

    const key = _.snakeCase('v ' + version.name)

    log('Updating version' + key)
    const ref = table('versions').doc(key)

    const data = _.pickBy(version, (_k, v) => !_.isNull(v)) as object

    await ref.set(data, { merge: true })

    return version
  }
}

// Libraries
import _ from 'lodash'
import moment from 'moment'

// Dependencies
import { firestore } from 'firebase-admin'
import { getValues } from './lib/utils/store'
import { BatchFn, TableFn } from './lib/utils/database'
import { DanceEvent } from './lib/types'
import { MetadataPlaces, PlacesSecerts } from './metadata_places'
import { MetadataBands, SpotifySecrets } from './metadata_bands'
import { MetadataDates } from './metadata_dates'

type MetadataTypes = 'dates' | 'places' | 'bands'
type Table = `metadata_${MetadataTypes}`

export class Metadata {

  static async places(table: TableFn, batch: BatchFn, secrets: { places: PlacesSecerts }, limit?: number) {
    const tbl = 'metadata_places'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    const keys = await table(tbl).listDocuments().then(docs => docs.map(d => d.id))

    return updater(table, batch, tbl, MetadataPlaces.build(events, secrets.places, keys))
  }

  static async bands(table: TableFn, batch: BatchFn, secrets: { spotify: SpotifySecrets }, limit?: number): Promise<MetadataBands> {
    const tbl = 'metadata_bands'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    return updater(table, batch, tbl, MetadataBands.build(events, secrets.spotify))
  }

  static async dates(table: TableFn, batch: BatchFn, limit?: number) {
    const tbl = 'metadata_dates'
    const events = await getevents(table, limit)
    console.log(`Updating ${tbl} using ${events.length} events`)

    return updater(table, batch, tbl, MetadataDates.build(events))
  }
}


async function updater<T, U extends Record<string, T>, Data extends Record<string, Promise<U>>>(table: TableFn, batch: BatchFn, tbl: Table, data: Data): Promise<Record<string, U>> {
  const out: Record<string, U> = {}
  console.info()
  console.info('Starting batch writes of', Object.keys(data))

  for (const [wrapperKey, valuePromise] of Object.entries(data)) {
    const values = await valuePromise
    const chunks = _.chunk(Object.entries(values), 250) // For serverTimestamp() causes 1 more write

    let idx = 0
    console.debug(`[${wrapperKey}]`, 'Prepared', chunks.length, 'batches', `(${_.size(values)} changes)`)

    for (const chunk of chunks) {
      console.debug(`[${wrapperKey}]`, `batch#${idx}`, 'Creating')
      const s = batch()
      for (const [key, value] of chunk) {
        s.set(table(tbl).doc(key), {
          [wrapperKey]: value,
          updated_at: firestore.FieldValue.serverTimestamp()
        }, { merge: true })
      }
      console.debug(`[${wrapperKey}]`, `batch#${idx}`, 'Commiting')
      await s.commit()
      idx += 1
    }

    console.debug(`[${wrapperKey}]`, 'All batches completed!')
    out[wrapperKey] = values
  }
  console.info('All updates completed!')

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
// Libraries

import _ from 'lodash'
import moment, { ISO_8601 } from 'moment'
import { firestore } from 'firebase-admin'

// Dependencies
import { COLUMNS, InternalDanceEvent } from '../danslogen/events'
import { BatchFn, TableFn } from './database'
import { DanceEvent } from '../types'
import { snapshotAsArray } from './utils'

type KV<T> = { key: string; value: T }
type ObjectExtractor<T, V> = (t: T) => KV<V> | boolean

export async function batchDeleteOverlappingEvents(batch: BatchFn, table: TableFn, output: InternalDanceEvent[]): Promise<firestore.WriteResult[]> {
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
                console.log('Adding change to', key, value)
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

export function batchWriteEvents(batch: BatchFn, tableFn: TableFn, output: InternalDanceEvent[]): Promise<firestore.WriteResult[]> {
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
        return { key, value }
    })
}